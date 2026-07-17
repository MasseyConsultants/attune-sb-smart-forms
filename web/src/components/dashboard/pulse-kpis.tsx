// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard
// Purpose: Pulse KPI strip — period counts with prior-window delta.

import Link from 'next/link';
import type { DashboardPulse, PeriodMetric } from '@attune-sb/shared-types';

function Delta({ metric }: { metric: PeriodMetric }): React.ReactElement {
  const delta = metric.current - metric.previous;
  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">vs prior period</span>;
  }
  const up = delta > 0;
  return (
    <span className={`text-xs ${up ? 'text-green-700' : 'text-amber-700'}`}>
      {up ? '+' : ''}
      {delta.toLocaleString()} vs prior
    </span>
  );
}

function KpiTile({
  label,
  metric,
  href,
  accent,
}: {
  label: string;
  metric: PeriodMetric;
  href: string;
  accent?: boolean;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 ${
        accent && metric.current > 0 ? 'border-amber-300 bg-amber-50/50' : ''
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {metric.current.toLocaleString()}
      </p>
      <Delta metric={metric} />
    </Link>
  );
}

interface PulseKpisProps {
  readonly pulse: DashboardPulse;
  readonly windowDays: number;
}

export function PulseKpis({ pulse, windowDays }: PulseKpisProps): React.ReactElement {
  return (
    <section aria-label={`Last ${windowDays} days`} className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Last {windowDays} days</h2>
        {pulse.publishedFormsLimit !== null && (
          <p className="text-xs text-muted-foreground">
            Published forms {pulse.publishedForms}/{pulse.publishedFormsLimit}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Submissions" metric={pulse.submissions} href="/submissions" />
        <KpiTile label="Documents filled" metric={pulse.documentFills} href="/templates" />
        <KpiTile label="Workflow runs" metric={pulse.workflowRuns} href="/workflows" />
        <Link
          href="#attention"
          className={`rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 ${
            pulse.needsAttention > 0 ? 'border-amber-300 bg-amber-50/50' : ''
          }`}
        >
          <p className="text-xs text-muted-foreground">Needs attention</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {pulse.needsAttention.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">Approvals, failures, limits</span>
        </Link>
      </div>
    </section>
  );
}
