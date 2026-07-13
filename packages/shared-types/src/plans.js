'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.LIMIT_EXCEEDED_CODE =
  exports.SOFT_LIMIT_RATIO =
  exports.PLAN_ENTITLEMENTS =
  exports.TRIAL_LENGTH_DAYS =
  exports.PERIODIC_METERS =
  exports.Meter =
  exports.OrgLifecycleState =
  exports.SubscriptionStatus =
  exports.PLAN_IDS =
    void 0;
exports.limitForMeter = limitForMeter;
exports.PLAN_IDS = ['trial', 'solo', 'growth', 'business'];
var SubscriptionStatus;
(function (SubscriptionStatus) {
  SubscriptionStatus['TRIALING'] = 'TRIALING';
  SubscriptionStatus['ACTIVE'] = 'ACTIVE';
  SubscriptionStatus['PAST_DUE'] = 'PAST_DUE';
  SubscriptionStatus['CANCELED'] = 'CANCELED';
  SubscriptionStatus['PAUSED'] = 'PAUSED';
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var OrgLifecycleState;
(function (OrgLifecycleState) {
  OrgLifecycleState['ACTIVE'] = 'ACTIVE';
  OrgLifecycleState['EXPIRED_TRIAL'] = 'EXPIRED_TRIAL';
  OrgLifecycleState['CANCELED'] = 'CANCELED';
  OrgLifecycleState['PURGE_PENDING'] = 'PURGE_PENDING';
  OrgLifecycleState['PURGED'] = 'PURGED';
})(OrgLifecycleState || (exports.OrgLifecycleState = OrgLifecycleState = {}));
var Meter;
(function (Meter) {
  Meter['SUBMISSIONS'] = 'SUBMISSIONS';
  Meter['DOC_FILLS'] = 'DOC_FILLS';
  Meter['WORKFLOW_RUNS'] = 'WORKFLOW_RUNS';
  Meter['EMAILS'] = 'EMAILS';
  Meter['AI_CREDITS'] = 'AI_CREDITS';
  Meter['STORAGE_BYTES'] = 'STORAGE_BYTES';
})(Meter || (exports.Meter = Meter = {}));
exports.PERIODIC_METERS = [
  Meter.SUBMISSIONS,
  Meter.DOC_FILLS,
  Meter.WORKFLOW_RUNS,
  Meter.EMAILS,
  Meter.AI_CREDITS,
];
const MB = 1024 * 1024;
const GB = 1024 * MB;
exports.TRIAL_LENGTH_DAYS = 14;
exports.PLAN_ENTITLEMENTS = {
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
function limitForMeter(plan, meter) {
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
      const exhaustive = meter;
      throw new Error(`Unhandled meter: ${String(exhaustive)}`);
    }
  }
}
exports.SOFT_LIMIT_RATIO = 0.8;
exports.LIMIT_EXCEEDED_CODE = 'LIMIT_EXCEEDED';
//# sourceMappingURL=plans.js.map
