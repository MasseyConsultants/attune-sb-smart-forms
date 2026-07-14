// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Submissions
// Purpose: Org-wide submissions table. Filters: form, team member (form
// owner), free-text search across values. CSV export follows the active
// filters — a single-form filter uses that form's typed columns, otherwise
// the org-wide export ships values as JSON. Member filter hides itself for
// roles that can't list members (the API returns 403 to non-admins).

'use client';

import { useMemo, useState } from 'react';

import { Download, FileText, Inbox, Loader2, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useFormsList } from '@/hooks/use-forms';
import {
  exportUrl,
  orgExportUrl,
  useOrgSubmissions,
  type OrgSubmissionItem,
  type OrgSubmissionsFilters,
} from '@/hooks/use-submissions';
import { useTeamMembers } from '@/hooks/use-team';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-green-500/10 text-green-600',
  DRAFT: 'bg-muted text-muted-foreground',
  IN_REVIEW: 'bg-amber-500/10 text-amber-600',
  APPROVED: 'bg-green-500/10 text-green-600',
  REJECTED: 'bg-red-500/10 text-red-600',
  OVER_LIMIT: 'bg-red-500/10 text-red-600',
};

function dataPreview(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') continue;
    const rendered = Array.isArray(value)
      ? value.map(String).join(', ')
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    parts.push(`${key}: ${rendered}`);
    if (parts.length >= 3) break;
  }
  return parts.join(' · ') || '—';
}

export function OrgSubmissionsView(): React.ReactElement {
  const [formId, setFormId] = useState('');
  const [createdById, setCreatedById] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filters: OrgSubmissionsFilters = useMemo(
    () => ({
      formId: formId || undefined,
      createdById: createdById || undefined,
      q: query || undefined,
    }),
    [formId, createdById, query],
  );

  const result = useOrgSubmissions(filters, page);
  const forms = useFormsList();
  // 403 for BUILDER/VIEWER — the filter simply doesn't render for them.
  const members = useTeamMembers();

  const rows = result.data?.submissions ?? [];
  const total = result.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 25));

  const applyFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const downloadHref = formId ? exportUrl(formId, 'csv') : orgExportUrl(filters);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQuery(search);
                setPage(1);
              }
            }}
            onBlur={() => {
              setQuery(search);
              setPage(1);
            }}
            placeholder="Search values… (Enter)"
            className="w-64 rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>

        <select
          value={formId}
          aria-label="Filter by form"
          onChange={(e) => applyFilter(setFormId)(e.target.value)}
          className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
        >
          <option value="">All forms</option>
          {(forms.data?.forms ?? []).map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>

        {members.data && (
          <select
            value={createdById}
            aria-label="Filter by team member"
            onChange={(e) => applyFilter(setCreatedById)(e.target.value)}
            className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
          >
            <option value="">All team members</option>
            {members.data.map((member) => (
              <option key={member.id} value={member.id}>
                {member.firstName} {member.lastName}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {total} submission{total === 1 ? '' : 's'}
          </span>
          <Button asChild size="sm" variant="outline" disabled={total === 0}>
            <a href={downloadHref} download>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {(result.data?.quarantinedCount ?? 0) > 0 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          {result.data?.quarantinedCount} submission(s) are held over your plan limit — they become
          visible when your plan has room again.
        </p>
      )}

      {result.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No submissions found</p>
          <p className="text-xs text-muted-foreground">
            {query || formId || createdById
              ? 'Try clearing a filter or broadening the search.'
              : 'Publish a form and share its link to start collecting data.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Form</th>
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row: OrgSubmissionItem) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/forms/${row.formId}/submissions`}
                      className="flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.formName}
                    </Link>
                  </td>
                  <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                    {dataPreview(row.data)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_STYLES[row.status] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
