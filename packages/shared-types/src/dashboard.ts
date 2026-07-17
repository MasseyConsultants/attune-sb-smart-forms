// Author: Robert Massey | Created: 2026-07-16 | Module: @attune-sb/shared-types
// Purpose: Customer workspace home (GET /dashboard/summary) — role-shaped
// decision surface for SMB orgs. See planning/DASHBOARD_PLAN.md (SB-027).

import type { UsageSummary, SubscriptionSummary } from './billing';
import type { OrgLifecycleState } from './plans';

/** Windowed count with prior-window comparison for pulse deltas. */
export interface PeriodMetric {
  readonly current: number;
  readonly previous: number;
}

export type AttentionKind = 'approval_pending' | 'workflow_failed' | 'quarantined' | 'soft_limit';

export interface AttentionItem {
  readonly id: string;
  readonly kind: AttentionKind;
  readonly title: string;
  readonly subtitle: string | null;
  readonly href: string;
  readonly createdAt: string;
}

export interface DashboardOnboarding {
  readonly hasForm: boolean;
  readonly hasPublishedForm: boolean;
  readonly hasTemplate: boolean;
  readonly hasMappedTemplate: boolean;
  readonly hasSubmission: boolean;
  readonly hasDocumentFill: boolean;
  readonly hasWorkflow: boolean;
  /** True when every aha-path step is complete (checklist can hide). */
  readonly complete: boolean;
}

export interface DashboardCapabilities {
  readonly canCreate: boolean;
  readonly canManageBilling: boolean;
  readonly canSeeUsage: boolean;
  readonly canSeeTeam: boolean;
  readonly canSeeQuarantine: boolean;
  /** BUILDER+ — recent workflow run health strip. */
  readonly canSeeWorkflowHealth: boolean;
  /** Growth+ workflow node tier — pending approvals appear only when true. */
  readonly approvalsEnabled: boolean;
}

export interface DashboardWorkspace {
  readonly name: string;
  readonly lifecycleState: OrgLifecycleState;
  readonly purgeScheduledAt: string | null;
  readonly subscription: SubscriptionSummary | null;
}

export interface DashboardTeamSnapshot {
  readonly seatsUsed: number;
  readonly seatsLimit: number;
  readonly pendingInvites: number;
}

export interface DashboardPulse {
  readonly submissions: PeriodMetric;
  readonly documentFills: PeriodMetric;
  readonly workflowRuns: PeriodMetric;
  readonly needsAttention: number;
  readonly publishedForms: number;
  readonly publishedFormsLimit: number | null;
}

/** One UTC calendar day in a sparkline series. */
export interface DashboardDayCount {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
}

export interface DashboardSeries {
  readonly submissionsByDay: ReadonlyArray<DashboardDayCount>;
  readonly documentFillsByDay: ReadonlyArray<DashboardDayCount>;
}

export interface DashboardTopForm {
  readonly formId: string;
  readonly name: string;
  readonly status: string;
  readonly submissionCount: number;
}

export interface DashboardRecentRun {
  readonly runId: string;
  readonly workflowId: string;
  readonly workflowName: string;
  readonly status: string;
  readonly startedAt: string | null;
  readonly createdAt: string;
}

export interface DashboardWorkflowHealth {
  readonly completed: number;
  readonly failed: number;
  readonly paused: number;
  readonly recentRuns: ReadonlyArray<DashboardRecentRun>;
}

export interface DashboardSummary {
  readonly windowDays: number;
  readonly generatedAt: string;
  readonly workspace: DashboardWorkspace;
  readonly capabilities: DashboardCapabilities;
  readonly pulse: DashboardPulse;
  readonly attention: ReadonlyArray<AttentionItem>;
  readonly onboarding: DashboardOnboarding;
  readonly series: DashboardSeries;
  readonly topForms: ReadonlyArray<DashboardTopForm>;
  /** Null for VIEWER — builders+ see run health. */
  readonly workflowHealth: DashboardWorkflowHealth | null;
  readonly usage: UsageSummary | null;
  readonly team: DashboardTeamSnapshot | null;
}
