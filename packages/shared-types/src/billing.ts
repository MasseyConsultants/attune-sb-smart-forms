// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Billing + usage API contracts (web ↔ API).

import type { Meter, PlanId, SubscriptionStatus } from './plans';

export interface SubscriptionSummary {
  planId: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingAnchorDay: number;
  seats: number;
  /** True when a Stripe subscription backs this row (paid), false for trial */
  isStripeManaged: boolean;
}

export interface MeterUsage {
  meter: Meter;
  used: number;
  limit: number;
  /** 0..1; may exceed 1 for quarantined over-limit intake */
  ratio: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface UsageSummary {
  planId: PlanId;
  meters: MeterUsage[];
  counted: {
    activeForms: { used: number; limit: number };
    uploadedTemplates: { used: number; limit: number };
    users: { used: number; limit: number };
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
