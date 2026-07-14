// Author: Robert Massey | Created: 2026-07-13 | Module: Admin / Tests
// Support-surface invariants: 404 on unknown orgs, override mutations bust the
// entitlements cache, and every mutation logs the acting admin.

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AdminService } from './admin.service';

const repository = {
  findOrgs: jest.fn(),
  findOrg: jest.fn(),
  findMembers: jest.fn(),
  findCounts: jest.fn(),
  findOverrides: jest.fn(),
  createOverride: jest.fn(),
  deleteOverride: jest.fn(),
  setLegalHold: jest.fn(),
};

const entitlements = { getUsageSummary: jest.fn(), invalidate: jest.fn() };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

function makeOrgRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    name: 'Acme Fencing',
    slug: 'acme-fencing',
    lifecycleState: 'ACTIVE',
    legalHoldAt: null,
    readOnlyAt: null,
    purgeScheduledAt: null,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    subscription: { planId: 'growth', status: 'ACTIVE', trialEndsAt: null },
    _count: { users: 3, forms: 7 },
    ...overrides,
  };
}

function makeService(): AdminService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new AdminService(repository as any, entitlements as any, logger as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  entitlements.invalidate.mockResolvedValue(undefined);
});

describe('getOrg', () => {
  it('composes summary, members, usage, overrides, and counts', async () => {
    repository.findOrg.mockResolvedValue(makeOrgRow());
    repository.findMembers.mockResolvedValue([
      {
        id: 'user-1',
        email: 'owner@acme.test',
        firstName: 'Ada',
        lastName: 'Owner',
        role: 'OWNER',
        isActive: true,
        lastLoginAt: new Date('2026-07-12T00:00:00Z'),
      },
    ]);
    entitlements.getUsageSummary.mockResolvedValue({ planId: 'growth', meters: [], counted: {} });
    repository.findOverrides.mockResolvedValue([]);
    repository.findCounts.mockResolvedValue({
      submissions: 42,
      documentTemplates: 2,
      workflows: 3,
      workflowRuns: 11,
    });
    const service = makeService();

    const detail = await service.getOrg('org-1');

    expect(detail.planId).toBe('growth');
    expect(detail.legalHold).toBe(false);
    expect(detail.memberCount).toBe(3);
    expect(detail.members[0].email).toBe('owner@acme.test');
    expect(detail.counts.submissions).toBe(42);
  });

  it('404s for an unknown org', async () => {
    repository.findOrg.mockResolvedValue(null);
    const service = makeService();

    await expect(service.getOrg('nope')).rejects.toThrow(NotFoundException);
  });
});

describe('setLegalHold', () => {
  it('sets the hold and logs the acting admin', async () => {
    repository.findOrg.mockResolvedValue(makeOrgRow());
    repository.setLegalHold.mockResolvedValue(undefined);
    const service = makeService();

    await service.setLegalHold('org-1', true, 'admin-1');

    expect(repository.setLegalHold).toHaveBeenCalledWith('org-1', true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('by=admin-1'), 'AdminService');
  });

  it('404s for an unknown org', async () => {
    repository.findOrg.mockResolvedValue(null);
    const service = makeService();

    await expect(service.setLegalHold('nope', true, 'admin-1')).rejects.toThrow(NotFoundException);
    expect(repository.setLegalHold).not.toHaveBeenCalled();
  });
});

describe('overrides', () => {
  const OVERRIDE_ROW = {
    id: 'ovr-1',
    entitlement: 'submissionsPerMonth',
    value: 1000,
    reason: 'support bump',
    expiresAt: null,
    createdAt: new Date('2026-07-13T00:00:00Z'),
  };

  it('createOverride persists, invalidates the entitlements cache, and logs', async () => {
    repository.findOrg.mockResolvedValue(makeOrgRow());
    repository.createOverride.mockResolvedValue(OVERRIDE_ROW);
    const service = makeService();

    const result = await service.createOverride(
      'org-1',
      { entitlement: 'submissionsPerMonth', value: 1000, reason: 'support bump' },
      'admin-1',
    );

    expect(repository.createOverride).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', entitlement: 'submissionsPerMonth' }),
    );
    expect(entitlements.invalidate).toHaveBeenCalledWith('org-1');
    expect(result.value).toBe(1000);
  });

  it('rejects an invalid expiresAt', async () => {
    repository.findOrg.mockResolvedValue(makeOrgRow());
    const service = makeService();

    await expect(
      service.createOverride(
        'org-1',
        { entitlement: 'x', value: 1, reason: 'r', expiresAt: 'not-a-date' },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.createOverride).not.toHaveBeenCalled();
  });

  it('deleteOverride 404s when the row does not belong to the org', async () => {
    repository.deleteOverride.mockResolvedValue(false);
    const service = makeService();

    await expect(service.deleteOverride('org-1', 'ovr-x', 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(entitlements.invalidate).not.toHaveBeenCalled();
  });

  it('deleteOverride invalidates the cache on success', async () => {
    repository.deleteOverride.mockResolvedValue(true);
    const service = makeService();

    await service.deleteOverride('org-1', 'ovr-1', 'admin-1');

    expect(entitlements.invalidate).toHaveBeenCalledWith('org-1');
  });
});
