// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: S1 minimal billing page — current plan, live usage meters, and
// checkout/portal actions. The upgrade URL in LIMIT_EXCEEDED responses points
// here. Full plan comparison + downgrade flows land in S2.

import { CalendarClock } from 'lucide-react';
import type { SubscriptionSummary, UsageSummary } from '@attune-sb/shared-types';

import { apiGet } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BillingActions } from './billing-actions';

const METER_LABELS: Record<string, string> = {
  SUBMISSIONS: 'Form submissions',
  DOC_FILLS: 'Document fills',
  WORKFLOW_RUNS: 'Workflow runs',
  EMAILS: 'Emails sent',
  AI_CREDITS: 'AI credits',
  STORAGE_BYTES: 'Storage',
};

function formatValue(meter: string, value: number): string {
  if (meter === 'STORAGE_BYTES') {
    const mb = value / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  }
  return value.toLocaleString();
}

function MeterBar({
  label,
  used,
  limit,
  ratio,
  meter,
}: {
  label: string;
  used: number;
  limit: number;
  ratio: number;
  meter: string;
}): React.ReactElement {
  const pct = Math.min(100, Math.round(ratio * 100));
  const barColor = ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-primary';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {formatValue(meter, used)} / {formatValue(meter, limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function BillingPage(): Promise<React.ReactElement> {
  const [subscription, usage] = await Promise.all([
    apiGet<SubscriptionSummary>('/billing/subscription'),
    apiGet<UsageSummary>('/billing/usage'),
  ]);

  const planName = subscription
    ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1)
    : '—';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing &amp; usage</h1>
        <p className="text-sm text-muted-foreground">
          Your plan, your usage this period, and upgrade options.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              Current plan
              <Badge variant="secondary" className="capitalize">
                {planName}
              </Badge>
              {subscription?.status && (
                <Badge variant="outline" className="capitalize">
                  {subscription.status.toLowerCase().replace('_', ' ')}
                </Badge>
              )}
            </CardTitle>
          </div>
          {subscription?.trialEndsAt && (
            <CardDescription className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
            </CardDescription>
          )}
          {subscription?.currentPeriodEnd && (
            <CardDescription className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Current period ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <BillingActions isStripeManaged={subscription?.isStripeManaged ?? false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage this period</CardTitle>
          <CardDescription>
            Monthly meters reset on your billing anchor date. Storage is a running total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage ? (
            <>
              {usage.meters.map((m) => (
                <MeterBar
                  key={m.meter}
                  meter={m.meter}
                  label={METER_LABELS[m.meter] ?? m.meter}
                  used={m.used}
                  limit={m.limit}
                  ratio={m.ratio}
                />
              ))}
              <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                <p>
                  <span className="text-muted-foreground">Published forms:</span>{' '}
                  <span className="font-medium">
                    {usage.counted.activeForms.used} / {usage.counted.activeForms.limit}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Templates:</span>{' '}
                  <span className="font-medium">
                    {usage.counted.uploadedTemplates.used} / {usage.counted.uploadedTemplates.limit}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Team seats:</span>{' '}
                  <span className="font-medium">
                    {usage.counted.users.used} / {usage.counted.users.limit}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Usage data is unavailable right now.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
