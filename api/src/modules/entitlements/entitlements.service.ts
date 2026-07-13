// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements
// Purpose: THE paywall. Every gate and meter decision in the app flows through
// this service — plan limits come exclusively from PLAN_ENTITLEMENTS (shared-types)
// plus per-org EntitlementOverride rows. Stripe is never consulted here: the
// local Subscription row is the entitlement authority.
//
// Boolean gates:  checkFeature() / requireFeature() — used by @RequireEntitlement().
// Metered limits: assertMeterAvailable() BEFORE the action, consume() after.
// Over-limit intake (public form submissions) skips the assert and consumes
// anyway — data is never dropped; the caller quarantines it as OVER_LIMIT.

import {
  CountedResource,
  Meter as MeterEnum,
  PLAN_ENTITLEMENTS,
  PlanDefinition,
  PlanFeatures,
  PlanId,
  PlanLimits,
  SOFT_LIMIT_RATIO,
  UsageSummary,
  limitForMeter,
} from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meter, UsageCounter } from '@prisma/client';

import { EntitlementExceededException } from './entitlement-exceeded.exception';
import { EntitlementsRepository } from './entitlements.repository';
import { NON_PERIODIC_END, NON_PERIODIC_START, currentUsagePeriod } from './period';

import { AppCacheService } from '@/modules/common/cache/app-cache.service';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

const PLAN_CACHE_TTL_SECONDS = 60;
const USAGE_CACHE_TTL_SECONDS = 30;

export interface PlanSnapshot {
  readonly planId: PlanId;
  readonly definition: PlanDefinition;
  readonly billingAnchorDay: number;
}

export interface MeterState {
  readonly meter: Meter;
  readonly used: number;
  readonly limit: number;
  readonly periodStart: Date | null;
  readonly periodEnd: Date | null;
}

interface CachedPlan {
  planId: PlanId;
  billingAnchorDay: number;
  limitOverrides: Partial<Record<keyof PlanLimits, number>>;
  featureOverrides: Partial<PlanFeatures>;
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly repository: EntitlementsRepository,
    private readonly cache: AppCacheService,
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {}

  // --- Plan resolution ---

  async getPlanSnapshot(organizationId: string): Promise<PlanSnapshot> {
    const cacheKey = `entitlements:plan:${organizationId}`;
    let cached = await this.cache.get<CachedPlan>(cacheKey);

    if (!cached) {
      const now = new Date();
      const [subscription, overrides] = await Promise.all([
        this.repository.findSubscription(organizationId),
        this.repository.findActiveOverrides(organizationId, now),
      ]);

      // No subscription row should never happen (signup creates one), but if it
      // does, the org gets trial limits — the most restrictive tier.
      const planId = (subscription?.planId ?? 'trial') as PlanId;

      const limitOverrides: Partial<Record<keyof PlanLimits, number>> = {};
      const featureOverrides: Partial<PlanFeatures> = {};
      for (const override of overrides) {
        const value = override.value;
        if (typeof value === 'number') {
          limitOverrides[override.entitlement as keyof PlanLimits] = value;
        } else if (typeof value === 'boolean' || typeof value === 'string') {
          // Reason: EntitlementOverride.value is a Json column holding heterogeneous
          // feature values; the entitlement key determines the concrete field type.
          (featureOverrides as Record<string, unknown>)[override.entitlement] = value;
        }
      }

      cached = {
        planId,
        billingAnchorDay: subscription?.billingAnchorDay ?? 1,
        limitOverrides,
        featureOverrides,
      };
      await this.cache.set(cacheKey, cached, PLAN_CACHE_TTL_SECONDS);
    }

    const base = PLAN_ENTITLEMENTS[cached.planId] ?? PLAN_ENTITLEMENTS.trial;
    const definition: PlanDefinition = {
      ...base,
      limits: { ...base.limits, ...cached.limitOverrides },
      features: { ...base.features, ...cached.featureOverrides },
    };

    return { planId: cached.planId, definition, billingAnchorDay: cached.billingAnchorDay };
  }

  /** Drop cached plan + usage for an org — called after webhook/subscription changes. */
  async invalidate(organizationId: string): Promise<void> {
    await this.cache.delByPattern(`entitlements:*:${organizationId}*`);
  }

  // --- Boolean feature gates ---

  async checkFeature<K extends keyof PlanFeatures>(
    organizationId: string,
    feature: K,
  ): Promise<PlanFeatures[K]> {
    const snapshot = await this.getPlanSnapshot(organizationId);
    return snapshot.definition.features[feature];
  }

  /** Throws the 402-style denial when a boolean gate is off for the org's plan. */
  async requireFeature(organizationId: string, feature: keyof PlanFeatures): Promise<void> {
    const value = await this.checkFeature(organizationId, feature);
    if (value === false || value === 'none') {
      throw new EntitlementExceededException({
        entitlement: feature,
        limit: 0,
        current: 0,
        resetsAt: null,
        upgradeUrl: this.upgradeUrl(),
      });
    }
  }

  // --- Metered limits ---

  async getMeterState(organizationId: string, meter: Meter): Promise<MeterState> {
    const snapshot = await this.getPlanSnapshot(organizationId);
    const { periodStart, periodEnd } = this.periodFor(meter, snapshot.billingAnchorDay);

    const cacheKey = this.usageCacheKey(organizationId, meter, periodStart);
    let used = await this.cache.get<number>(cacheKey);
    if (used === null) {
      const counter = await this.repository.findCounter(organizationId, meter, periodStart);
      used = counter ? Number(counter.used) : 0;
      await this.cache.set(cacheKey, used, USAGE_CACHE_TTL_SECONDS);
    }

    return {
      meter,
      used,
      limit: limitForMeter(snapshot.definition, meter as MeterEnum),
      periodStart: this.isPeriodic(meter) ? periodStart : null,
      periodEnd: this.isPeriodic(meter) ? periodEnd : null,
    };
  }

  /**
   * Hard-limit check BEFORE a metered action executes. Throws LIMIT_EXCEEDED
   * when used + amount would exceed the plan limit.
   */
  async assertMeterAvailable(organizationId: string, meter: Meter, amount = 1): Promise<void> {
    const state = await this.getMeterState(organizationId, meter);
    if (state.used + amount > state.limit) {
      throw new EntitlementExceededException({
        entitlement: meter,
        limit: state.limit,
        current: state.used,
        resetsAt: state.periodEnd?.toISOString() ?? null,
        upgradeUrl: this.upgradeUrl(),
      });
    }
  }

  /**
   * Records consumption: idempotent UsageEvent ledger row + atomic counter
   * increment. Never blocks — quarantine decisions happen in the caller.
   * Returns the post-consumption meter state.
   */
  async consume(
    organizationId: string,
    meter: Meter,
    options: {
      idempotencyKey: string;
      amount?: number;
      refType?: string;
      refId?: string;
    },
  ): Promise<MeterState> {
    const amount = options.amount ?? 1;
    const snapshot = await this.getPlanSnapshot(organizationId);
    const { periodStart, periodEnd } = this.periodFor(meter, snapshot.billingAnchorDay);

    const result = await this.repository.writeConsumption({
      organizationId,
      meter,
      quantity: amount,
      idempotencyKey: options.idempotencyKey,
      periodStart,
      periodEnd,
      refType: options.refType,
      refId: options.refId,
    });

    const used = Number(result.counter.used);
    const limit = limitForMeter(snapshot.definition, meter as MeterEnum);
    await this.cache.set(
      this.usageCacheKey(organizationId, meter, periodStart),
      used,
      USAGE_CACHE_TTL_SECONDS,
    );

    if (result.applied) {
      await this.maybeSoftWarn(organizationId, result.counter, used, limit);
    }

    return {
      meter,
      used,
      limit,
      periodStart: this.isPeriodic(meter) ? periodStart : null,
      periodEnd: this.isPeriodic(meter) ? periodEnd : null,
    };
  }

  // --- Counted resources (live row counts, not UsageCounter) ---

  async getCountedResource(
    organizationId: string,
    resource: CountedResource,
  ): Promise<{ used: number; limit: number }> {
    const snapshot = await this.getPlanSnapshot(organizationId);
    switch (resource) {
      case 'users':
        return {
          used: await this.repository.countActiveUsers(organizationId),
          limit: snapshot.definition.limits.maxUsers,
        };
      // Forms land in S3, SmartMapper templates in S5 — until those tables
      // exist the counts are structurally zero.
      case 'activeForms':
        return { used: 0, limit: snapshot.definition.limits.activeForms };
      case 'uploadedTemplates':
        return { used: 0, limit: snapshot.definition.limits.uploadedTemplates };
      default: {
        const exhaustive: never = resource;
        throw new Error(`Unhandled counted resource: ${String(exhaustive)}`);
      }
    }
  }

  /** Throws LIMIT_EXCEEDED when adding `amount` would exceed the counted cap. */
  async assertCountedAvailable(
    organizationId: string,
    resource: CountedResource,
    amount = 1,
  ): Promise<void> {
    const { used, limit } = await this.getCountedResource(organizationId, resource);
    if (used + amount > limit) {
      throw new EntitlementExceededException({
        entitlement: resource,
        limit,
        current: used,
        resetsAt: null,
        upgradeUrl: this.upgradeUrl(),
      });
    }
  }

  // --- Usage summary (GET /billing/usage) ---

  async getUsageSummary(organizationId: string): Promise<UsageSummary> {
    const snapshot = await this.getPlanSnapshot(organizationId);
    const meters = Object.values(Meter);

    const meterStates = await Promise.all(
      meters.map((meter) => this.getMeterState(organizationId, meter)),
    );

    const [activeForms, uploadedTemplates, users] = await Promise.all([
      this.getCountedResource(organizationId, 'activeForms'),
      this.getCountedResource(organizationId, 'uploadedTemplates'),
      this.getCountedResource(organizationId, 'users'),
    ]);

    return {
      planId: snapshot.planId,
      meters: meterStates.map((state) => ({
        meter: state.meter as MeterEnum,
        used: state.used,
        limit: state.limit,
        ratio: state.limit > 0 ? state.used / state.limit : 0,
        periodStart: state.periodStart?.toISOString() ?? null,
        periodEnd: state.periodEnd?.toISOString() ?? null,
      })),
      counted: { activeForms, uploadedTemplates, users },
    };
  }

  // --- Internals ---

  private periodFor(meter: Meter, anchorDay: number): { periodStart: Date; periodEnd: Date } {
    if (!this.isPeriodic(meter)) {
      return { periodStart: NON_PERIODIC_START, periodEnd: NON_PERIODIC_END };
    }
    const period = currentUsagePeriod(anchorDay);
    return { periodStart: period.start, periodEnd: period.end };
  }

  private isPeriodic(meter: Meter): boolean {
    return meter !== Meter.STORAGE_BYTES;
  }

  private usageCacheKey(organizationId: string, meter: Meter, periodStart: Date): string {
    return `entitlements:usage:${organizationId}:${meter}:${periodStart.toISOString()}`;
  }

  private upgradeUrl(): string {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return `${appUrl}/billing`;
  }

  /**
   * Soft-limit latch: fires once per period when usage crosses 80%. S1 logs the
   * signal (the banner comes from the usage summary ratio); the email lands in S2.
   */
  private async maybeSoftWarn(
    organizationId: string,
    counter: UsageCounter,
    used: number,
    limit: number,
  ): Promise<void> {
    if (limit <= 0 || counter.softWarnedAt !== null) {
      return;
    }
    if (used / limit < SOFT_LIMIT_RATIO) {
      return;
    }
    await this.repository.markSoftWarned(counter.id, new Date());
    this.logger.warn(
      `Org ${organizationId} crossed ${Math.round(SOFT_LIMIT_RATIO * 100)}% of ${counter.meter} (${used}/${limit})`,
      'EntitlementsService',
    );
  }
}
