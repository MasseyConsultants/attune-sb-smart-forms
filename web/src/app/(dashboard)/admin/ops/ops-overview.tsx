// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops

'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import type { OpsOverview } from '@attune-sb/shared-types';

import { useOpsOverview } from '@/hooks/use-admin-ops';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}): React.ReactElement {
  return (
    <div className={cn('rounded-lg border p-4', alert && 'border-red-300 bg-red-50/50')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', alert && 'text-red-700')}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DependencyPill({
  name,
  healthy,
  latencyMs,
}: {
  name: string;
  healthy: boolean;
  latencyMs: number | null;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      {healthy ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-red-600" />
      )}
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-[11px] text-muted-foreground">
          {healthy ? `up · ${latencyMs}ms` : 'unreachable'}
        </p>
      </div>
    </div>
  );
}

function TrafficChart({ overview }: { overview: OpsOverview }): React.ReactElement {
  const minutes = overview.traffic.perMinute;
  const max = Math.max(1, ...minutes.map((m) => m.requests));
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Traffic — last {overview.traffic.windowMinutes} min</p>
        <p className="text-xs text-muted-foreground">
          {overview.traffic.requests} req · p95 {overview.traffic.p95Ms}ms · p99{' '}
          {overview.traffic.p99Ms}ms
        </p>
      </div>
      {minutes.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No traffic recorded yet</p>
      ) : (
        <div className="mt-3 flex h-24 items-end gap-px">
          {minutes.map((m) => (
            <div
              key={m.minute}
              className="group relative flex-1"
              title={`${new Date(m.minute).toLocaleTimeString()} — ${m.requests} req, ${m.errors5xx} 5xx, avg ${m.avgMs}ms`}
            >
              <div
                className={cn(
                  'w-full rounded-t-sm',
                  m.errors5xx > 0 ? 'bg-red-400' : 'bg-[var(--brand-primary,#F97316)]/60',
                )}
                style={{ height: `${Math.max(4, (m.requests / max) * 96)}px` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OpsOverviewTab(): React.ReactElement {
  const { data, isLoading, error } = useOpsOverview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-sm text-red-700">
        Failed to load overview: {error instanceof Error ? error.message : 'unknown error'}
      </div>
    );
  }

  const errorRatePct = (data.traffic.errorRate * 100).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DependencyPill name="PostgreSQL" {...data.dependencies.database} />
        <DependencyPill name="Redis" {...data.dependencies.redis} />
        <StatCard
          label="API uptime"
          value={formatUptime(data.system.uptimeSec)}
          sub={`v${data.system.version} · ${data.system.nodeVersion}`}
        />
        <StatCard
          label="Memory (heap / RSS)"
          value={formatBytes(data.system.memoryHeapUsedBytes)}
          sub={`RSS ${formatBytes(data.system.memoryRssBytes)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Requests (60 min)" value={String(data.traffic.requests)} />
        <StatCard
          label="5xx error rate"
          value={`${errorRatePct}%`}
          sub={`${data.traffic.errors5xx} errors · ${data.traffic.errors4xx} 4xx`}
          alert={data.traffic.errorRate > 0.01}
        />
        <StatCard
          label="API errors (24h)"
          value={String(data.events24h.apiErrors)}
          alert={data.events24h.apiErrors > 0}
        />
        <StatCard
          label="Security events (24h)"
          value={String(data.events24h.security)}
          alert={data.events24h.security > 10}
        />
      </div>

      <TrafficChart overview={data} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Queues</p>
          <div className="space-y-2">
            {data.queues.map((q) => (
              <div key={q.name} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{q.name}</span>
                <span className="text-xs text-muted-foreground">
                  {q.active} active · {q.waiting} waiting ·{' '}
                  <span className={cn(q.failed > 0 && 'font-semibold text-red-600')}>
                    {q.failed} failed
                  </span>
                  {q.paused && <span className="ml-1 text-amber-600">paused</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Business (24h / totals)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums">{data.business.submissions24h}</p>
              <p className="text-[11px] text-muted-foreground">submissions</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{data.business.workflowRuns24h}</p>
              <p className="text-[11px] text-muted-foreground">workflow runs</p>
            </div>
            <div>
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  data.business.workflowFailures24h > 0 && 'text-red-600',
                )}
              >
                {data.business.workflowFailures24h}
              </p>
              <p className="text-[11px] text-muted-foreground">run failures</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{data.business.totalOrgs}</p>
              <p className="text-[11px] text-muted-foreground">orgs</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{data.business.activeOrgs}</p>
              <p className="text-[11px] text-muted-foreground">active</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{data.business.newOrgs7d}</p>
              <p className="text-[11px] text-muted-foreground">new (7d)</p>
            </div>
          </div>
        </div>
      </div>

      {data.recentWorkflowFailures.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <p className="border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            Recent workflow failures
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {data.recentWorkflowFailures.map((f) => (
                <tr key={f.runId} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{f.workflowName}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{f.organizationName}</td>
                  <td
                    className="max-w-xs truncate px-4 py-2 text-xs text-red-600"
                    title={f.error ?? ''}
                  >
                    {f.error ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {f.completedAt ? new Date(f.completedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
