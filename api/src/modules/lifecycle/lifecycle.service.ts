// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle
// Purpose: The org lifecycle state machine + daily purge sweep
// (docs/PRICING_AND_ENTITLEMENTS.md § Data Lifecycle & Purge).
//
// The sweep is idempotent: every step either re-derives its candidates from
// state (so processed orgs drop out of the query) or checks an audit/settings
// latch before acting. Legal hold blocks purge unconditionally. Purge decisions
// are always written to PurgeAuditLog — deleting the wrong org is unrecoverable.

import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrgLifecycleState, PurgePhase } from '@prisma/client';

import {
  CANCELED_REMINDER_DAYS,
  CANCELED_RETENTION_DAYS,
  DAY_MS,
  DUNNING_AUTO_CANCEL_DAYS,
  HARD_DELETE_DELAY_DAYS,
  SWEEP_BATCH_SIZE,
  TRIAL_REMINDER_DAYS,
  TRIAL_RETENTION_DAYS,
} from './lifecycle-constants';
import { buildReminderEmail } from './lifecycle-emails';
import { LifecycleRepository, OrgWithSubscription } from './lifecycle.repository';

import { AppCacheService } from '@/modules/common/cache/app-cache.service';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { EmailService } from '@/modules/notifications/email.service';
import { InAppNotificationsService } from '@/modules/notifications/in-app-notifications.service';

const CONTEXT = 'LifecycleService';
const READ_ONLY_CACHE_PREFIX = 'lifecycle:readonly:';
const READ_ONLY_CACHE_TTL_SECONDS = 60;

export interface SweepResult {
  trialsExpired: number;
  cancellationsProcessed: number;
  dunningCanceled: number;
  remindersSent: number;
  purgedPhase1: number;
  purgedPhase2: number;
  legalHoldSkips: number;
}

@Injectable()
export class LifecycleService {
  constructor(
    private readonly repository: LifecycleRepository,
    private readonly cache: AppCacheService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly entitlements: EntitlementsService,
    private readonly storage: BlobStorageService,
    private readonly logger: SecureLoggerService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  // --- Read-only lookup (used by ReadOnlyGuard) ---

  async isReadOnly(organizationId: string): Promise<boolean> {
    const cacheKey = `${READ_ONLY_CACHE_PREFIX}${organizationId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    const state = await this.repository.findOrgState(organizationId);
    const readOnly = state !== null && state !== OrgLifecycleState.ACTIVE;
    await this.cache.set(cacheKey, readOnly, READ_ONLY_CACHE_TTL_SECONDS);
    return readOnly;
  }

  // --- Restore (resubscribe / support) ---

  async restore(organizationId: string, triggeredBy: string): Promise<void> {
    await this.repository.restoreOrg(organizationId);
    await this.repository.writeAudit(organizationId, PurgePhase.RESTORED, {}, triggeredBy);
    await this.cache.del(`${READ_ONLY_CACHE_PREFIX}${organizationId}`);
    await this.entitlements.invalidate(organizationId);
    this.logger.log(`Org ${organizationId} restored to ACTIVE by ${triggeredBy}`, CONTEXT);
  }

  /** Restore only when the org is not ACTIVE — used by billing webhooks on resubscribe. */
  async restoreIfReadOnly(organizationId: string, triggeredBy: string): Promise<boolean> {
    const state = await this.repository.findOrgState(organizationId);
    if (state === null || state === OrgLifecycleState.ACTIVE) {
      return false;
    }
    await this.restore(organizationId, triggeredBy);
    return true;
  }

  /** GDPR/CCPA-style verified deletion request — sweep processes it next run. */
  async requestPurge(organizationId: string): Promise<void> {
    await this.repository.markPurgeRequested(organizationId, new Date());
    this.logger.warn(`Org ${organizationId} requested deletion — purge on next sweep`, CONTEXT);
  }

  // --- The daily sweep ---

  async runDailySweep(now = new Date()): Promise<SweepResult> {
    const result: SweepResult = {
      trialsExpired: 0,
      cancellationsProcessed: 0,
      dunningCanceled: 0,
      remindersSent: 0,
      purgedPhase1: 0,
      purgedPhase2: 0,
      legalHoldSkips: 0,
    };

    result.trialsExpired = await this.expireTrials(now);
    result.dunningCanceled = await this.cancelExhaustedDunning(now);
    result.cancellationsProcessed = await this.processEndedCancellations(now);
    result.remindersSent = await this.sendReminders(now);

    const purge = await this.runPurgePhases(now);
    result.purgedPhase1 = purge.phase1;
    result.purgedPhase2 = purge.phase2;
    result.legalHoldSkips = purge.legalHoldSkips;

    this.logger.log(`Lifecycle sweep complete: ${JSON.stringify(result)}`, CONTEXT);
    return result;
  }

  // --- Transitions into read-only ---

  private async expireTrials(now: Date): Promise<number> {
    const orgs = await this.repository.findExpiredTrials(now, SWEEP_BATCH_SIZE);
    for (const org of orgs) {
      await this.enterReadOnly(org, OrgLifecycleState.EXPIRED_TRIAL, TRIAL_RETENTION_DAYS, now);
    }
    return orgs.length;
  }

  private async processEndedCancellations(now: Date): Promise<number> {
    const orgs = await this.repository.findEndedCanceledSubscriptions(now, SWEEP_BATCH_SIZE);
    for (const org of orgs) {
      await this.enterReadOnly(org, OrgLifecycleState.CANCELED, CANCELED_RETENTION_DAYS, now);
    }
    return orgs.length;
  }

  private async cancelExhaustedDunning(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - DUNNING_AUTO_CANCEL_DAYS * DAY_MS);
    const orgs = await this.repository.findDunningExhausted(cutoff, SWEEP_BATCH_SIZE);
    for (const org of orgs) {
      if (org.subscription) {
        await this.repository.cancelSubscription(org.subscription.id);
      }
      // Same sweep run picks it up as an ended cancellation next step.
      this.logger.warn(`Org ${org.id} auto-canceled after unresolved PAST_DUE`, CONTEXT);
    }
    return orgs.length;
  }

  private async enterReadOnly(
    org: OrgWithSubscription,
    state: OrgLifecycleState,
    retentionDays: number,
    now: Date,
  ): Promise<void> {
    const purgeScheduledAt = new Date(now.getTime() + retentionDays * DAY_MS);
    await this.repository.transitionToReadOnly(org.id, state, now, purgeScheduledAt);
    await this.cache.del(`${READ_ONLY_CACHE_PREFIX}${org.id}`);
    await this.entitlements.invalidate(org.id);
    await this.sendReminderIfDue(
      { ...org, lifecycleState: state, readOnlyAt: now, purgeScheduledAt },
      0,
    );
    this.logger.log(`Org ${org.id} → ${state} (purge ${purgeScheduledAt.toISOString()})`, CONTEXT);
  }

  // --- Reminder emails (T+offsets after readOnlyAt, latched in org settings) ---

  private async sendReminders(now: Date): Promise<number> {
    const orgs = await this.repository.findReadOnlyOrgs(SWEEP_BATCH_SIZE);
    let sent = 0;
    for (const org of orgs) {
      if (!org.readOnlyAt) {
        continue;
      }
      const dayOffset = Math.floor((now.getTime() - org.readOnlyAt.getTime()) / DAY_MS);
      const schedule =
        org.lifecycleState === OrgLifecycleState.EXPIRED_TRIAL
          ? TRIAL_REMINDER_DAYS
          : CANCELED_REMINDER_DAYS;
      // Latest due offset — a sweep that missed a day still sends one reminder.
      const due = [...schedule].reverse().find((offset) => offset <= dayOffset);
      if (due === undefined) {
        continue;
      }
      if (await this.sendReminderIfDue(org, due)) {
        sent += 1;
      }
    }
    return sent;
  }

  private async sendReminderIfDue(org: OrgWithSubscription, dayOffset: number): Promise<boolean> {
    const settings = (org.settings ?? {}) as { lifecycleRemindersSent?: string[] };
    const sentKeys = settings.lifecycleRemindersSent ?? [];
    const key = `${org.lifecycleState}:${dayOffset}`;
    if (sentKeys.includes(key) || !org.purgeScheduledAt) {
      return false;
    }

    const owner = await this.repository.findOwner(org.id);
    if (!owner) {
      return false;
    }

    const { subject, html } = buildReminderEmail({
      orgName: org.name,
      path: org.lifecycleState === OrgLifecycleState.EXPIRED_TRIAL ? 'trial' : 'canceled',
      purgeDate: org.purgeScheduledAt,
      appUrl: this.config.get<string>('APP_URL', 'http://localhost:3100'),
      dayOffset,
    });
    await this.emailService.send({ to: owner.email, subject, html });
    await this.inAppNotifications.emit({
      organizationId: org.id,
      type: 'trial_reminder',
      title: subject,
      body: `Your workspace is read-only. Data will be deleted on ${org.purgeScheduledAt.toLocaleDateString()} unless you subscribe.`,
      link: '/billing',
    });
    await this.repository.updateSettings(org.id, {
      ...settings,
      lifecycleRemindersSent: [...sentKeys, key],
    });
    this.logger.log(`Reminder ${key} sent for org ${org.id}`, CONTEXT);
    return true;
  }

  // --- Purge phases ---

  private async runPurgePhases(
    now: Date,
  ): Promise<{ phase1: number; phase2: number; legalHoldSkips: number }> {
    let phase1 = 0;
    let phase2 = 0;
    let legalHoldSkips = 0;

    for (const org of await this.repository.findPurgeDue(now, SWEEP_BATCH_SIZE)) {
      if (org.legalHoldAt) {
        await this.repository.writeAudit(org.id, PurgePhase.LEGAL_HOLD_SKIP, {}, 'lifecycle-sweep');
        legalHoldSkips += 1;
        continue;
      }
      await this.purgePhase1(org.id, org, now);
      phase1 += 1;
    }

    for (const org of await this.repository.findHardDeleteDue(now, SWEEP_BATCH_SIZE)) {
      if (org.legalHoldAt) {
        await this.repository.writeAudit(org.id, PurgePhase.LEGAL_HOLD_SKIP, {}, 'lifecycle-sweep');
        legalHoldSkips += 1;
        continue;
      }
      await this.purgePhase2(org.id);
      phase2 += 1;
    }

    return { phase1, phase2, legalHoldSkips };
  }

  /** Phase 1: blobs first (the expensive part), soft-delete rows, tombstone. */
  private async purgePhase1(
    organizationId: string,
    org: { name: string; purgeRequestedAt: Date | null; lifecycleState: OrgLifecycleState },
    now: Date,
  ): Promise<void> {
    const owner = await this.repository.findOwner(organizationId);
    const counts = await this.repository.countOrgEntities(organizationId);
    const subscription = await this.entitlements.getPlanSnapshot(organizationId);

    await this.repository.upsertTombstone({
      organizationId,
      orgName: org.name,
      ownerEmailHash: owner
        ? createHash('sha256').update(owner.email.toLowerCase()).digest('hex')
        : 'unknown',
      planAtExit: subscription.planId,
      lifecyclePath: org.lifecycleState === OrgLifecycleState.EXPIRED_TRIAL ? 'trial' : 'canceled',
      entityCounts: counts,
      purgedAt: now,
    });

    // Blobs first — deletePrefix is idempotent, so a re-run after a partial
    // failure converges.
    await this.storage.deletePrefix(`document-templates/${organizationId}`);
    await this.storage.deletePrefix(`document-fills/${organizationId}`);
    await this.storage.deletePrefix(`workflow-artifacts/${organizationId}`);

    const hardDeleteAt = new Date(now.getTime() + HARD_DELETE_DELAY_DAYS * DAY_MS);
    await this.repository.softDeleteOrgData(organizationId, now, hardDeleteAt);
    await this.repository.writeAudit(
      organizationId,
      PurgePhase.BLOBS_DELETED,
      counts,
      org.purgeRequestedAt ? 'user-request' : 'lifecycle-sweep',
    );
    await this.cache.del(`${READ_ONLY_CACHE_PREFIX}${organizationId}`);
    this.logger.warn(`Org ${organizationId} purge phase 1 complete (blobs + soft delete)`, CONTEXT);
  }

  /** Phase 2: hard DB delete. Only the tombstone, audit log, and fingerprints remain. */
  private async purgePhase2(organizationId: string): Promise<void> {
    const counts = await this.repository.countOrgEntities(organizationId);
    await this.repository.hardDeleteOrg(organizationId);
    await this.repository.writeAudit(
      organizationId,
      PurgePhase.HARD_DELETED,
      counts,
      'lifecycle-sweep',
    );
    this.logger.warn(`Org ${organizationId} purge phase 2 complete (hard delete)`, CONTEXT);
  }
}
