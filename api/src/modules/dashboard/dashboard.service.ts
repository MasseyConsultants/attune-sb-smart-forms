// Author: Robert Massey | Created: 2026-07-16 | Module: Dashboard
// Purpose: Compose the role-shaped workspace home summary. Never calls Stripe;
// plan tier comes from EntitlementsService (local authority).

import {
  DashboardDayCount,
  DashboardSummary,
  NODE_TIER,
  OrgLifecycleState,
  PeriodMetric,
  PlanId,
  SOFT_LIMIT_RATIO,
  SubscriptionSummary,
  WorkflowNodeTier,
} from '@attune-sb/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Meter, Role, SubscriptionStatus, WorkflowRunStatus } from '@prisma/client';

import { DashboardRepository, type DayCountRow } from './dashboard.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

const TIER_ORDER: Record<WorkflowNodeTier, number> = {
  core: 0,
  growth: 1,
  business: 2,
};

const ATTENTION_CAP = 5;
const TOP_FORMS_CAP = 5;
const RECENT_RUNS_CAP = 5;
const DEFAULT_WINDOW_DAYS = 7;

function periodMetric(current: number, previous: number): PeriodMetric {
  return { current, previous };
}

function windowBounds(
  windowDays: number,
  now: Date,
): {
  currentFrom: Date;
  previousFrom: Date;
  previousTo: Date;
  currentTo: Date;
} {
  const ms = windowDays * 24 * 60 * 60 * 1000;
  const currentTo = now;
  const currentFrom = new Date(now.getTime() - ms);
  const previousTo = currentFrom;
  const previousFrom = new Date(currentFrom.getTime() - ms);
  return { currentFrom, currentTo, previousFrom, previousTo };
}

function tierAtLeast(orgTier: WorkflowNodeTier, required: WorkflowNodeTier): boolean {
  return TIER_ORDER[orgTier] >= TIER_ORDER[required];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getSummary(
    user: AuthenticatedUser,
    windowDays: number = DEFAULT_WINDOW_DAYS,
  ): Promise<DashboardSummary> {
    const days =
      Number.isFinite(windowDays) && windowDays > 0 && windowDays <= 90
        ? Math.floor(windowDays)
        : DEFAULT_WINDOW_DAYS;

    const org = await this.repository.findOrgWorkspace(user.organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const snapshot = await this.entitlements.getPlanSnapshot(user.organizationId);
    const approvalsEnabled = tierAtLeast(
      snapshot.definition.features.workflowNodeTier,
      NODE_TIER.approval,
    );

    const { role } = user;
    const canSeeUsage = role === Role.OWNER || role === Role.ADMIN || role === Role.PLATFORM_ADMIN;
    const canSeeTeam = canSeeUsage;
    const canSeeQuarantine = canSeeUsage;
    const canSeeWorkflowHealth =
      role === Role.OWNER ||
      role === Role.ADMIN ||
      role === Role.BUILDER ||
      role === Role.PLATFORM_ADMIN;
    const canManageBilling = role === Role.OWNER || role === Role.PLATFORM_ADMIN;
    const lifecycleActive = org.lifecycleState === OrgLifecycleState.ACTIVE;
    const canCreate =
      lifecycleActive &&
      (role === Role.OWNER ||
        role === Role.ADMIN ||
        role === Role.BUILDER ||
        role === Role.PLATFORM_ADMIN);

    const now = new Date();
    const bounds = windowBounds(days, now);
    const failSince = bounds.currentFrom;

    const [
      submissionsCurrent,
      submissionsPrevious,
      fillsCurrent,
      fillsPrevious,
      runsCurrent,
      runsPrevious,
      publishedForms,
      formCount,
      templateCount,
      mappedTemplateCount,
      hasSubmission,
      hasDocumentFill,
      workflowCount,
      quarantinedCount,
      pendingApprovalCount,
      pendingApprovals,
      failedRunCount,
      failedRuns,
      usage,
      seatsUsed,
      pendingInvites,
      submissionsByDayRaw,
      documentFillsByDayRaw,
      topForms,
      runsCompleted,
      runsFailedInWindow,
      runsPaused,
      recentRuns,
    ] = await Promise.all([
      this.repository.countSubmissionsInRange(
        user.organizationId,
        bounds.currentFrom,
        bounds.currentTo,
      ),
      this.repository.countSubmissionsInRange(
        user.organizationId,
        bounds.previousFrom,
        bounds.previousTo,
      ),
      this.repository.countUsageEventsInRange(
        user.organizationId,
        Meter.DOC_FILLS,
        bounds.currentFrom,
        bounds.currentTo,
      ),
      this.repository.countUsageEventsInRange(
        user.organizationId,
        Meter.DOC_FILLS,
        bounds.previousFrom,
        bounds.previousTo,
      ),
      this.repository.countWorkflowRunsInRange(
        user.organizationId,
        bounds.currentFrom,
        bounds.currentTo,
      ),
      this.repository.countWorkflowRunsInRange(
        user.organizationId,
        bounds.previousFrom,
        bounds.previousTo,
      ),
      this.repository.countPublishedForms(user.organizationId),
      this.repository.countForms(user.organizationId),
      this.repository.countTemplates(user.organizationId),
      this.repository.countMappedTemplates(user.organizationId),
      this.repository.hasAnySubmission(user.organizationId),
      this.repository.hasAnyDocumentFill(user.organizationId),
      this.repository.countWorkflows(user.organizationId),
      canSeeQuarantine ? this.repository.countQuarantined(user.organizationId) : Promise.resolve(0),
      approvalsEnabled
        ? this.repository.countPendingApprovals(user.organizationId)
        : Promise.resolve(0),
      approvalsEnabled
        ? this.repository.listPendingApprovals(user.organizationId, ATTENTION_CAP)
        : Promise.resolve([]),
      this.repository.countFailedRuns(user.organizationId, failSince),
      this.repository.listFailedRuns(user.organizationId, failSince, ATTENTION_CAP),
      canSeeUsage ? this.entitlements.getUsageSummary(user.organizationId) : Promise.resolve(null),
      canSeeTeam ? this.repository.countActiveUsers(user.organizationId) : Promise.resolve(0),
      canSeeTeam ? this.repository.countPendingInvites(user.organizationId) : Promise.resolve(0),
      this.repository.countSubmissionsByDay(
        user.organizationId,
        bounds.currentFrom,
        bounds.currentTo,
      ),
      this.repository.countDocFillsByDay(user.organizationId, bounds.currentFrom, bounds.currentTo),
      this.repository.topFormsBySubmissions(
        user.organizationId,
        bounds.currentFrom,
        bounds.currentTo,
        TOP_FORMS_CAP,
      ),
      canSeeWorkflowHealth
        ? this.repository.countRunsByStatus(
            user.organizationId,
            bounds.currentFrom,
            bounds.currentTo,
            WorkflowRunStatus.COMPLETED,
          )
        : Promise.resolve(0),
      canSeeWorkflowHealth
        ? this.repository.countRunsByStatus(
            user.organizationId,
            bounds.currentFrom,
            bounds.currentTo,
            WorkflowRunStatus.FAILED,
          )
        : Promise.resolve(0),
      canSeeWorkflowHealth
        ? this.repository.countRunsByStatus(
            user.organizationId,
            bounds.currentFrom,
            bounds.currentTo,
            WorkflowRunStatus.PAUSED,
          )
        : Promise.resolve(0),
      canSeeWorkflowHealth
        ? this.repository.listRecentRuns(user.organizationId, RECENT_RUNS_CAP)
        : Promise.resolve([]),
    ]);

    const softLimitHit = usage?.meters.some((m) => m.ratio >= SOFT_LIMIT_RATIO) ?? false;

    const attention = this.buildAttention({
      approvalsEnabled,
      canSeeQuarantine,
      pendingApprovals,
      failedRuns,
      quarantinedCount,
      usage,
    });

    const needsAttention =
      (approvalsEnabled ? pendingApprovalCount : 0) +
      failedRunCount +
      (canSeeQuarantine ? quarantinedCount : 0) +
      (softLimitHit ? 1 : 0);

    const onboardingComplete =
      formCount > 0 &&
      publishedForms > 0 &&
      templateCount > 0 &&
      mappedTemplateCount > 0 &&
      hasSubmission &&
      hasDocumentFill;

    const sub = org.subscription;
    const subscription: SubscriptionSummary | null = sub
      ? {
          planId: sub.planId as PlanId,
          status: sub.status as unknown as SubscriptionSummary['status'],
          trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          billingAnchorDay: sub.billingAnchorDay,
          seats: sub.seats,
          isStripeManaged:
            sub.stripeSubscriptionId !== null && sub.status !== SubscriptionStatus.TRIALING,
        }
      : null;

    return {
      windowDays: days,
      generatedAt: now.toISOString(),
      workspace: {
        name: org.name,
        lifecycleState: org.lifecycleState as OrgLifecycleState,
        purgeScheduledAt: org.purgeScheduledAt?.toISOString() ?? null,
        subscription,
      },
      capabilities: {
        canCreate,
        canManageBilling,
        canSeeUsage,
        canSeeTeam,
        canSeeQuarantine,
        canSeeWorkflowHealth,
        approvalsEnabled,
      },
      pulse: {
        submissions: periodMetric(submissionsCurrent, submissionsPrevious),
        documentFills: periodMetric(fillsCurrent, fillsPrevious),
        workflowRuns: periodMetric(runsCurrent, runsPrevious),
        needsAttention,
        publishedForms,
        publishedFormsLimit: canSeeUsage ? snapshot.definition.limits.activeForms : null,
      },
      attention,
      onboarding: {
        hasForm: formCount > 0,
        hasPublishedForm: publishedForms > 0,
        hasTemplate: templateCount > 0,
        hasMappedTemplate: mappedTemplateCount > 0,
        hasSubmission,
        hasDocumentFill,
        hasWorkflow: workflowCount > 0,
        complete: onboardingComplete,
      },
      series: {
        submissionsByDay: fillDaySeries(submissionsByDayRaw, now, days),
        documentFillsByDay: fillDaySeries(documentFillsByDayRaw, now, days),
      },
      topForms,
      workflowHealth: canSeeWorkflowHealth
        ? {
            completed: runsCompleted,
            failed: runsFailedInWindow,
            paused: runsPaused,
            recentRuns: recentRuns.map((row) => ({
              runId: row.runId,
              workflowId: row.workflowId,
              workflowName: row.workflowName,
              status: row.status,
              startedAt: row.startedAt?.toISOString() ?? null,
              createdAt: row.createdAt.toISOString(),
            })),
          }
        : null,
      usage,
      team: canSeeTeam
        ? {
            seatsUsed,
            seatsLimit: snapshot.definition.limits.maxUsers,
            pendingInvites,
          }
        : null,
    };
  }

  private buildAttention(input: {
    approvalsEnabled: boolean;
    canSeeQuarantine: boolean;
    pendingApprovals: Awaited<ReturnType<DashboardRepository['listPendingApprovals']>>;
    failedRuns: Awaited<ReturnType<DashboardRepository['listFailedRuns']>>;
    quarantinedCount: number;
    usage: Awaited<ReturnType<EntitlementsService['getUsageSummary']>> | null;
  }): DashboardSummary['attention'] {
    const items: Array<DashboardSummary['attention'][number]> = [];

    if (input.approvalsEnabled) {
      for (const row of input.pendingApprovals) {
        items.push({
          id: `approval:${row.id}`,
          kind: 'approval_pending',
          title: `Approval waiting on ${row.assignedTo}`,
          subtitle: row.workflowName,
          href: `/workflows/${row.workflowId}/runs`,
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    for (const row of input.failedRuns) {
      items.push({
        id: `run:${row.id}`,
        kind: 'workflow_failed',
        title: `Workflow failed: ${row.workflowName}`,
        subtitle: row.error ? truncate(row.error, 120) : null,
        href: `/workflows/${row.workflowId}/runs`,
        createdAt: row.createdAt.toISOString(),
      });
    }

    if (input.canSeeQuarantine && input.quarantinedCount > 0) {
      items.push({
        id: 'quarantine',
        kind: 'quarantined',
        title: `${input.quarantinedCount} submission${input.quarantinedCount === 1 ? '' : 's'} over plan limit`,
        subtitle: 'Stored safely — upgrade to release them',
        href: '/billing',
        createdAt: new Date().toISOString(),
      });
    }

    if (input.usage) {
      const hot = input.usage.meters.find((m) => m.ratio >= SOFT_LIMIT_RATIO);
      if (hot) {
        items.push({
          id: `soft:${hot.meter}`,
          kind: 'soft_limit',
          title: `Approaching ${hot.meter.toLowerCase().replace(/_/g, ' ')} limit`,
          subtitle: `${hot.used.toLocaleString()} of ${hot.limit.toLocaleString()} used`,
          href: '/billing',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Urgency order: approvals → failures → quarantine → soft limit
    const rank: Record<(typeof items)[number]['kind'], number> = {
      approval_pending: 0,
      workflow_failed: 1,
      quarantined: 2,
      soft_limit: 3,
    };
    return items
      .sort((a, b) => rank[a.kind] - rank[b.kind] || b.createdAt.localeCompare(a.createdAt))
      .slice(0, ATTENTION_CAP);
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** Dense UTC day series ending today (zeros filled) so sparklines never skip days. */
function fillDaySeries(
  rows: ReadonlyArray<DayCountRow>,
  end: Date,
  windowDays: number,
): DashboardDayCount[] {
  const byDate = new Map(rows.map((r) => [r.date, r.count]));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const out: DashboardDayCount[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(endDay.getTime() - i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return out;
}
