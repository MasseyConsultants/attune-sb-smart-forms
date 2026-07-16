// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops
// Usage hotspots — orgs at ≥70% of a plan meter. Doubles as the expansion
// pipeline (MASTER_PLAN: "which orgs near limits") and a support early-warning.

'use client';

import { Gauge, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { useOpsUsageHotspots } from '@/hooks/use-admin-ops';
import { cn } from '@/lib/utils';

const METER_LABELS: Record<string, string> = {
  SUBMISSIONS: 'Submissions',
  DOC_FILLS: 'Document fills',
  WORKFLOW_RUNS: 'Workflow runs',
  EMAILS: 'Emails',
  AI_CREDITS: 'AI credits',
  STORAGE_BYTES: 'Storage',
};

function formatUsed(meter: string, value: number): string {
  if (meter === 'STORAGE_BYTES') {
    return `${(value / 1024 ** 3).toFixed(2)} GB`;
  }
  return value.toLocaleString();
}

export function OpsUsageTab(): React.ReactElement {
  const { data, isLoading } = useOpsUsageHotspots();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hotspots = data ?? [];

  if (hotspots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
        <Gauge className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No orgs near their limits</p>
        <p className="text-xs text-muted-foreground">
          Orgs at 70% or more of any plan meter appear here — upgrade conversations start early.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Organization</th>
            <th className="px-4 py-2.5 font-medium">Plan</th>
            <th className="px-4 py-2.5 font-medium">Meter</th>
            <th className="px-4 py-2.5 font-medium">Usage</th>
            <th className="px-4 py-2.5 font-medium">Period ends</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {hotspots.map((spot) => {
            const pct = Math.round(spot.ratio * 100);
            const over = spot.ratio >= 1;
            return (
              <tr key={`${spot.organizationId}-${spot.meter}`} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/${spot.organizationId}`}
                    className="font-medium hover:text-[var(--brand-primary,#F97316)] hover:underline"
                  >
                    {spot.organizationName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{spot.organizationSlug}</p>
                </td>
                <td className="px-4 py-3 text-xs font-medium capitalize">{spot.planId}</td>
                <td className="px-4 py-3 text-xs">{METER_LABELS[spot.meter] ?? spot.meter}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          over
                            ? 'bg-red-500'
                            : spot.ratio >= 0.8
                              ? 'bg-amber-500'
                              : 'bg-[var(--brand-primary,#F97316)]',
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        over ? 'font-semibold text-red-600' : 'text-muted-foreground',
                      )}
                    >
                      {formatUsed(spot.meter, spot.used)} / {formatUsed(spot.meter, spot.limit)} (
                      {pct}%)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {spot.periodEnd ? new Date(spot.periodEnd).toLocaleDateString() : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
