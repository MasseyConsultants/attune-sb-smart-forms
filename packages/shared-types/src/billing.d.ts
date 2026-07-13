import type { Meter, PlanId, SubscriptionStatus } from './plans';
export interface SubscriptionSummary {
  planId: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingAnchorDay: number;
  seats: number;
  isStripeManaged: boolean;
}
export interface MeterUsage {
  meter: Meter;
  used: number;
  limit: number;
  ratio: number;
  periodStart: string | null;
  periodEnd: string | null;
}
export interface UsageSummary {
  planId: PlanId;
  meters: MeterUsage[];
  counted: {
    activeForms: {
      used: number;
      limit: number;
    };
    uploadedTemplates: {
      used: number;
      limit: number;
    };
    users: {
      used: number;
      limit: number;
    };
  };
}
export interface CheckoutSessionRequest {
  planId: Exclude<PlanId, 'trial'>;
  interval: 'monthly' | 'annual';
}
export interface CheckoutSessionResponse {
  url: string;
}
export interface PortalSessionResponse {
  url: string;
}
