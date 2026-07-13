export type PlanId = 'trial' | 'solo' | 'growth' | 'business';
export declare const PLAN_IDS: readonly PlanId[];
export type PaidPlanId = Exclude<PlanId, 'trial'>;
export declare enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
}
export declare enum OrgLifecycleState {
  ACTIVE = 'ACTIVE',
  EXPIRED_TRIAL = 'EXPIRED_TRIAL',
  CANCELED = 'CANCELED',
  PURGE_PENDING = 'PURGE_PENDING',
  PURGED = 'PURGED',
}
export declare enum Meter {
  SUBMISSIONS = 'SUBMISSIONS',
  DOC_FILLS = 'DOC_FILLS',
  WORKFLOW_RUNS = 'WORKFLOW_RUNS',
  EMAILS = 'EMAILS',
  AI_CREDITS = 'AI_CREDITS',
  STORAGE_BYTES = 'STORAGE_BYTES',
}
export declare const PERIODIC_METERS: readonly Meter[];
export type CountedResource = 'activeForms' | 'uploadedTemplates' | 'users';
export type WorkflowNodeTier = 'core' | 'growth' | 'business';
export interface PlanFeatures {
  readonly apiAccess: 'none' | 'read' | 'full';
  readonly removeBranding: boolean;
  readonly publishOrgTemplates: boolean;
  readonly privateOrgLibrary: boolean;
  readonly workflowNodeTier: WorkflowNodeTier;
}
export interface PlanLimits {
  readonly usersIncluded: number;
  readonly maxUsers: number;
  readonly activeForms: number;
  readonly submissionsPerMonth: number;
  readonly docFillsPerMonth: number;
  readonly uploadedTemplates: number;
  readonly workflowRunsPerMonth: number;
  readonly emailsPerMonth: number;
  readonly aiCreditsPerMonth: number;
  readonly storageBytes: number;
  readonly maxUploadBytes: number;
  readonly apiRateLimitPerMin: number;
  readonly dataRetentionDays: number;
  readonly postExitRetentionDays: number;
}
export interface PlanDefinition {
  readonly id: PlanId;
  readonly displayName: string;
  readonly priceMonthlyUsd: number;
  readonly priceAnnualUsd: number;
  readonly extraSeatUsd: number;
  readonly limits: PlanLimits;
  readonly features: PlanFeatures;
}
export declare const TRIAL_LENGTH_DAYS = 14;
export declare const PLAN_ENTITLEMENTS: Record<PlanId, PlanDefinition>;
export declare function limitForMeter(plan: PlanDefinition, meter: Meter): number;
export declare const SOFT_LIMIT_RATIO = 0.8;
export declare const LIMIT_EXCEEDED_CODE = 'LIMIT_EXCEEDED';
