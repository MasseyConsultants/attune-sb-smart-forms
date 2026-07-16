// Author: Robert Massey | Created: 2026-07-16 | Module: @attune-sb/shared-types
// Purpose: Platform Ops console contracts (SB-025). PLATFORM_ADMIN-only
// observability surface: system health, RED traffic metrics, structured
// error/security event ledger, queue inspection, webhook log, usage hotspots.

export type OpsEventKind = 'API_ERROR' | 'SECURITY';

export type OpsEventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** Machine-readable event names recorded by the API. */
export const OPS_EVENT_TYPES = [
  'http.5xx',
  'http.unhandled',
  'auth.login_failed',
  'auth.account_locked',
  'auth.refresh_reuse',
  'authz.denied',
  'webhook.signature_failed',
] as const;

export type OpsEventType = (typeof OPS_EVENT_TYPES)[number];

export interface AdminOpsEvent {
  id: string;
  kind: OpsEventKind;
  severity: OpsEventSeverity;
  type: string;
  message: string;
  statusCode: number | null;
  method: string | null;
  path: string | null;
  requestId: string | null;
  organizationId: string | null;
  userId: string | null;
  ip: string | null;
  context: unknown;
  createdAt: string;
}

export interface OpsDependencyStatus {
  healthy: boolean;
  latencyMs: number | null;
}

export interface OpsTrafficMinute {
  /** ISO timestamp truncated to the minute. */
  minute: string;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  avgMs: number;
}

export interface OpsTrafficStats {
  windowMinutes: number;
  requests: number;
  errors4xx: number;
  errors5xx: number;
  /** 5xx / requests over the window; 0 when idle. */
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  perMinute: OpsTrafficMinute[];
}

export interface OpsQueueSnapshot {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: boolean;
}

export interface OpsFailedJob {
  id: string;
  name: string;
  queue: string;
  attemptsMade: number;
  failedReason: string | null;
  data: unknown;
  timestamp: string | null;
}

export interface OpsOverview {
  generatedAt: string;
  system: {
    version: string;
    nodeVersion: string;
    uptimeSec: number;
    memoryHeapUsedBytes: number;
    memoryRssBytes: number;
  };
  dependencies: {
    database: OpsDependencyStatus;
    redis: OpsDependencyStatus;
  };
  traffic: OpsTrafficStats;
  queues: OpsQueueSnapshot[];
  events24h: {
    apiErrors: number;
    security: number;
  };
  business: {
    totalOrgs: number;
    activeOrgs: number;
    newOrgs7d: number;
    submissions24h: number;
    workflowRuns24h: number;
    workflowFailures24h: number;
  };
  recentWorkflowFailures: OpsWorkflowFailure[];
}

export interface OpsWorkflowFailure {
  runId: string;
  workflowId: string;
  workflowName: string;
  organizationId: string;
  organizationName: string;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AdminStripeWebhookEvent {
  id: string;
  type: string;
  processedAt: string;
}

/** An org meter approaching or over its plan limit — support/expansion signal. */
export interface OpsUsageHotspot {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  planId: string;
  meter: string;
  used: number;
  limit: number;
  /** used / limit, capped at 9.99 for display sanity. */
  ratio: number;
  periodEnd: string | null;
}

export interface OpsEventsPage {
  events: AdminOpsEvent[];
  total: number;
}

export interface OpsWebhooksPage {
  events: AdminStripeWebhookEvent[];
  total: number;
}

export interface OpsQueuesResponse {
  queues: OpsQueueSnapshot[];
  failedJobs: OpsFailedJob[];
}
