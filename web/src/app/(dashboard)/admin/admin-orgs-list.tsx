// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin Console

'use client';

import { useState } from 'react';

import { Building2, Loader2, Scale, Search } from 'lucide-react';
import Link from 'next/link';

import { useAdminOrgs } from '@/hooks/use-admin';
import { cn } from '@/lib/utils';

const LIFECYCLE_STATES = ['ACTIVE', 'EXPIRED_TRIAL', 'CANCELED', 'PURGE_PENDING', 'PURGED'];

const STATE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED_TRIAL: 'bg-amber-100 text-amber-700',
  CANCELED: 'bg-slate-200 text-slate-700',
  PURGE_PENDING: 'bg-red-100 text-red-700',
  PURGED: 'bg-red-200 text-red-800',
};

export function AdminOrgsList(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const orgs = useAdminOrgs(search || undefined, state || undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, slug, or member email…"
            className="w-72 rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All lifecycle states</option>
          {LIFECYCLE_STATES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ').toLowerCase()}
            </option>
          ))}
        </select>
        {orgs.data && (
          <p className="text-xs text-muted-foreground">{orgs.data.total} organizations</p>
        )}
      </div>

      {orgs.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (orgs.data?.orgs ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No organizations match</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Organization</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Lifecycle</th>
                <th className="px-4 py-2.5 font-medium">Members</th>
                <th className="px-4 py-2.5 font-medium">Forms</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(orgs.data?.orgs ?? []).map((org) => (
                <tr key={org.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/${org.id}`}
                      className="font-medium hover:text-[var(--brand-primary,#F97316)] hover:underline"
                    >
                      {org.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium capitalize">{org.planId}</span>
                    {org.subscriptionStatus && (
                      <p className="text-[10px] text-muted-foreground">
                        {org.subscriptionStatus.toLowerCase()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATE_STYLES[org.lifecycleState] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {org.lifecycleState.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    {org.legalHold && (
                      <span
                        className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-red-600"
                        title="Legal hold — purge blocked"
                      >
                        <Scale className="h-3 w-3" />
                        hold
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{org.memberCount}</td>
                  <td className="px-4 py-3 tabular-nums">{org.formCount}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
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
