// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard

import Link from 'next/link';
import { Users } from 'lucide-react';
import type { DashboardTeamSnapshot } from '@attune-sb/shared-types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TeamSnapshotProps {
  readonly team: DashboardTeamSnapshot;
}

export function TeamSnapshotCard({ team }: TeamSnapshotProps): React.ReactElement {
  const unlimited = team.seatsLimit >= Number.MAX_SAFE_INTEGER / 2;

  return (
    <Card data-testid="team-snapshot">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">
          <span className="text-2xl font-semibold tabular-nums">{team.seatsUsed}</span>
          <span className="text-muted-foreground">
            {' '}
            / {unlimited ? '∞' : team.seatsLimit} seats
          </span>
        </p>
        {team.pendingInvites > 0 && (
          <p className="text-xs text-amber-700">
            {team.pendingInvites} pending invite{team.pendingInvites === 1 ? '' : 's'}
          </p>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href="/team">Manage team</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
