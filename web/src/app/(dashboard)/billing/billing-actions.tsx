// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Stripe Billing Portal launcher for orgs with a paid subscription.
// Plan selection/upgrades live in <PlanGrid>; this only manages existing billing.

'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useBillingPortal } from '@/hooks/use-billing';

export function BillingActions({
  isStripeManaged,
}: {
  readonly isStripeManaged: boolean;
}): React.ReactElement | null {
  const portal = useBillingPortal();
  const [error, setError] = useState<string | null>(null);

  if (!isStripeManaged) {
    return (
      <p className="text-sm text-muted-foreground">
        Pick a plan below to upgrade — your card is handled securely by Stripe.
      </p>
    );
  }

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
