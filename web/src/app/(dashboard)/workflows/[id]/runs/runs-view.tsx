// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Runs
// Purpose: Run history for one workflow with the per-node step ledger —
// status (SKIPPED_LIMIT gets an upgrade CTA, PAUSED shows who it waits on),
// trigger submission link, duration, error, and output preview per step.

'use client';

import { useState } from 'react';

import type {
  WorkflowRunStatus,
  WorkflowRunStepStatus,
  WorkflowRunSummary,
} from '@attune-sb/shared-types';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  Clock,
  Loader2,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

import { NODE_META } from '@/components/workflow-builder/node-catalog';
import { useWorkflow, useWorkflowRun, useWorkflowRuns } from '@/hooks/use-workflows';
import { cn } from '@/lib/utils';

const RUN_STATUS: Record<
  WorkflowRunStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-slate-100 text-slate-700',
    icon: <Clock className="h-3 w-3" />,
  },
  RUNNING: {
    label: 'Running',
    className: 'bg-blue-100 text-blue-700',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  PAUSED: {
    label: 'Awaiting approval',
    className: 'bg-amber-100 text-amber-800',
    icon: <PauseCircle className="h-3 w-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-3 w-3" />,
  },
  SKIPPED_LIMIT: {
    label: 'Skipped — plan limit',
    className: 'bg-orange-100 text-orange-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  CANCELED: {
    label: 'Canceled',
    className: 'bg-slate-100 text-slate-500',
    icon: <CircleSlash className="h-3 w-3" />,
  },
};

const STEP_STATUS: Record<WorkflowRunStepStatus, string> = {
  COMPLETED: 'text-green-600',
  FAILED: 'text-red-600',
  SKIPPED: 'text-orange-600',
};

function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function RunRow({
  run,
  expanded,
  onToggle,
}: {
  run: WorkflowRunSummary;
  expanded: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const detail = useWorkflowRun(expanded ? run.id : null);
  const status = RUN_STATUS[run.status];

  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-mono text-xs">{run.id.slice(0, 8)}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              status.className,
            )}
          >
            {status.icon}
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3 text-xs tabular-nums">v{run.workflowVersion}</td>
        <td className="px-4 py-3 text-xs">{formatTime(run.createdAt)}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {run.error ? <span className="text-red-600">{run.error}</span> : '—'}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-muted/20 px-6 py-3">
            {run.status === 'SKIPPED_LIMIT' && (
              <p className="mb-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                This run was recorded but not executed — the monthly workflow-run limit was reached.
                The submission itself is safe.{' '}
                <Link href="/billing" className="font-medium underline">
                  Upgrade to raise the limit
                </Link>
                , or wait for the next billing period.
              </p>
            )}
            {detail.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (detail.data?.steps.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">No steps executed.</p>
            ) : (
              <ol className="space-y-1.5">
                {detail.data?.steps.map((step) => {
                  const meta = NODE_META[step.nodeType];
                  return (
                    <li key={step.id} className="flex items-start gap-2 text-xs">
                      <span className={cn('mt-0.5 font-semibold', STEP_STATUS[step.status])}>
                        ●
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{meta?.label ?? step.nodeType}</span>
                        <span className="ml-2 text-muted-foreground">
                          {step.status.toLowerCase()}
                          {step.durationMs !== null && ` · ${step.durationMs} ms`}
                        </span>
                        {step.error && <p className="text-red-600">{step.error}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function RunsView({ workflowId }: { readonly workflowId: string }): React.ReactElement {
  const workflow = useWorkflow(workflowId);
  const runs = useWorkflowRuns(workflowId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = runs.data?.runs ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/workflows/${workflowId}`}
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to builder
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Runs{workflow.data ? ` — ${workflow.data.name}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Every execution with its step-by-step ledger. Refreshes automatically.
        </p>
      </div>

      {runs.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No runs yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Publish the workflow and submit its trigger form — each submission starts a run that
            lands here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Run</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  expanded={expandedId === run.id}
                  onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
