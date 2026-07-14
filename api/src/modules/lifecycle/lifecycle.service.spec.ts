// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle / Tests
// The purge sweep gets the same rigor as entitlements: every lifecycle path,
// legal hold, reminder latching, idempotent re-runs, and restore at every state.
// Purging the wrong org is unrecoverable.

import { OrgLifecycleState, PurgePhase, SubscriptionStatus } from '@prisma/client';

import {
  CANCELED_RETENTION_DAYS,
  DAY_MS,
  HARD_DELETE_DELAY_DAYS,
  TRIAL_RETENTION_DAYS,
} from './lifecycle-constants';
import { LifecycleService } from './lifecycle.service';

const repository = {
  findExpiredTrials: jest.fn(),
  findEndedCanceledSubscriptions: jest.fn(),
  findDunningExhausted: jest.fn(),
  findReadOnlyOrgs: jest.fn(),
  findPurgeDue: jest.fn(),
  findHardDeleteDue: jest.fn(),
  findOrgState: jest.fn(),
  transitionToReadOnly: jest.fn(),
  cancelSubscription: jest.fn(),
  restoreOrg: jest.fn(),
  updateSettings: jest.fn(),
  markPurgeRequested: jest.fn(),
  findOwner: jest.fn(),
  countOrgEntities: jest.fn(),
  softDeleteOrgData: jest.fn(),
  upsertTombstone: jest.fn(),
  writeAudit: jest.fn(),
  hasAuditEntry: jest.fn(),
  hardDeleteOrg: jest.fn(),
};

const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };
const config = { get: jest.fn((_k: string, d?: unknown) => d) };
const emailService = { send: jest.fn().mockResolvedValue(undefined) };
const entitlements = {
  invalidate: jest.fn(),
  getPlanSnapshot: jest.fn().mockResolvedValue({ planId: 'trial' }),
};
const storage = { deletePrefix: jest.fn().mockResolvedValue(undefined) };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
const inAppNotifications = { emit: jest.fn().mockResolvedValue(undefined) };

const NOW = new Date('2026-08-01T12:00:00Z');

function makeService(): LifecycleService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new LifecycleService(
    repository as any,
    cache as any,
    config as any,
    emailService as any,
    entitlements as any,
    storage as any,
    logger as any,
    inAppNotifications as any,
  );
}

function org(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'org-1',
    name: 'Acme Plumbing',
    settings: {},
    lifecycleState: OrgLifecycleState.ACTIVE,
    readOnlyAt: null,
    purgeScheduledAt: null,
    purgeRequestedAt: null,
    legalHoldAt: null,
    subscription: { id: 'sub-1', status: SubscriptionStatus.TRIALING },
    ...overrides,
  };
}

function emptySweepMocks(): void {
  repository.findExpiredTrials.mockResolvedValue([]);
  repository.findEndedCanceledSubscriptions.mockResolvedValue([]);
  repository.findDunningExhausted.mockResolvedValue([]);
  repository.findReadOnlyOrgs.mockResolvedValue([]);
  repository.findPurgeDue.mockResolvedValue([]);
  repository.findHardDeleteDue.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  emptySweepMocks();
  cache.get.mockResolvedValue(null);
  repository.findOwner.mockResolvedValue({ email: 'owner@acme.com' });
  repository.countOrgEntities.mockResolvedValue({ users: 2 });
  entitlements.getPlanSnapshot.mockResolvedValue({ planId: 'trial' });
});

describe('trial expiry → EXPIRED_TRIAL', () => {
  const service = makeService();

  it('flips the org read-only with a 30-day purge window and sends the T+0 email', async () => {
    repository.findExpiredTrials.mockResolvedValue([org()]);

    const result = await service.runDailySweep(NOW);

    expect(result.trialsExpired).toBe(1);
    expect(repository.transitionToReadOnly).toHaveBeenCalledWith(
      'org-1',
      OrgLifecycleState.EXPIRED_TRIAL,
      NOW,
      new Date(NOW.getTime() + TRIAL_RETENTION_DAYS * DAY_MS),
    );
    expect(entitlements.invalidate).toHaveBeenCalledWith('org-1');
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@acme.com' }),
    );
    expect(repository.updateSettings).toHaveBeenCalledWith('org-1', {
      lifecycleRemindersSent: ['EXPIRED_TRIAL:0'],
    });
  });
});

describe('cancellation → CANCELED', () => {
  const service = makeService();

  it('applies the generous 60-day window for paid customers', async () => {
    repository.findEndedCanceledSubscriptions.mockResolvedValue([
      org({ subscription: { id: 'sub-1', status: SubscriptionStatus.CANCELED } }),
    ]);

    const result = await service.runDailySweep(NOW);

    expect(result.cancellationsProcessed).toBe(1);
    expect(repository.transitionToReadOnly).toHaveBeenCalledWith(
      'org-1',
      OrgLifecycleState.CANCELED,
      NOW,
      new Date(NOW.getTime() + CANCELED_RETENTION_DAYS * DAY_MS),
    );
  });

  it('auto-cancels subscriptions with exhausted dunning', async () => {
    repository.findDunningExhausted.mockResolvedValue([
      org({ subscription: { id: 'sub-1', status: SubscriptionStatus.PAST_DUE } }),
    ]);

    const result = await service.runDailySweep(NOW);

    expect(result.dunningCanceled).toBe(1);
    expect(repository.cancelSubscription).toHaveBeenCalledWith('sub-1');
  });
});

describe('reminder emails', () => {
  const service = makeService();

  function readOnlyOrg(daysAgo: number, sent: string[] = []): Record<string, unknown> {
    return org({
      lifecycleState: OrgLifecycleState.EXPIRED_TRIAL,
      readOnlyAt: new Date(NOW.getTime() - daysAgo * DAY_MS),
      purgeScheduledAt: new Date(NOW.getTime() + (TRIAL_RETENTION_DAYS - daysAgo) * DAY_MS),
      settings: { lifecycleRemindersSent: sent },
    });
  }

  it('sends the day-7 reminder exactly once (latch)', async () => {
    repository.findReadOnlyOrgs.mockResolvedValue([readOnlyOrg(7, ['EXPIRED_TRIAL:0'])]);

    const first = await service.runDailySweep(NOW);
    expect(first.remindersSent).toBe(1);
    expect(repository.updateSettings).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        lifecycleRemindersSent: ['EXPIRED_TRIAL:0', 'EXPIRED_TRIAL:7'],
      }),
    );

    // Re-run with the latch recorded — no duplicate email.
    jest.clearAllMocks();
    emptySweepMocks();
    cache.get.mockResolvedValue(null);
    repository.findOwner.mockResolvedValue({ email: 'owner@acme.com' });
    repository.findReadOnlyOrgs.mockResolvedValue([
      readOnlyOrg(7, ['EXPIRED_TRIAL:0', 'EXPIRED_TRIAL:7']),
    ]);
    const second = await service.runDailySweep(NOW);
    expect(second.remindersSent).toBe(0);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('a missed sweep day still sends the latest due reminder (day 23 at day 24)', async () => {
    repository.findReadOnlyOrgs.mockResolvedValue([
      readOnlyOrg(24, ['EXPIRED_TRIAL:0', 'EXPIRED_TRIAL:7']),
    ]);

    const result = await service.runDailySweep(NOW);

    expect(result.remindersSent).toBe(1);
    expect(repository.updateSettings).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        lifecycleRemindersSent: expect.arrayContaining(['EXPIRED_TRIAL:23']),
      }),
    );
  });
});

describe('purge phase 1 (window elapsed)', () => {
  const service = makeService();

  it('writes the tombstone, soft-deletes rows, and audits BLOBS_DELETED', async () => {
    repository.findPurgeDue.mockResolvedValue([
      org({ lifecycleState: OrgLifecycleState.EXPIRED_TRIAL }),
    ]);

    const result = await service.runDailySweep(NOW);

    expect(result.purgedPhase1).toBe(1);
    expect(repository.upsertTombstone).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        orgName: 'Acme Plumbing',
        lifecyclePath: 'trial',
        ownerEmailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(repository.softDeleteOrgData).toHaveBeenCalledWith(
      'org-1',
      NOW,
      new Date(NOW.getTime() + HARD_DELETE_DELAY_DAYS * DAY_MS),
    );
    expect(repository.writeAudit).toHaveBeenCalledWith(
      'org-1',
      PurgePhase.BLOBS_DELETED,
      { users: 2 },
      'lifecycle-sweep',
    );
  });

  it('attributes user-requested deletions in the audit trail', async () => {
    repository.findPurgeDue.mockResolvedValue([
      org({ lifecycleState: OrgLifecycleState.CANCELED, purgeRequestedAt: NOW }),
    ]);

    await service.runDailySweep(NOW);

    expect(repository.writeAudit).toHaveBeenCalledWith(
      'org-1',
      PurgePhase.BLOBS_DELETED,
      expect.anything(),
      'user-request',
    );
  });

  it('legal hold blocks the purge unconditionally and audits the skip', async () => {
    repository.findPurgeDue.mockResolvedValue([org({ legalHoldAt: NOW })]);

    const result = await service.runDailySweep(NOW);

    expect(result.purgedPhase1).toBe(0);
    expect(result.legalHoldSkips).toBe(1);
    expect(repository.softDeleteOrgData).not.toHaveBeenCalled();
    expect(repository.writeAudit).toHaveBeenCalledWith(
      'org-1',
      PurgePhase.LEGAL_HOLD_SKIP,
      {},
      'lifecycle-sweep',
    );
  });
});

describe('purge phase 2 (hard delete)', () => {
  const service = makeService();

  it('hard-deletes after the 7-day safety net and audits HARD_DELETED', async () => {
    repository.findHardDeleteDue.mockResolvedValue([
      org({ lifecycleState: OrgLifecycleState.PURGE_PENDING }),
    ]);

    const result = await service.runDailySweep(NOW);

    expect(result.purgedPhase2).toBe(1);
    expect(repository.hardDeleteOrg).toHaveBeenCalledWith('org-1');
    expect(repository.writeAudit).toHaveBeenCalledWith(
      'org-1',
      PurgePhase.HARD_DELETED,
      { users: 2 },
      'lifecycle-sweep',
    );
  });

  it('legal hold also blocks phase 2', async () => {
    repository.findHardDeleteDue.mockResolvedValue([
      org({ lifecycleState: OrgLifecycleState.PURGE_PENDING, legalHoldAt: NOW }),
    ]);

    const result = await service.runDailySweep(NOW);

    expect(result.purgedPhase2).toBe(0);
    expect(repository.hardDeleteOrg).not.toHaveBeenCalled();
  });
});

describe('sweep idempotency', () => {
  const service = makeService();

  it('a second run with state-derived empty candidates does nothing', async () => {
    // First run processes one expired trial…
    repository.findExpiredTrials.mockResolvedValue([org()]);
    await service.runDailySweep(NOW);

    // …after which the org no longer matches the candidate query.
    jest.clearAllMocks();
    emptySweepMocks();
    cache.get.mockResolvedValue(null);

    const second = await service.runDailySweep(NOW);

    expect(second).toEqual({
      trialsExpired: 0,
      cancellationsProcessed: 0,
      dunningCanceled: 0,
      remindersSent: 0,
      purgedPhase1: 0,
      purgedPhase2: 0,
      legalHoldSkips: 0,
    });
    expect(repository.transitionToReadOnly).not.toHaveBeenCalled();
    expect(repository.hardDeleteOrg).not.toHaveBeenCalled();
  });
});

describe('restore', () => {
  const service = makeService();

  it('restoreIfReadOnly is a no-op for ACTIVE orgs', async () => {
    repository.findOrgState.mockResolvedValue(OrgLifecycleState.ACTIVE);
    const restored = await service.restoreIfReadOnly('org-1', 'checkout-resubscribe');
    expect(restored).toBe(false);
    expect(repository.restoreOrg).not.toHaveBeenCalled();
  });

  it.each([
    OrgLifecycleState.EXPIRED_TRIAL,
    OrgLifecycleState.CANCELED,
    OrgLifecycleState.PURGE_PENDING,
  ])('restores a %s org instantly and audits RESTORED', async (state) => {
    repository.findOrgState.mockResolvedValue(state);

    const restored = await service.restoreIfReadOnly('org-1', 'checkout-resubscribe');

    expect(restored).toBe(true);
    expect(repository.restoreOrg).toHaveBeenCalledWith('org-1');
    expect(repository.writeAudit).toHaveBeenCalledWith(
      'org-1',
      PurgePhase.RESTORED,
      {},
      'checkout-resubscribe',
    );
    expect(entitlements.invalidate).toHaveBeenCalledWith('org-1');
  });
});

describe('isReadOnly', () => {
  const service = makeService();

  it('reports read-only for non-ACTIVE states and caches the answer', async () => {
    repository.findOrgState.mockResolvedValue(OrgLifecycleState.EXPIRED_TRIAL);
    await expect(service.isReadOnly('org-1')).resolves.toBe(true);
    expect(cache.set).toHaveBeenCalledWith('lifecycle:readonly:org-1', true, 60);
  });

  it('serves from cache without hitting the database', async () => {
    cache.get.mockResolvedValue(false);
    await expect(service.isReadOnly('org-1')).resolves.toBe(false);
    expect(repository.findOrgState).not.toHaveBeenCalled();
  });
});
