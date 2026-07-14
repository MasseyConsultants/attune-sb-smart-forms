// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements / Tests
// The paywall gets exhaustive coverage: every plan × every meter × soft/hard
// boundary, override precedence, idempotent replays, and the soft-warn latch.
// Billing bugs are trust-killers — this matrix is the regression net.

import type { PlanId } from '@attune-sb/shared-types';
import {
  PLAN_ENTITLEMENTS,
  PLAN_IDS,
  PERIODIC_METERS,
  SOFT_LIMIT_RATIO,
  limitForMeter,
  Meter as MeterEnum,
} from '@attune-sb/shared-types';
import type { UsageCounter } from '@prisma/client';
import { Meter } from '@prisma/client';

import { EntitlementExceededException } from './entitlement-exceeded.exception';
import { EntitlementsService } from './entitlements.service';

// --- Mocks ---

const repository = {
  findSubscription: jest.fn(),
  findActiveOverrides: jest.fn(),
  findCounter: jest.fn(),
  writeConsumption: jest.fn(),
  markSoftWarned: jest.fn(),
  countActiveUsers: jest.fn(),
  countPublishedForms: jest.fn().mockResolvedValue(0),
  countUploadedTemplates: jest.fn().mockResolvedValue(0),
  sumStorageBytes: jest.fn().mockResolvedValue(0),
  findOwnerEmail: jest.fn().mockResolvedValue({ email: 'owner@example.com' }),
};

const cache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
};

const config = {
  get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const emailService = { send: jest.fn().mockResolvedValue(undefined) };

const inAppNotifications = { emit: jest.fn().mockResolvedValue(undefined) };

const ORG = 'org-1';

function makeService(): EntitlementsService {
  // Reason: constructor injection with hand-rolled mocks; the structural shape
  // is what matters, not the concrete Nest provider classes.
  return new EntitlementsService(
    repository as any,
    cache as any,
    config as any,
    logger as any,
    emailService as any,
    inAppNotifications as any,
  );
}

function mockPlan(planId: PlanId, anchorDay = 1): void {
  repository.findSubscription.mockResolvedValue({
    planId,
    billingAnchorDay: anchorDay,
    status: planId === 'trial' ? 'TRIALING' : 'ACTIVE',
  });
  repository.findActiveOverrides.mockResolvedValue([]);
}

function mockUsed(used: number): void {
  repository.findCounter.mockResolvedValue(
    used === 0 ? null : ({ used: BigInt(used) } as Partial<UsageCounter>),
  );
}

function counterRow(used: number, softWarnedAt: Date | null = null): UsageCounter {
  return {
    id: 'counter-1',
    organizationId: ORG,
    meter: Meter.SUBMISSIONS,
    periodStart: new Date(),
    periodEnd: new Date(),
    used: BigInt(used),
    softWarnedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  cache.get.mockResolvedValue(null); // default: cache miss → DB path
});

// --- Plan × meter × boundary matrix ---

describe('EntitlementsService hard limits — every plan × every periodic meter', () => {
  const service = makeService();

  for (const planId of PLAN_IDS) {
    const definition = PLAN_ENTITLEMENTS[planId];

    for (const meter of PERIODIC_METERS) {
      const limit = limitForMeter(definition, meter);

      it(`${planId}/${meter}: allows consumption below the limit (${limit})`, async () => {
        mockPlan(planId);
        mockUsed(limit - 1);
        await expect(
          service.assertMeterAvailable(ORG, meter as unknown as Meter),
        ).resolves.toBeUndefined();
      });

      it(`${planId}/${meter}: blocks consumption at the limit (${limit})`, async () => {
        mockPlan(planId);
        mockUsed(limit);
        await expect(service.assertMeterAvailable(ORG, meter as unknown as Meter)).rejects.toThrow(
          EntitlementExceededException,
        );
      });
    }
  }

  it('denial carries limit, current, resetsAt and upgradeUrl (402)', async () => {
    mockPlan('trial');
    mockUsed(50);
    try {
      await service.assertMeterAvailable(ORG, Meter.SUBMISSIONS);
      fail('expected EntitlementExceededException');
    } catch (err) {
      const exception = err as EntitlementExceededException;
      expect(exception.getStatus()).toBe(402);
      const body = exception.getResponse() as {
        error: string;
        details: { limit: number; current: number; resetsAt: string; upgradeUrl: string };
      };
      expect(body.error).toBe('LIMIT_EXCEEDED');
      expect(body.details.limit).toBe(50);
      expect(body.details.current).toBe(50);
      expect(body.details.resetsAt).toBeTruthy();
      expect(body.details.upgradeUrl).toBe('http://localhost:3100/billing');
    }
  });

  it('a bulk amount that would cross the limit is blocked even when under it now', async () => {
    mockPlan('trial'); // 50 submissions
    mockUsed(45);
    await expect(service.assertMeterAvailable(ORG, Meter.SUBMISSIONS, 6)).rejects.toThrow(
      EntitlementExceededException,
    );
    await expect(service.assertMeterAvailable(ORG, Meter.SUBMISSIONS, 5)).resolves.toBeUndefined();
  });

  it('STORAGE_BYTES is non-periodic: denial has no resetsAt', async () => {
    mockPlan('solo');
    // Storage usage comes from live blob sums (S6), not the counter table.
    repository.sumStorageBytes.mockResolvedValue(PLAN_ENTITLEMENTS.solo.limits.storageBytes);
    try {
      await service.assertMeterAvailable(ORG, Meter.STORAGE_BYTES);
      fail('expected EntitlementExceededException');
    } catch (err) {
      const body = (err as EntitlementExceededException).getResponse() as {
        details: { resetsAt: string | null };
      };
      expect(body.details.resetsAt).toBeNull();
    }
  });
});

// --- Boolean feature gates ---

describe('EntitlementsService feature gates', () => {
  const service = makeService();

  it.each<[PlanId, boolean]>([
    ['trial', false],
    ['solo', false],
    ['growth', true],
    ['business', true],
  ])('removeBranding on %s → %s', async (planId, expected) => {
    mockPlan(planId);
    await expect(service.checkFeature(ORG, 'removeBranding')).resolves.toBe(expected);
  });

  it('requireFeature throws 402 for a disabled boolean gate', async () => {
    mockPlan('trial');
    await expect(service.requireFeature(ORG, 'removeBranding')).rejects.toThrow(
      EntitlementExceededException,
    );
  });

  it("requireFeature treats apiAccess 'none' as denied and 'read' as allowed", async () => {
    mockPlan('solo');
    await expect(service.requireFeature(ORG, 'apiAccess')).rejects.toThrow(
      EntitlementExceededException,
    );
    mockPlan('growth');
    await expect(service.requireFeature(ORG, 'apiAccess')).resolves.toBeUndefined();
  });
});

// --- Overrides ---

describe('EntitlementsService override precedence', () => {
  const service = makeService();

  it('a numeric override raises a plan limit', async () => {
    mockPlan('trial');
    repository.findActiveOverrides.mockResolvedValue([
      { entitlement: 'submissionsPerMonth', value: 100, expiresAt: null, reason: 'sales' },
    ]);
    mockUsed(60); // over the base 50, under the overridden 100
    await expect(service.assertMeterAvailable(ORG, Meter.SUBMISSIONS)).resolves.toBeUndefined();
  });

  it('a boolean override enables a gated feature', async () => {
    mockPlan('solo');
    repository.findActiveOverrides.mockResolvedValue([
      { entitlement: 'removeBranding', value: true, expiresAt: null, reason: 'grandfathered' },
    ]);
    await expect(service.checkFeature(ORG, 'removeBranding')).resolves.toBe(true);
  });

  it('an org without a subscription row falls back to trial limits', async () => {
    repository.findSubscription.mockResolvedValue(null);
    repository.findActiveOverrides.mockResolvedValue([]);
    mockUsed(PLAN_ENTITLEMENTS.trial.limits.submissionsPerMonth);
    await expect(service.assertMeterAvailable(ORG, Meter.SUBMISSIONS)).rejects.toThrow(
      EntitlementExceededException,
    );
  });
});

// --- Consumption, idempotency, soft-warn latch ---

describe('EntitlementsService.consume', () => {
  const service = makeService();

  it('applies consumption, refreshes the usage cache, and returns the new state', async () => {
    mockPlan('trial');
    repository.writeConsumption.mockResolvedValue({ applied: true, counter: counterRow(3) });

    const state = await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:1' });

    expect(state.used).toBe(3);
    expect(state.limit).toBe(50);
    expect(repository.writeConsumption).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG, quantity: 1, idempotencyKey: 'sub:1' }),
    );
    expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('entitlements:usage'), 3, 30);
  });

  it('an idempotent replay does not soft-warn or re-apply', async () => {
    mockPlan('trial');
    repository.writeConsumption.mockResolvedValue({ applied: false, counter: counterRow(45) });

    const state = await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:1' });

    expect(state.used).toBe(45);
    expect(repository.markSoftWarned).not.toHaveBeenCalled();
  });

  it('latches the soft warning exactly once when crossing 80%', async () => {
    mockPlan('trial'); // limit 50 → soft threshold 40
    const softCount = Math.ceil(50 * SOFT_LIMIT_RATIO);
    repository.writeConsumption.mockResolvedValue({
      applied: true,
      counter: counterRow(softCount),
    });

    await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:40' });
    expect(repository.markSoftWarned).toHaveBeenCalledTimes(1);
    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        subject: expect.stringContaining('80%'),
      }),
    );

    // Already latched — a later consumption must not warn again.
    repository.writeConsumption.mockResolvedValue({
      applied: true,
      counter: counterRow(softCount + 1, new Date()),
    });
    await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:41' });
    expect(repository.markSoftWarned).toHaveBeenCalledTimes(1);
    expect(emailService.send).toHaveBeenCalledTimes(1);
  });

  it('a failed warning email never fails the consumption', async () => {
    mockPlan('trial');
    emailService.send.mockRejectedValueOnce(new Error('smtp down'));
    repository.writeConsumption.mockResolvedValue({ applied: true, counter: counterRow(48) });

    const state = await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:48' });

    expect(state.used).toBe(48);
    expect(logger.error).toHaveBeenCalled();
  });

  it('does not warn below the soft threshold', async () => {
    mockPlan('trial');
    repository.writeConsumption.mockResolvedValue({ applied: true, counter: counterRow(10) });
    await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:10' });
    expect(repository.markSoftWarned).not.toHaveBeenCalled();
  });

  it('never blocks — consumption over the limit still records (quarantine is the caller)', async () => {
    mockPlan('trial');
    repository.writeConsumption.mockResolvedValue({ applied: true, counter: counterRow(51) });
    const state = await service.consume(ORG, Meter.SUBMISSIONS, { idempotencyKey: 'sub:51' });
    expect(state.used).toBe(51);
  });
});

// --- Counted resources & usage summary ---

describe('EntitlementsService counted resources', () => {
  const service = makeService();

  it('denies adding a user at the seat ceiling', async () => {
    mockPlan('trial'); // maxUsers 2
    repository.countActiveUsers.mockResolvedValue(2);
    await expect(service.assertCountedAvailable(ORG, 'users')).rejects.toThrow(
      EntitlementExceededException,
    );
  });

  it('allows adding a user under the ceiling', async () => {
    mockPlan('trial');
    repository.countActiveUsers.mockResolvedValue(1);
    await expect(service.assertCountedAvailable(ORG, 'users')).resolves.toBeUndefined();
  });

  it('getUsageSummary reports every meter with plan limits and ratios', async () => {
    mockPlan('growth');
    repository.findCounter.mockResolvedValue(null);
    repository.countActiveUsers.mockResolvedValue(3);

    const summary = await service.getUsageSummary(ORG);

    expect(summary.planId).toBe('growth');
    expect(summary.meters).toHaveLength(Object.values(Meter).length);
    const submissions = summary.meters.find((m) => m.meter === MeterEnum.SUBMISSIONS);
    expect(submissions?.limit).toBe(PLAN_ENTITLEMENTS.growth.limits.submissionsPerMonth);
    expect(submissions?.used).toBe(0);
    expect(summary.counted.users).toEqual({
      used: 3,
      limit: PLAN_ENTITLEMENTS.growth.limits.maxUsers,
    });
  });
});
