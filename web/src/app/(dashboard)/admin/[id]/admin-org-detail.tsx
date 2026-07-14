// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin Console
// Purpose: One org for support: subscription, meters, members, entitlement
// overrides, and lifecycle actions (legal hold, restore).

'use client';

import { useState } from 'react';

import type { AdminOrgDetail } from '@attune-sb/shared-types';
import { ArrowLeft, Loader2, RotateCcw, Scale, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  useAdminOrg,
  useCreateOverride,
  useDeleteOverride,
  useRestoreOrg,
  useSetLegalHold,
} from '@/hooks/use-admin';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function AdminOrgDetailView({ orgId }: { orgId: string }): React.ReactElement {
  const org = useAdminOrg(orgId);

  if (org.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!org.data) {
    return (
      <div className="rounded-lg border border-dashed p-16 text-center text-sm text-muted-foreground">
        Organization not found.
      </div>
    );
  }

  const data = org.data;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All organizations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-xs text-muted-foreground">
            {data.slug} · created {new Date(data.createdAt).toLocaleDateString()} · plan{' '}
            <span className="font-medium capitalize">{data.planId}</span>
            {data.subscriptionStatus && ` (${data.subscriptionStatus.toLowerCase()})`} · state{' '}
            <span className="font-medium">
              {data.lifecycleState.replace(/_/g, ' ').toLowerCase()}
            </span>
            {data.purgeScheduledAt &&
              ` · purge ${new Date(data.purgeScheduledAt).toLocaleDateString()}`}
          </p>
        </div>
        <OrgActions data={data} />
      </div>

      {/* Usage */}
      <section className="rounded-lg border">
        <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Usage this period
        </h2>
        <div className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-3">
          {data.usage.meters.map((meter) => (
            <UsageRow
              key={meter.meter}
              label={meter.meter.toLowerCase().replace(/_/g, ' ')}
              used={meter.used}
              limit={meter.limit}
              isBytes={meter.meter === 'STORAGE_BYTES'}
            />
          ))}
          <UsageRow
            label="active forms"
            used={data.usage.counted.activeForms.used}
            limit={data.usage.counted.activeForms.limit}
          />
          <UsageRow
            label="uploaded templates"
            used={data.usage.counted.uploadedTemplates.used}
            limit={data.usage.counted.uploadedTemplates.limit}
          />
          <UsageRow
            label="users"
            used={data.usage.counted.users.used}
            limit={data.usage.counted.users.limit}
          />
        </div>
        <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          {data.counts.submissions} submissions · {data.counts.documentTemplates} doc templates ·{' '}
          {data.counts.workflows} workflows · {data.counts.workflowRuns} runs (all-time)
        </div>
      </section>

      {/* Members */}
      <section className="overflow-hidden rounded-lg border">
        <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Members ({data.members.length})
        </h2>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {data.members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-2.5">
                  <span className="font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">{member.email}</span>
                </td>
                <td className="px-4 py-2.5 text-xs">{member.role}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {member.isActive ? 'active' : 'inactive'}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                  {member.lastLoginAt
                    ? `last login ${new Date(member.lastLoginAt).toLocaleDateString()}`
                    : 'never logged in'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <OverridesSection data={data} orgId={orgId} />
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit,
  isBytes,
}: {
  label: string;
  used: number;
  limit: number;
  isBytes?: boolean;
}): React.ReactElement {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {isBytes ? formatBytes(used) : used.toLocaleString()} /{' '}
          {isBytes ? formatBytes(limit) : limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OrgActions({ data }: { data: AdminOrgDetail }): React.ReactElement {
  const setLegalHold = useSetLegalHold(data.id);
  const restore = useRestoreOrg(data.id);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={data.legalHold ? 'destructive' : 'outline'}
        onClick={() => setLegalHold.mutate(!data.legalHold)}
        disabled={setLegalHold.isPending}
      >
        <Scale className="mr-1.5 h-3.5 w-3.5" />
        {data.legalHold ? 'Clear legal hold' : 'Set legal hold'}
      </Button>
      {data.lifecycleState !== 'ACTIVE' && data.lifecycleState !== 'PURGED' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (window.confirm(`Restore "${data.name}" to ACTIVE?`)) {
              restore.mutate();
            }
          }}
          disabled={restore.isPending}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restore to active
        </Button>
      )}
    </div>
  );
}

function OverridesSection({
  data,
  orgId,
}: {
  data: AdminOrgDetail;
  orgId: string;
}): React.ReactElement {
  const createOverride = useCreateOverride(orgId);
  const deleteOverride = useDeleteOverride(orgId);
  const [entitlement, setEntitlement] = useState('');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (): void => {
    if (!entitlement.trim() || !value.trim() || !reason.trim()) {
      setError('Entitlement key, value, and reason are all required');
      return;
    }
    setError(null);
    // Coerce: numbers stay numeric, true/false become booleans, rest strings.
    const raw = value.trim();
    const parsed: number | boolean | string =
      raw === 'true'
        ? true
        : raw === 'false'
          ? false
          : Number.isFinite(Number(raw)) && raw !== ''
            ? Number(raw)
            : raw;
    createOverride.mutate(
      { entitlement: entitlement.trim(), value: parsed, reason: reason.trim() },
      {
        onSuccess: () => {
          setEntitlement('');
          setValue('');
          setReason('');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Create failed'),
      },
    );
  };

  return (
    <section className="rounded-lg border">
      <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Entitlement overrides
      </h2>
      {data.overrides.length > 0 && (
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {data.overrides.map((override) => (
              <tr key={override.id}>
                <td className="px-4 py-2.5 font-mono text-xs">{override.entitlement}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{JSON.stringify(override.value)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{override.reason}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {override.expiresAt
                    ? `expires ${new Date(override.expiresAt).toLocaleDateString()}`
                    : 'permanent'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete override ${override.entitlement}`}
                    onClick={() => deleteOverride.mutate(override.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 p-3">
        <input
          value={entitlement}
          onChange={(e) => setEntitlement(e.target.value)}
          placeholder="entitlement (e.g. submissionsPerMonth)"
          className="w-64 rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="value (e.g. 1000, true, growth)"
          className="w-44 rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="reason (required)"
          className="w-44 rounded-md border bg-background px-2.5 py-1.5 text-xs"
        />
        <Button size="sm" onClick={handleCreate} disabled={createOverride.isPending}>
          {createOverride.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Add override
        </Button>
        {error && <p className="w-full text-xs text-red-500">{error}</p>}
      </div>
    </section>
  );
}
