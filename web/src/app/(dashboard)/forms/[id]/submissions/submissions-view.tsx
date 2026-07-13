// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions View
// Purpose: The data view for a form — paginated table with columns derived
// from the schema, expandable row detail, CSV/XLSX export, delete, and the
// quarantine banner (OVER_LIMIT rows exist but stay hidden until upgrade).

'use client';

import { ArrowLeft, ChevronDown, ChevronRight, Download, Inbox } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';

import type { FieldDefinition } from '@attune-sb/shared-types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from '@/hooks/use-forms';
import {
  exportUrl,
  useDeleteSubmission,
  useSubmissionsList,
  type SubmissionListItem,
} from '@/hooks/use-submissions';

const PAGE_SIZE = 25;

/** Layout-only field types that never carry submission data. */
const LAYOUT_TYPES = new Set(['section', 'pagebreak', 'thankyou']);

/** How many schema columns the table shows before deferring to the detail row. */
const MAX_TABLE_COLUMNS = 4;

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  const text = String(value);
  return text.startsWith('data:') ? '[attachment]' : text;
}

function SubmissionRow({
  submission,
  columns,
  allFields,
  onDelete,
  deleting,
}: {
  readonly submission: SubmissionListItem;
  readonly columns: FieldDefinition[];
  readonly allFields: FieldDefinition[];
  readonly onDelete: (id: string) => void;
  readonly deleting: boolean;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const when = submission.submittedAt ?? submission.createdAt;

  return (
    <Fragment>
      <tr
        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">
          {new Date(when).toLocaleString()}
        </td>
        {columns.map((col) => (
          <td key={col.id} className="max-w-56 truncate px-3 py-2.5 text-sm">
            {formatValue(submission.data[col.id])}
          </td>
        ))}
        <td className="px-3 py-2.5 text-sm text-muted-foreground">v{submission.formVersion}</td>
        <td className="px-3 py-2.5 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={deleting}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Delete this submission? This cannot be undone from the UI.')) {
                onDelete(submission.id);
              }
            }}
          >
            Delete
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/20 last:border-0">
          <td colSpan={columns.length + 4} className="px-6 py-4">
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {allFields.map((field) => (
                <div key={field.id}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {formatValue(submission.data[field.id])}
                  </dd>
                </div>
              ))}
            </dl>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function SubmissionsView({ formId }: { readonly formId: string }): React.ReactElement {
  const [page, setPage] = useState(1);
  const form = useForm(formId);
  const { data, isLoading, error } = useSubmissionsList(formId, page, PAGE_SIZE);
  const deleteSubmission = useDeleteSubmission(formId);

  const dataFields = useMemo(
    () =>
      (form.data?.schema?.fields ?? [])
        .filter((f) => !LAYOUT_TYPES.has(f.type))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [form.data],
  );
  const columns = dataFields.slice(0, MAX_TABLE_COLUMNS);

  if (isLoading || form.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || form.error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Could not load submissions: {(error ?? form.error)?.message}
      </p>
    );
  }

  const submissions = data?.submissions ?? [];
  const total = data?.total ?? 0;
  const quarantined = data?.quarantinedCount ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const hasRows = submissions.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/forms">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Forms
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{form.data?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {total} submission{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={!hasRows}>
            <a href={exportUrl(formId, 'csv')} download>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!hasRows}>
            <a href={exportUrl(formId, 'xlsx')} download>
              <Download className="mr-1 h-4 w-4" />
              Excel
            </a>
          </Button>
        </div>
      </div>

      {quarantined > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">
              {quarantined} submission{quarantined === 1 ? ' was' : 's were'} received over your
              plan limit.
            </span>{' '}
            Nothing was lost — they unlock automatically when you upgrade or your usage resets.
          </p>
          <Button asChild size="sm">
            <Link href="/billing">Upgrade plan</Link>
          </Button>
        </div>
      )}

      {!hasRows ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">No submissions yet</p>
            <p className="text-sm text-muted-foreground">
              Share your public form link to start collecting responses.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  {columns.map((col) => (
                    <th key={col.id} className="px-3 py-2 font-medium">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <SubmissionRow
                    key={submission.id}
                    submission={submission}
                    columns={columns}
                    allFields={dataFields}
                    onDelete={(id) => deleteSubmission.mutate(id)}
                    deleting={deleteSubmission.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
