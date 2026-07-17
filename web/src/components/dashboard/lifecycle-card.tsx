// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { PLAN_ENTITLEMENTS, type DashboardWorkspace } from '@attune-sb/shared-types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

interface LifecycleCardProps {
  readonly workspace: DashboardWorkspace;
  readonly canManageBilling: boolean;
}

export function LifecycleCard({
  workspace,
  canManageBilling,
}: LifecycleCardProps): React.ReactElement {
  const sub = workspace.subscription;
  const onTrial = sub?.status === 'TRIALING' && sub.trialEndsAt;
  const planName = sub ? PLAN_ENTITLEMENTS[sub.planId].displayName : '—';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          {onTrial ? 'Trial status' : 'Subscription'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {onTrial && sub.trialEndsAt ? (
          <>
            <p className="text-3xl font-bold text-foreground">
              {daysLeft(sub.trialEndsAt)} days left
            </p>
            <p className="text-sm text-muted-foreground">
              Growth-tier trial ends{' '}
              {new Date(sub.trialEndsAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
              })}
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-foreground">{planName}</p>
            <p className="text-sm text-muted-foreground">
              Status: {sub?.status?.toLowerCase().replace(/_/g, ' ') ?? 'none'}
            </p>
          </>
        )}
        {canManageBilling && (
          <Button asChild size="sm" variant="outline">
            <Link href="/billing">Manage billing</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
