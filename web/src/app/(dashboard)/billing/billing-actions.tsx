// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Client-side checkout/portal buttons for the S1 minimal billing page.
// Full plan-comparison UI lands in S2.

'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import type { PaidPlanId } from '@attune-sb/shared-types';

import { Button } from '@/components/ui/button';
import { useBillingPortal, useCheckout } from '@/hooks/use-billing';

const PAID_PLANS: ReadonlyArray<{ id: PaidPlanId; label: string; price: string }> = [
  { id: 'solo', label: 'Solo', price: '$19/mo' },
  { id: 'growth', label: 'Growth', price: '$49/mo' },
  { id: 'business', label: 'Business', price: '$99/mo' },
];

export function BillingActions({
  isStripeManaged,
}: {
  readonly isStripeManaged: boolean;
}): React.ReactElement {
  const checkout = useCheckout();
  const portal = useBillingPortal();
  const [error, setError] = useState<string | null>(null);

  if (isStripeManaged) {
    return (
      <div className="space-y-2">
        <Button
          onClick={() => {
            setError(null);
            portal.mutate(undefined, { onError: (e) => setError(e.message) });
          }}
          disabled={portal.isPending}
        >
          {portal.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          Manage billing
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PAID_PLANS.map((plan) => (
          <Button
            key={plan.id}
            variant={plan.id === 'growth' ? 'default' : 'outline'}
            disabled={checkout.isPending}
            onClick={() => {
              setError(null);
              checkout.mutate(
                { planId: plan.id, interval: 'monthly' },
                { onError: (e) => setError(e.message) },
              );
            }}
          >
            {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upgrade to {plan.label} — {plan.price}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
