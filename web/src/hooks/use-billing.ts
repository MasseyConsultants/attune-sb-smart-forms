// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing Hooks
// Purpose: Client-side entitlement + usage state, fed by the billing BFF routes.
// useEntitlement() derives boolean gates from PLAN_ENTITLEMENTS by planId — the
// server remains the enforcement authority (the guard denies regardless of what
// the UI shows); per-org overrides surface here only through server responses.

'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  PLAN_ENTITLEMENTS,
  type PlanFeatures,
  type SubscriptionSummary,
  type UsageSummary,
  type CheckoutSessionRequest,
} from '@attune-sb/shared-types';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: { readonly code: string; readonly message: string };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const envelope = (await res.json()) as Envelope<T>;
  if (!res.ok || !envelope.success) {
    throw new Error(envelope.error?.message ?? `Request failed (${res.status})`);
  }
  return envelope.data;
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => fetchJson<SubscriptionSummary>('/api/billing/subscription'),
    staleTime: 60_000,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => fetchJson<UsageSummary>('/api/billing/usage'),
    staleTime: 30_000,
  });
}

/** Boolean/enum feature gate for the current org's plan. Undefined while loading. */
export function useEntitlement<K extends keyof PlanFeatures>(
  feature: K,
): PlanFeatures[K] | undefined {
  const { data } = useSubscription();
  if (!data) {
    return undefined;
  }
  return PLAN_ENTITLEMENTS[data.planId].features[feature];
}

/** Starts Stripe Checkout and redirects the browser to the hosted page. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (request: CheckoutSessionRequest) => {
      const { url } = await fetchJson<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      window.location.assign(url);
    },
  });
}

/** Opens the Stripe Billing Portal for card/plan/cancellation management. */
export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await fetchJson<{ url: string }>('/api/billing/portal', { method: 'POST' });
      window.location.assign(url);
    },
  });
}
