// Author: Robert Massey | Created: 2026-07-16 | Module: Dashboard / Tests
// Role shaping, approval gating by workflowNodeTier, and attention ordering.

import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { DashboardService } from './dashboard.service';

const ORG = 'org-1';

const repository = {
  findOrgWorkspace: jest.fn(),
  countSubmissionsInRange: jest.fn(),
  countUsageEventsInRange: jest.fn(),
  countWorkflowRunsInRange: jest.fn(),
  countPublishedForms: jest.fn(),
  countForms: jest.fn(),
  countTemplates: jest.fn(),
  countMappedTemplates: jest.fn(),
  hasAnySubmission: jest.fn(),
  hasAnyDocumentFill: jest.fn(),
  countWorkflows: jest.fn(),
  countQuarantined: jest.fn(),
  countPendingApprovals: jest.fn(),
  listPendingApprovals: jest.fn(),
  countFailedRuns: jest.fn(),
  listFailedRuns: jest.fn(),
  countPendingInvites: jest.fn(),
  countActiveUsers: jest.fn(),
  countSubmissionsByDay: jest.fn(),
  countDocFillsByDay: jest.fn(),
  topFormsBySubmissions: jest.fn(),
  countRunsByStatus: jest.fn(),
  listRecentRuns: jest.fn(),
};

const entitlements = {
  getPlanSnapshot: jest.fn(),
  getUsageSummary: jest.fn(),
};

function makeService(): DashboardService {
  // Reason: structural mocks for Nest providers in unit tests.
  return new DashboardService(repository as any, entitlements as any);
}

function user(role: Role) {
  return { userId: 'u-1', email: 'a@acme.test', role, organizationId: ORG };
}

function seedHappyPath(planTier: 'core' | 'growth' | 'business' = 'growth'): void {
  repository.findOrgWorkspace.mockResolvedValue({
    id: ORG,
    name: 'Acme',
    lifecycleState: 'ACTIVE',
    purgeScheduledAt: null,
    subscription: {
      planId: planTier === 'core' ? 'solo' : planTier,
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: null,
      billingAnchorDay: 1,
      seats: 1,
      stripeSubscriptionId: 'sub_1',
    },
  });
  entitlements.getPlanSnapshot.mockResolvedValue({
    planId: planTier === 'core' ? 'solo' : planTier,
    definition: {
      features: { workflowNodeTier: planTier },
      limits: { activeForms: 25, maxUsers: 10 },
    },
    billingAnchorDay: 1,
  });
  repository.countSubmissionsInRange.mockResolvedValue(3);
  repository.countUsageEventsInRange.mockResolvedValue(1);
  repository.countWorkflowRunsInRange.mockResolvedValue(2);
  repository.countPublishedForms.mockResolvedValue(1);
  repository.countForms.mockResolvedValue(1);
  repository.countTemplates.mockResolvedValue(1);
  repository.countMappedTemplates.mockResolvedValue(1);
  repository.hasAnySubmission.mockResolvedValue(true);
  repository.hasAnyDocumentFill.mockResolvedValue(true);
  repository.countWorkflows.mockResolvedValue(1);
  repository.countQuarantined.mockResolvedValue(0);
  repository.countPendingApprovals.mockResolvedValue(0);
  repository.listPendingApprovals.mockResolvedValue([]);
  repository.countFailedRuns.mockResolvedValue(0);
  repository.listFailedRuns.mockResolvedValue([]);
  repository.countPendingInvites.mockResolvedValue(0);
  repository.countActiveUsers.mockResolvedValue(2);
  repository.countSubmissionsByDay.mockResolvedValue([
    { date: '2026-07-15', count: 2 },
    { date: '2026-07-16', count: 1 },
  ]);
  repository.countDocFillsByDay.mockResolvedValue([{ date: '2026-07-16', count: 1 }]);
  repository.topFormsBySubmissions.mockResolvedValue([
    { formId: 'f-1', name: 'Intake', status: 'PUBLISHED', submissionCount: 3 },
  ]);
  repository.countRunsByStatus.mockResolvedValue(1);
  repository.listRecentRuns.mockResolvedValue([
    {
      runId: 'run-1',
      workflowId: 'wf-1',
      workflowName: 'Intake',
      status: 'COMPLETED',
      startedAt: new Date('2026-07-16T09:00:00Z'),
      createdAt: new Date('2026-07-16T09:00:00Z'),
    },
  ]);
  entitlements.getUsageSummary.mockResolvedValue({
    planId: 'growth',
    meters: [
      {
        meter: 'SUBMISSIONS',
        used: 10,
        limit: 100,
        ratio: 0.1,
        periodStart: null,
        periodEnd: null,
      },
    ],
    counted: {
      activeForms: { used: 1, limit: 25 },
      uploadedTemplates: { used: 1, limit: 15 },
      users: { used: 2, limit: 10 },
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  seedHappyPath('growth');
});

describe('DashboardService.getSummary', () => {
  it('404s when the org is missing', async () => {
    repository.findOrgWorkspace.mockResolvedValue(null);
    await expect(makeService().getSummary(user(Role.OWNER))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('OWNER sees usage, quarantine capability, and create', async () => {
    const summary = await makeService().getSummary(user(Role.OWNER));
    expect(summary.capabilities.canSeeUsage).toBe(true);
    expect(summary.capabilities.canSeeQuarantine).toBe(true);
    expect(summary.capabilities.canSeeWorkflowHealth).toBe(true);
    expect(summary.capabilities.canCreate).toBe(true);
    expect(summary.capabilities.canManageBilling).toBe(true);
    expect(summary.usage).not.toBeNull();
    expect(summary.team).not.toBeNull();
    expect(summary.workflowHealth).not.toBeNull();
    expect(summary.topForms).toHaveLength(1);
    expect(summary.series.submissionsByDay).toHaveLength(7);
    expect(summary.capabilities.approvalsEnabled).toBe(true);
  });

  it('VIEWER cannot create, see usage, quarantine, or workflow health', async () => {
    const summary = await makeService().getSummary(user(Role.VIEWER));
    expect(summary.capabilities.canCreate).toBe(false);
    expect(summary.capabilities.canSeeUsage).toBe(false);
    expect(summary.capabilities.canSeeQuarantine).toBe(false);
    expect(summary.capabilities.canSeeWorkflowHealth).toBe(false);
    expect(summary.capabilities.canManageBilling).toBe(false);
    expect(summary.usage).toBeNull();
    expect(summary.team).toBeNull();
    expect(summary.workflowHealth).toBeNull();
    expect(repository.countQuarantined).not.toHaveBeenCalled();
    expect(repository.listRecentRuns).not.toHaveBeenCalled();
    expect(entitlements.getUsageSummary).not.toHaveBeenCalled();
  });

  it('hides approval queries on core-tier plans', async () => {
    seedHappyPath('core');
    const summary = await makeService().getSummary(user(Role.OWNER));
    expect(summary.capabilities.approvalsEnabled).toBe(false);
    expect(repository.listPendingApprovals).not.toHaveBeenCalled();
    expect(repository.countPendingApprovals).not.toHaveBeenCalled();
  });

  it('surfaces pending approvals ahead of failed runs when Growth+', async () => {
    repository.countPendingApprovals.mockResolvedValue(1);
    repository.listPendingApprovals.mockResolvedValue([
      {
        id: 'tok-1',
        assignedTo: 'boss@acme.test',
        message: null,
        createdAt: new Date('2026-07-16T10:00:00Z'),
        expiresAt: new Date('2026-07-20T10:00:00Z'),
        runId: 'run-1',
        workflowId: 'wf-1',
        workflowName: 'Intake',
      },
    ]);
    repository.countFailedRuns.mockResolvedValue(1);
    repository.listFailedRuns.mockResolvedValue([
      {
        id: 'run-2',
        error: 'SMTP failed',
        createdAt: new Date('2026-07-16T12:00:00Z'),
        workflowId: 'wf-2',
        workflowName: 'Notify',
      },
    ]);

    const summary = await makeService().getSummary(user(Role.ADMIN));
    expect(summary.attention[0].kind).toBe('approval_pending');
    expect(summary.attention[0].href).toBe('/workflows/wf-1/runs');
    expect(summary.attention[1].kind).toBe('workflow_failed');
    expect(summary.pulse.needsAttention).toBe(2);
  });

  it('disables create when org is read-only', async () => {
    repository.findOrgWorkspace.mockResolvedValue({
      id: ORG,
      name: 'Acme',
      lifecycleState: 'EXPIRED_TRIAL',
      purgeScheduledAt: new Date('2026-08-01T00:00:00Z'),
      subscription: null,
    });
    const summary = await makeService().getSummary(user(Role.OWNER));
    expect(summary.capabilities.canCreate).toBe(false);
    expect(summary.onboarding.complete).toBe(true);
  });

  it('marks onboarding incomplete until the aha path is done', async () => {
    repository.hasAnyDocumentFill.mockResolvedValue(false);
    const summary = await makeService().getSummary(user(Role.BUILDER));
    expect(summary.onboarding.complete).toBe(false);
    expect(summary.onboarding.hasDocumentFill).toBe(false);
    expect(summary.capabilities.canCreate).toBe(true);
    expect(summary.usage).toBeNull();
  });
});
