// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Full plan comparison grid — every card is generated from
// PLAN_ENTITLEMENTS so pricing/limits can never drift from the source of truth.
// Checkout goes through the BFF; the current plan renders as a disabled state.

'use client';

import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import {
  PLAN_ENTITLEMENTS,
  type PaidPlanId,
  type PlanDefinition,
  type PlanId,
} from '@attune-sb/shared-types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCheckout } from '@/hooks/use-billing';
import { cn } from '@/lib/utils';

const PAID_PLAN_IDS: readonly PaidPlanId[] = ['solo', 'growth', 'business'];
const HIGHLIGHTED_PLAN: PaidPlanId = 'growth';

function formatStorage(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
}

function planHighlights(plan: PlanDefinition): string[] {
  const { limits, features } = plan;
  const highlights = [
    `${limits.usersIncluded} seat${limits.usersIncluded === 1 ? '' : 's'} included (up to ${limits.maxUsers})`,
    `${limits.activeForms} published forms`,
    `${limits.submissionsPerMonth.toLocaleString()} submissions/mo`,
    `${limits.docFillsPerMonth.toLocaleString()} document fills/mo`,
    `${limits.workflowRunsPerMonth.toLocaleString()} workflow runs/mo`,
    `${formatStorage(limits.storageBytes)} storage`,
  ];
  if (features.removeBranding) {
    highlights.push('Remove "Powered by" branding');
  }
  if (features.apiAccess !== 'none') {
    highlights.push(features.apiAccess === 'full' ? 'Full REST API' : 'Read-only REST API');
  }
  if (features.privateOrgLibrary) {
    highlights.push('Private template library');
  }
  return highlights;
}

interface PlanGridProps {
  readonly currentPlanId: PlanId;
  readonly interval?: 'monthly' | 'annual';
}

export function PlanGrid({
  currentPlanId,
  interval = 'monthly',
}: PlanGridProps): React.ReactElement {
  const checkout = useCheckout();
  const [pendingPlan, setPendingPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-3">
        {PAID_PLAN_IDS.map((planId) => {
          const plan = PLAN_ENTITLEMENTS[planId];
          const isCurrent = planId === currentPlanId;
          const isHighlighted = planId === HIGHLIGHTED_PLAN;
          const price =
            interval === 'annual' ? `$${plan.priceAnnualUsd}/yr` : `$${plan.priceMonthlyUsd}/mo`;

          return (
            <div
              key={planId}
              data-testid={`plan-card-${planId}`}
              className={cn(
                'flex flex-col rounded-lg border p-5',
                isHighlighted ? 'border-primary shadow-sm' : 'border-border',
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{plan.displayName}</h3>
                {isHighlighted && (
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </Badge>
                )}
                {isCurrent && <Badge variant="secondary">Current plan</Badge>}
              </div>
              <p className="mb-4 text-2xl font-bold text-foreground">{price}</p>
              <ul className="mb-5 flex-1 space-y-2">
                {planHighlights(plan).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant={isHighlighted && !isCurrent ? 'default' : 'outline'}
                disabled={isCurrent || checkout.isPending}
                onClick={() => {
                  setError(null);
                  setPendingPlan(planId);
                  checkout.mutate(
                    { planId, interval },
                    {
                      onError: (e) => setError(e.message),
                      onSettled: () => setPendingPlan(null),
                    },
                  );
                }}
              >
                {pendingPlan === planId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCurrent ? 'Your plan' : `Choose ${plan.displayName}`}
              </Button>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
