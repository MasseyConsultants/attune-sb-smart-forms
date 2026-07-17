// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard
// Purpose: Role-composed workspace home (SB-027 Phase A + B).

import { Rocket } from 'lucide-react';
import type { DashboardSummary } from '@attune-sb/shared-types';
import { SOFT_LIMIT_RATIO } from '@attune-sb/shared-types';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { METER_LABELS } from '@/components/billing/meter-bar';
import { ActivitySparkline } from '@/components/dashboard/activity-sparkline';
import { AttentionRail } from '@/components/dashboard/attention-rail';
import { LifecycleCard } from '@/components/dashboard/lifecycle-card';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { PulseKpis } from '@/components/dashboard/pulse-kpis';
import { QuickCreate } from '@/components/dashboard/quick-create';
import { TeamSnapshotCard } from '@/components/dashboard/team-snapshot';
import { TopForms } from '@/components/dashboard/top-forms';
import { UsageMetersCard } from '@/components/dashboard/usage-meters-card';
import { WindowToggle } from '@/components/dashboard/window-toggle';
import { WorkflowHealthCard } from '@/components/dashboard/workflow-health';

interface DashboardHomeProps {
  readonly summary: DashboardSummary;
  readonly welcome?: boolean;
}

export function DashboardHome({ summary, welcome }: DashboardHomeProps): React.ReactElement {
  const {
    workspace,
    capabilities,
    pulse,
    attention,
    onboarding,
    usage,
    series,
    topForms,
    workflowHealth,
    team,
  } = summary;
  const hotMeter = usage?.meters.find((m) => m.ratio >= SOFT_LIMIT_RATIO) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="dashboard-home">
      {welcome && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">Welcome to Attune Smart Forms!</p>
            <p className="text-sm text-green-700">
              Your workspace is ready. Follow the checklist below to generate your first filled PDF.
            </p>
          </div>
        </div>
      )}

      {hotMeter && capabilities.canSeeUsage && (
        <UpgradeCta
          limitLabel={METER_LABELS[hotMeter.meter].toLowerCase()}
          used={hotMeter.used}
          limit={hotMeter.limit}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">
            Forms, filled documents, and workflows — what needs you today.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <WindowToggle windowDays={summary.windowDays} welcome={welcome} />
          <QuickCreate canCreate={capabilities.canCreate} />
        </div>
      </div>

      <OnboardingChecklist onboarding={onboarding} canCreate={capabilities.canCreate} />

      <PulseKpis pulse={pulse} windowDays={summary.windowDays} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AttentionRail items={attention} />
        <ActivitySparkline series={series} windowDays={summary.windowDays} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopForms forms={topForms} windowDays={summary.windowDays} />
        {workflowHealth && capabilities.canSeeWorkflowHealth ? (
          <WorkflowHealthCard health={workflowHealth} windowDays={summary.windowDays} />
        ) : (
          <LifecycleCard workspace={workspace} canManageBilling={capabilities.canManageBilling} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {workflowHealth && capabilities.canSeeWorkflowHealth && (
          <LifecycleCard workspace={workspace} canManageBilling={capabilities.canManageBilling} />
        )}
        {team && capabilities.canSeeTeam && <TeamSnapshotCard team={team} />}
        {usage && capabilities.canSeeUsage && <UsageMetersCard usage={usage} />}
      </div>
    </div>
  );
}
