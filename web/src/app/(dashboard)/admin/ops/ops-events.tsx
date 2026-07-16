// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops

'use client';

import { useState } from 'react';

import { Inbox, Loader2, Search } from 'lucide-react';
import Link from 'next/link';

import type { AdminOpsEvent, OpsEventKind } from '@attune-sb/shared-types';

import { useOpsEvents } from '@/hooks/use-admin-ops';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<string, string> = {
  INFO: 'bg-slate-100 text-slate-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-600 text-white',
};

const PAGE_SIZE = 50;

function EventRow({ event }: { event: AdminOpsEvent }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={() => setExpanded((v) => !v)}>
        <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
          {new Date(event.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              SEVERITY_STYLES[event.severity] ?? 'bg-muted',
            )}
          >
            {event.severity}
          </span>
        </td>
        <td className="px-4 py-2 font-mono text-xs">{event.type}</td>
        <td className="max-w-md truncate px-4 py-2 text-xs" title={event.message}>
          {event.message}
        </td>
        <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-muted-foreground">
          {event.method && event.path ? `${event.method} ${event.path}` : '—'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-4 py-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-mono">{event.statusCode ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Request ID</dt>
                <dd className="font-mono">{event.requestId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Org</dt>
                <dd>
                  {event.organizationId ? (
                    <Link
                      href={`/admin/${event.organizationId}`}
                      className="font-mono text-[var(--brand-primary,#F97316)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {event.organizationId.slice(0, 8)}…
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">User / IP</dt>
                <dd className="font-mono">
                  {event.userId ? `${event.userId.slice(0, 8)}…` : '—'} · {event.ip ?? '—'}
                </dd>
              </div>
            </dl>
            {event.context !== null && event.context !== undefined && (
              <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-[11px]">
                {JSON.stringify(event.context, null, 2)}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function OpsEventsTab(): React.ReactElement {
  const [kind, setKind] = useState<OpsEventKind | ''>('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const events = useOpsEvents({ kind, severity, search, page });

  const total = events.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search message, path, or type…"
            className="w-72 rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as OpsEventKind | '');
            setPage(1);
          }}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All kinds</option>
          <option value="API_ERROR">API errors</option>
          <option value="SECURITY">Security</option>
        </select>
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(1);
          }}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All severities</option>
          {['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
        {events.data && <p className="text-xs text-muted-foreground">{total} events</p>}
      </div>

      {events.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (events.data?.events ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No events match</p>
          <p className="text-xs text-muted-foreground">
            5xx faults and security events (failed logins, lockouts, webhook signature failures)
            land here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Severity</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Message</th>
                  <th className="px-4 py-2.5 font-medium">Request</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(events.data?.events ?? []).map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <button
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
