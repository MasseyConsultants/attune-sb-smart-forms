// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard Tests

import { render, screen } from '@testing-library/react';
import type { DashboardSummary } from '@attune-sb/shared-types';
import { Meter, OrgLifecycleState, SubscriptionStatus } from '@attune-sb/shared-types';

import { DashboardHome } from './dashboard-home';

function baseSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    windowDays: 7,
    generatedAt: '2026-07-16T12:00:00.000Z',
    workspace: {
      name: 'Acme Fencing',
      lifecycleState: OrgLifecycleState.ACTIVE,
      purgeScheduledAt: null,
      subscription: {
        planId: 'growth',
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodEnd: null,
        billingAnchorDay: 1,
        seats: 3,
        isStripeManaged: true,
      },
    },
    capabilities: {
      canCreate: true,
      canManageBilling: true,
      canSeeUsage: true,
      canSeeTeam: true,
      canSeeQuarantine: true,
      canSeeWorkflowHealth: true,
      approvalsEnabled: true,
    },
    pulse: {
      submissions: { current: 4, previous: 2 },
      documentFills: { current: 1, previous: 0 },
      workflowRuns: { current: 3, previous: 3 },
      needsAttention: 1,
      publishedForms: 2,
      publishedFormsLimit: 25,
    },
    attention: [
      {
        id: 'approval:1',
        kind: 'approval_pending',
        title: 'Approval waiting on boss@acme.test',
        subtitle: 'Intake',
        href: '/workflows/wf-1/runs',
        createdAt: '2026-07-16T10:00:00.000Z',
      },
    ],
    onboarding: {
      hasForm: true,
      hasPublishedForm: true,
      hasTemplate: true,
      hasMappedTemplate: true,
      hasSubmission: true,
      hasDocumentFill: true,
      hasWorkflow: true,
      complete: true,
    },
    series: {
      submissionsByDay: [
        { date: '2026-07-15', count: 2 },
        { date: '2026-07-16', count: 2 },
      ],
      documentFillsByDay: [
        { date: '2026-07-15', count: 0 },
        { date: '2026-07-16', count: 1 },
      ],
    },
    topForms: [{ formId: 'f-1', name: 'Job Intake', status: 'PUBLISHED', submissionCount: 4 }],
    workflowHealth: {
      completed: 2,
      failed: 0,
      paused: 1,
      recentRuns: [
        {
          runId: 'run-1',
          workflowId: 'wf-1',
          workflowName: 'Intake',
          status: 'PAUSED',
          startedAt: '2026-07-16T10:00:00.000Z',
          createdAt: '2026-07-16T10:00:00.000Z',
        },
      ],
    },
    usage: {
      planId: 'growth',
      meters: [
        {
          meter: Meter.SUBMISSIONS,
          used: 10,
          limit: 2500,
          ratio: 0.004,
          periodStart: null,
          periodEnd: null,
        },
      ],
      counted: {
        activeForms: { used: 2, limit: 25 },
        uploadedTemplates: { used: 1, limit: 15 },
        users: { used: 3, limit: 10 },
      },
    },
    team: { seatsUsed: 3, seatsLimit: 10, pendingInvites: 1 },
    ...overrides,
  };
}

describe('DashboardHome', () => {
  it('renders pulse, attention, sparkline, top forms, and workflow health for OWNER', () => {
    render(<DashboardHome summary={baseSummary()} />);

    expect(screen.getByText('Acme Fencing')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Approval waiting on boss@acme.test')).toBeInTheDocument();
    expect(screen.getByTestId('quick-create')).toBeInTheDocument();
    expect(screen.getByTestId('usage-meters')).toBeInTheDocument();
    expect(screen.getByTestId('activity-sparkline')).toBeInTheDocument();
    expect(screen.getByTestId('top-forms')).toBeInTheDocument();
    expect(screen.getByText('Job Intake')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-health')).toBeInTheDocument();
    expect(screen.getByTestId('team-snapshot')).toBeInTheDocument();
  });

  it('hides create, usage, team, and workflow health for VIEWER', () => {
    render(
      <DashboardHome
        summary={baseSummary({
          capabilities: {
            canCreate: false,
            canManageBilling: false,
            canSeeUsage: false,
            canSeeTeam: false,
            canSeeQuarantine: false,
            canSeeWorkflowHealth: false,
            approvalsEnabled: false,
          },
          usage: null,
          team: null,
          workflowHealth: null,
          pulse: {
            submissions: { current: 4, previous: 2 },
            documentFills: { current: 1, previous: 0 },
            workflowRuns: { current: 0, previous: 0 },
            needsAttention: 0,
            publishedForms: 2,
            publishedFormsLimit: null,
          },
          attention: [],
        })}
      />,
    );

    expect(screen.queryByTestId('quick-create')).not.toBeInTheDocument();
    expect(screen.queryByTestId('usage-meters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflow-health')).not.toBeInTheDocument();
    expect(screen.queryByTestId('team-snapshot')).not.toBeInTheDocument();
    expect(screen.getByTestId('activity-sparkline')).toBeInTheDocument();
    expect(screen.getByText("You're caught up")).toBeInTheDocument();
  });

  it('shows onboarding checklist until aha path is complete', () => {
    render(
      <DashboardHome
        summary={baseSummary({
          onboarding: {
            hasForm: true,
            hasPublishedForm: false,
            hasTemplate: false,
            hasMappedTemplate: false,
            hasSubmission: false,
            hasDocumentFill: false,
            hasWorkflow: false,
            complete: false,
          },
        })}
      />,
    );

    expect(screen.getByText('Get to your first filled PDF')).toBeInTheDocument();
    expect(screen.getByText('Publish it so customers can fill it')).toBeInTheDocument();
  });
});
