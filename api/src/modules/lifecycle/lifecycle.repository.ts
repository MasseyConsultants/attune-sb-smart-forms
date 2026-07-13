// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle
// Purpose: The ONLY Prisma access for the org lifecycle state machine and the
// purge sweep. Hard-delete cascade order is explicit and documented below —
// purging the wrong thing is unrecoverable.

import { Injectable } from '@nestjs/common';
import {
  Organization,
  OrgLifecycleState,
  Prisma,
  PurgePhase,
  Subscription,
  SubscriptionStatus,
  User,
} from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export type OrgWithSubscription = Organization & { subscription: Subscription | null };

@Injectable()
export class LifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Sweep candidate queries ---

  findExpiredTrials(now: Date, limit: number): Promise<OrgWithSubscription[]> {
    return this.prisma.organization.findMany({
      where: {
        lifecycleState: OrgLifecycleState.ACTIVE,
        deletedAt: null,
        subscription: { status: SubscriptionStatus.TRIALING, trialEndsAt: { lt: now } },
      },
      include: { subscription: true },
      take: limit,
    });
  }

  findEndedCanceledSubscriptions(now: Date, limit: number): Promise<OrgWithSubscription[]> {
    return this.prisma.organization.findMany({
      where: {
        lifecycleState: OrgLifecycleState.ACTIVE,
        deletedAt: null,
        subscription: {
          status: SubscriptionStatus.CANCELED,
          OR: [{ currentPeriodEnd: { lt: now } }, { currentPeriodEnd: null }],
        },
      },
      include: { subscription: true },
      take: limit,
    });
  }

  findDunningExhausted(cutoff: Date, limit: number): Promise<OrgWithSubscription[]> {
    return this.prisma.organization.findMany({
      where: {
        lifecycleState: OrgLifecycleState.ACTIVE,
        deletedAt: null,
        subscription: { status: SubscriptionStatus.PAST_DUE, pastDueSince: { lt: cutoff } },
      },
      include: { subscription: true },
      take: limit,
    });
  }

  /** Read-only orgs still inside their retention window (reminder candidates). */
  findReadOnlyOrgs(limit: number): Promise<OrgWithSubscription[]> {
    return this.prisma.organization.findMany({
      where: {
        lifecycleState: { in: [OrgLifecycleState.EXPIRED_TRIAL, OrgLifecycleState.CANCELED] },
        deletedAt: null,
        readOnlyAt: { not: null },
      },
      include: { subscription: true },
      take: limit,
    });
  }

  /** Orgs whose retention window elapsed (or purge was requested) — phase 1 due. */
  findPurgeDue(now: Date, limit: number): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: {
        lifecycleState: { in: [OrgLifecycleState.EXPIRED_TRIAL, OrgLifecycleState.CANCELED] },
        OR: [{ purgeScheduledAt: { lte: now } }, { purgeRequestedAt: { not: null } }],
      },
      take: limit,
    });
  }

  /** PURGE_PENDING orgs whose 7-day safety net elapsed — phase 2 due. */
  findHardDeleteDue(now: Date, limit: number): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: {
        lifecycleState: OrgLifecycleState.PURGE_PENDING,
        purgeScheduledAt: { lte: now },
      },
      take: limit,
    });
  }

  findOrgState(organizationId: string): Promise<OrgLifecycleState | null> {
    return this.prisma.organization
      .findUnique({ where: { id: organizationId }, select: { lifecycleState: true } })
      .then((org) => org?.lifecycleState ?? null);
  }

  // --- State transitions ---

  transitionToReadOnly(
    organizationId: string,
    state: OrgLifecycleState,
    readOnlyAt: Date,
    purgeScheduledAt: Date,
  ): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { lifecycleState: state, readOnlyAt, purgeScheduledAt },
    });
  }

  cancelSubscription(subscriptionId: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.CANCELED },
    });
  }

  /** Restores full access: clears lifecycle flags and un-soft-deletes org rows. */
  restoreOrg(organizationId: string): Promise<[Organization, Prisma.BatchPayload]> {
    return this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          lifecycleState: OrgLifecycleState.ACTIVE,
          readOnlyAt: null,
          purgeScheduledAt: null,
          purgeRequestedAt: null,
          deletedAt: null,
        },
      }),
      this.prisma.user.updateMany({
        where: { organizationId, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
    ]);
  }

  updateSettings(organizationId: string, settings: Prisma.InputJsonValue): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings },
    });
  }

  markPurgeRequested(organizationId: string, at: Date): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { purgeRequestedAt: at },
    });
  }

  // --- Purge phase 1: soft delete + tombstone ---

  findOwner(organizationId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { organizationId, role: 'OWNER' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countOrgEntities(organizationId: string): Promise<Record<string, number>> {
    const [users, forms, submissions, documentTemplates, workflows, workflowRuns] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { organizationId } }),
        this.prisma.form.count({ where: { organizationId } }),
        this.prisma.submission.count({ where: { organizationId } }),
        this.prisma.documentTemplate.count({ where: { organizationId } }),
        this.prisma.workflow.count({ where: { organizationId } }),
        this.prisma.workflowRun.count({ where: { organizationId } }),
      ]);
    return { users, forms, submissions, documentTemplates, workflows, workflowRuns };
  }

  softDeleteOrgData(organizationId: string, now: Date, hardDeleteAt: Date): Promise<unknown> {
    return this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      // Unpublish so /f/[slug] 404s immediately, then soft-delete.
      this.prisma.form.updateMany({
        where: { organizationId, deletedAt: null },
        data: { deletedAt: now, status: 'ARCHIVED' },
      }),
      this.prisma.submission.updateMany({
        where: { organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.documentTemplate.updateMany({
        where: { organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      // Unpublish so submission triggers stop firing, then soft-delete.
      this.prisma.workflow.updateMany({
        where: { organizationId, deletedAt: null },
        data: { deletedAt: now, status: 'ARCHIVED' },
      }),
      this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          lifecycleState: OrgLifecycleState.PURGE_PENDING,
          deletedAt: now,
          // Repurposed as the phase-2 due date once PURGE_PENDING.
          purgeScheduledAt: hardDeleteAt,
        },
      }),
    ]);
  }

  upsertTombstone(params: {
    organizationId: string;
    orgName: string;
    ownerEmailHash: string;
    planAtExit: string;
    lifecyclePath: string;
    entityCounts: Record<string, number>;
    purgedAt: Date;
  }): Promise<unknown> {
    return this.prisma.orgTombstone.upsert({
      where: { organizationId: params.organizationId },
      create: { ...params, entityCounts: params.entityCounts },
      update: { purgedAt: params.purgedAt, entityCounts: params.entityCounts },
    });
  }

  writeAudit(
    organizationId: string,
    phase: PurgePhase,
    entityCounts: Record<string, number>,
    triggeredBy: string,
  ): Promise<unknown> {
    return this.prisma.purgeAuditLog.create({
      data: { organizationId, phase, entityCounts, triggeredBy },
    });
  }

  hasAuditEntry(organizationId: string, phase: PurgePhase): Promise<boolean> {
    return this.prisma.purgeAuditLog
      .findFirst({ where: { organizationId, phase }, select: { id: true } })
      .then((row) => row !== null);
  }

  // --- Purge phase 2: hard delete ---

  /**
   * Cascade order (children before parents; FK-safe):
   * refresh/reset tokens → invite tokens → usage events/counters → overrides →
   * users → subscription → organization. Tombstone, PurgeAuditLog and
   * TrialFingerprint intentionally survive (no FK to Organization).
   */
  hardDeleteOrg(organizationId: string): Promise<unknown> {
    return this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { user: { organizationId } } }),
      this.prisma.passwordResetToken.deleteMany({ where: { user: { organizationId } } }),
      this.prisma.inviteToken.deleteMany({ where: { orgId: organizationId } }),
      this.prisma.usageEvent.deleteMany({ where: { organizationId } }),
      this.prisma.usageCounter.deleteMany({ where: { organizationId } }),
      this.prisma.entitlementOverride.deleteMany({ where: { organizationId } }),
      // FK order: children before forms, forms before organization.
      // WorkflowRunStep/WorkflowVersion cascade from their parents.
      this.prisma.workflowRun.deleteMany({ where: { organizationId } }),
      this.prisma.workflow.deleteMany({ where: { organizationId } }),
      this.prisma.submission.deleteMany({ where: { organizationId } }),
      this.prisma.documentTemplate.deleteMany({ where: { organizationId } }),
      this.prisma.form.deleteMany({ where: { organizationId } }),
      this.prisma.user.deleteMany({ where: { organizationId } }),
      this.prisma.subscription.deleteMany({ where: { organizationId } }),
      this.prisma.organization.delete({ where: { id: organizationId } }),
    ]);
  }
}
