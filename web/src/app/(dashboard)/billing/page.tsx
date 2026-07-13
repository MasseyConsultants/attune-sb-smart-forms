// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Billing & usage page — current plan, live usage meters, and the full
// plan comparison grid. The upgrade URL in LIMIT_EXCEEDED responses points here.

import { CalendarClock } from 'lucide-react';
import type { Form, SubscriptionSummary, UsageSummary } from '@attune-sb/shared-types';
import { PLAN_ENTITLEMENTS } from '@attune-sb/shared-types';

import { apiGet } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTakeout } from '@/components/billing/data-takeout';
import { MeterBar } from '@/components/billing/meter-bar';
import { OverCapPicker } from '@/components/billing/over-cap-picker';
import { PlanGrid } from '@/components/billing/plan-grid';
import { BillingActions } from './billing-actions';

export default async function BillingPage(): Promise<React.ReactElement> {
  const [subscription, usage, formsPage] = await Promise.all([
    apiGet<SubscriptionSummary>('/billing/subscription'),
    apiGet<UsageSummary>('/billing/usage'),
    apiGet<{ forms: Form[]; total: number }>('/forms?pageSize=100'),
  ]);
  const forms = formsPage?.forms ?? [];

  const planName = subscription ? PLAN_ENTITLEMENTS[subscription.planId].displayName : '—';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
              <Badge variant="secondary">{planName}</Badge>
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

      {usage && <OverCapPicker forms={forms} limit={usage.counted.activeForms.limit} />}

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

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Plans</h2>
        <PlanGrid currentPlanId={subscription?.planId ?? 'trial'} />
      </div>

      <DataTakeout forms={forms} />
    </div>
  );
}
