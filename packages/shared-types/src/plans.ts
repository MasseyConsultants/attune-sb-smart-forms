// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: PLAN_ENTITLEMENTS — the single source of truth for what every plan
// includes. The API's EntitlementsService and the web's useEntitlement() hook both
// read from these constants; limits are NEVER hardcoded anywhere else.
// Tier design source: planning/MASTER_PLAN.md §3 (v1 — validate before launch).

// --- Plan identity ---

export type PlanId = 'trial' | 'solo' | 'growth' | 'business';

export const PLAN_IDS: readonly PlanId[] = ['trial', 'solo', 'growth', 'business'];

// Paid plans only — what Stripe Checkout can sell. 'trial' is never purchasable.
export type PaidPlanId = Exclude<PlanId, 'trial'>;

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
}

export enum OrgLifecycleState {
  ACTIVE = 'ACTIVE',
  EXPIRED_TRIAL = 'EXPIRED_TRIAL',
  CANCELED = 'CANCELED',
  PURGE_PENDING = 'PURGE_PENDING',
  PURGED = 'PURGED',
}

// --- Meters (monthly counters unless noted) ---

export enum Meter {
  SUBMISSIONS = 'SUBMISSIONS',
  DOC_FILLS = 'DOC_FILLS',
  WORKFLOW_RUNS = 'WORKFLOW_RUNS',
  EMAILS = 'EMAILS',
  AI_CREDITS = 'AI_CREDITS',
  // Absolute (not periodic): total blob bytes currently stored by the org.
  STORAGE_BYTES = 'STORAGE_BYTES',
}

// Meters that reset on the org's billing anchor day. STORAGE_BYTES is a level,
// not a flow — it never resets.
export const PERIODIC_METERS: readonly Meter[] = [
  Meter.SUBMISSIONS,
  Meter.DOC_FILLS,
  Meter.WORKFLOW_RUNS,
  Meter.EMAILS,
  Meter.AI_CREDITS,
];

// --- Non-metered caps (checked against live row counts, not UsageCounter) ---

export type CountedResource = 'activeForms' | 'uploadedTemplates' | 'users';

// --- Workflow node tiers ---

export type WorkflowNodeTier = 'core' | 'growth' | 'business';

// --- Boolean feature gates ---

export interface PlanFeatures {
  /** 'none' = no API, 'read' = read-only REST, 'full' = full REST API */
  readonly apiAccess: 'none' | 'read' | 'full';
  /** Remove "Powered by Attune IT Smart Forms" from public forms + emails */
  readonly removeBranding: boolean;
  /** Publish templates visible to the org's own members */
  readonly publishOrgTemplates: boolean;
  /** Private org template library (Business) */
  readonly privateOrgLibrary: boolean;
  /** Highest workflow node tier available */
  readonly workflowNodeTier: WorkflowNodeTier;
}

// --- Numeric limits ---

export interface PlanLimits {
  /** Seats included in the base price */
  readonly usersIncluded: number;
  /** Absolute seat ceiling (base + paid extras) */
  readonly maxUsers: number;
  /** Concurrently published forms */
  readonly activeForms: number;
  readonly submissionsPerMonth: number;
  readonly docFillsPerMonth: number;
  /** Uploaded SmartMapper template documents (absolute count) */
  readonly uploadedTemplates: number;
  readonly workflowRunsPerMonth: number;
  readonly emailsPerMonth: number;
  readonly aiCreditsPerMonth: number;
  readonly storageBytes: number;
  readonly maxUploadBytes: number;
  /** Per-org API rate limit, requests per minute */
  readonly apiRateLimitPerMin: number;
  /** Data retention while subscribed, in days (0 = n/a for trial) */
  readonly dataRetentionDays: number;
  /** Read-only retention window after trial end / cancellation, in days */
  readonly postExitRetentionDays: number;
}

export interface PlanDefinition {
  readonly id: PlanId;
  readonly displayName: string;
  readonly priceMonthlyUsd: number;
  readonly priceAnnualUsd: number;
  /** Price per extra seat per month (0 = extra seats unavailable) */
  readonly extraSeatUsd: number;
  readonly limits: PlanLimits;
  readonly features: PlanFeatures;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const TRIAL_LENGTH_DAYS = 14;

// --- THE source of truth (MASTER_PLAN §3 table) ---

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanDefinition> = {
  // 14 days of the Growth feature set, hard-capped so a trial can never be
  // farmed as a free production account.
  trial: {
    id: 'trial',
    displayName: 'Free Trial',
    priceMonthlyUsd: 0,
    priceAnnualUsd: 0,
    extraSeatUsd: 0,
    limits: {
      usersIncluded: 2,
      maxUsers: 2,
      activeForms: 2,
      submissionsPerMonth: 50,
      docFillsPerMonth: 10,
      uploadedTemplates: 1,
      workflowRunsPerMonth: 50,
      emailsPerMonth: 25,
      aiCreditsPerMonth: 3,
      storageBytes: 250 * MB,
      maxUploadBytes: 5 * MB,
      apiRateLimitPerMin: 30,
      dataRetentionDays: 0,
      postExitRetentionDays: 30,
    },
    features: {
      apiAccess: 'none',
      removeBranding: false,
      publishOrgTemplates: false,
      privateOrgLibrary: false,
      workflowNodeTier: 'core',
    },
  },

  solo: {
    id: 'solo',
    displayName: 'Solo',
    priceMonthlyUsd: 19,
    priceAnnualUsd: 190,
    extraSeatUsd: 5,
    limits: {
      usersIncluded: 1,
      maxUsers: 3,
      activeForms: 5,
      submissionsPerMonth: 500,
      docFillsPerMonth: 50,
      uploadedTemplates: 3,
      workflowRunsPerMonth: 500,
      emailsPerMonth: 200,
      aiCreditsPerMonth: 5,
      storageBytes: 1 * GB,
      maxUploadBytes: 10 * MB,
      apiRateLimitPerMin: 60,
      dataRetentionDays: 365,
      postExitRetentionDays: 60,
    },
    features: {
      apiAccess: 'none',
      removeBranding: false,
      publishOrgTemplates: false,
      privateOrgLibrary: false,
      workflowNodeTier: 'core',
    },
  },

  growth: {
    id: 'growth',
    displayName: 'Growth',
    priceMonthlyUsd: 49,
    priceAnnualUsd: 490,
    extraSeatUsd: 5,
    limits: {
      usersIncluded: 5,
      maxUsers: 10,
      activeForms: 25,
      submissionsPerMonth: 2500,
      docFillsPerMonth: 500,
      uploadedTemplates: 15,
      workflowRunsPerMonth: 2500,
      emailsPerMonth: 1500,
      aiCreditsPerMonth: 25,
      storageBytes: 10 * GB,
      maxUploadBytes: 25 * MB,
      apiRateLimitPerMin: 300,
      dataRetentionDays: 3 * 365,
      postExitRetentionDays: 60,
    },
    features: {
      apiAccess: 'read',
      removeBranding: true,
      publishOrgTemplates: true,
      privateOrgLibrary: false,
      workflowNodeTier: 'growth',
    },
  },

  business: {
    id: 'business',
    displayName: 'Business',
    priceMonthlyUsd: 99,
    priceAnnualUsd: 990,
    extraSeatUsd: 4,
    limits: {
      usersIncluded: 15,
      maxUsers: 30,
      activeForms: 75,
      submissionsPerMonth: 10000,
      docFillsPerMonth: 2000,
      uploadedTemplates: 50,
      workflowRunsPerMonth: 10000,
      emailsPerMonth: 6000,
      aiCreditsPerMonth: 100,
      storageBytes: 50 * GB,
      maxUploadBytes: 50 * MB,
      apiRateLimitPerMin: 1000,
      dataRetentionDays: 7 * 365,
      postExitRetentionDays: 60,
    },
    features: {
      apiAccess: 'full',
      removeBranding: true,
      publishOrgTemplates: true,
      privateOrgLibrary: true,
      workflowNodeTier: 'business',
    },
  },
};

// --- Meter → plan limit resolution ---

export function limitForMeter(plan: PlanDefinition, meter: Meter): number {
  switch (meter) {
    case Meter.SUBMISSIONS:
      return plan.limits.submissionsPerMonth;
    case Meter.DOC_FILLS:
      return plan.limits.docFillsPerMonth;
    case Meter.WORKFLOW_RUNS:
      return plan.limits.workflowRunsPerMonth;
    case Meter.EMAILS:
      return plan.limits.emailsPerMonth;
    case Meter.AI_CREDITS:
      return plan.limits.aiCreditsPerMonth;
    case Meter.STORAGE_BYTES:
      return plan.limits.storageBytes;
    default: {
      const exhaustive: never = meter;
      throw new Error(`Unhandled meter: ${String(exhaustive)}`);
    }
  }
}

// Soft-warn threshold (banner + email) — hard stop happens at 100%.
export const SOFT_LIMIT_RATIO = 0.8;

// Error code carried by 402-style responses when a metered action is blocked.
export const LIMIT_EXCEEDED_CODE = 'LIMIT_EXCEEDED';
