// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Dashboard
// Purpose: Workspace home — org summary + trial status card (server component).
// Sprint 0 scope: proves the full auth loop and shows the trial clock. Usage
// meters land in S2, form/submission stats in S3/S4.

import { Rocket, CalendarClock, Building2 } from 'lucide-react';

import { apiGet } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface OrgDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly lifecycleState: string;
  readonly createdAt: string;
  readonly subscription: {
    readonly planId: string;
    readonly status: string;
    readonly trialEndsAt: string | null;
    readonly currentPeriodEnd: string | null;
    readonly seats: number;
  } | null;
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}): Promise<React.ReactElement> {
  const [org, params] = await Promise.all([apiGet<OrgDto>('/organizations/me'), searchParams]);
  const isWelcome = params.welcome === '1';
  const sub = org?.subscription ?? null;
  const onTrial = sub?.status === 'TRIALING' && sub.trialEndsAt;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {isWelcome && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">Welcome to Attune Smart Forms!</p>
            <p className="text-sm text-green-700">
              Your workspace is ready and your free trial has started.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">{org ? org.name : 'Your workspace'}</h1>
        <p className="text-sm text-muted-foreground">
          Build a form, publish it, and watch the submissions arrive.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" />
              {onTrial ? 'Trial status' : 'Subscription'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onTrial && sub.trialEndsAt ? (
              <>
                <p className="text-3xl font-bold text-foreground">
                  {daysLeft(sub.trialEndsAt)} days left
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Growth-tier trial ends{' '}
                  {new Date(sub.trialEndsAt).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                  })}
                  . No credit card required until you upgrade.
                </p>
              </>
            ) : sub ? (
              <>
                <p className="text-3xl font-bold capitalize text-foreground">{sub.planId}</p>
                <p className="mt-1 text-sm text-muted-foreground">Status: {sub.status}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{' '}
              <span className="font-medium text-foreground">{org?.name ?? '—'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{' '}
              <span className="font-medium text-foreground">{org?.lifecycleState ?? '—'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{' '}
              <span className="font-medium text-foreground">
                {org ? new Date(org.createdAt).toLocaleDateString() : '—'}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What&apos;s next</CardTitle>
          <CardDescription>
            The form builder, document mapper, and workflow automation are on their way in the next
            sprints. This dashboard will grow as they land.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
