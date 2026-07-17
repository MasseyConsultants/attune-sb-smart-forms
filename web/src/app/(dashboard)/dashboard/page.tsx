// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Dashboard
// Purpose: Workspace home — role-composed decision surface (SB-027 Phase A+B).

import type { DashboardSummary } from '@attune-sb/shared-types';

import { apiGet } from '@/lib/api-server';
import { DashboardHome } from '@/components/dashboard/dashboard-home';

function parseWindowDays(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 14 || n === 30) return n;
  return 7;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; windowDays?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const windowDays = parseWindowDays(params.windowDays);

  const summary = await apiGet<DashboardSummary>(`/dashboard/summary?windowDays=${windowDays}`);

  if (!summary) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground">Your workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t load your dashboard. Refresh or try again in a moment.
        </p>
      </div>
    );
  }

  return <DashboardHome summary={summary} welcome={params.welcome === '1'} />;
}
