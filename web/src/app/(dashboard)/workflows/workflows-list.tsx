// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflows List
// Purpose: Workflow management — create (with trigger form), open the builder,
// publish/unpublish, runs link, delete. Publish failures from the plan-tier
// node gate render the upgrade prompt instead of a generic error.

'use client';

import { useState } from 'react';

import type { WorkflowSummary } from '@attune-sb/shared-types';
import { WorkflowStatus } from '@attune-sb/shared-types';
import { Activity, Loader2, Pencil, Plus, Trash2, Workflow as WorkflowIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { Button } from '@/components/ui/button';
import { LimitExceededError, useFormsList } from '@/hooks/use-forms';
import { useCreateWorkflow, useDeleteWorkflow, useWorkflowsList } from '@/hooks/use-workflows';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<WorkflowStatus, string> = {
  [WorkflowStatus.DRAFT]: 'bg-slate-100 text-slate-700',
  [WorkflowStatus.PUBLISHED]: 'bg-green-100 text-green-700',
  [WorkflowStatus.ARCHIVED]: 'bg-amber-100 text-amber-700',
};

export function WorkflowsList(): React.ReactElement {
  const router = useRouter();
  const workflows = useWorkflowsList();
  const forms = useFormsList();
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFormId, setNewFormId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState<LimitExceededError | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (): void => {
    if (!newName.trim()) {
      setCreateError('Give the workflow a name');
      return;
    }
    setCreateError(null);
    createWorkflow.mutate(
      { name: newName.trim(), triggerFormId: newFormId || undefined },
      {
        onSuccess: (workflow) => router.push(`/workflows/${workflow.id}`),
        onError: (err) => {
          if (err instanceof LimitExceededError) {
            setLimitHit(err);
          } else {
            setCreateError(err instanceof Error ? err.message : 'Create failed');
          }
        },
      },
    );
  };

  const handleDelete = (workflow: WorkflowSummary): void => {
    if (!window.confirm(`Delete "${workflow.name}"? Past runs stay in the ledger.`)) {
      return;
    }
    setDeletingId(workflow.id);
    deleteWorkflow.mutate(workflow.id, { onSettled: () => setDeletingId(null) });
  };

  if (workflows.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = workflows.data?.workflows ?? [];

  return (
    <div className="space-y-4">
      {limitHit && (
        <UpgradeCta limitLabel="workflows" used={limitHit.current} limit={limitHit.limit} />
      )}

      {/* Create bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
        {showCreate ? (
          <>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Workflow name"
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Trigger form:
              <select
                value={newFormId}
                onChange={(e) => setNewFormId(e.target.value)}
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                <option value="">Choose later</option>
                {(forms.data?.forms ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" onClick={handleCreate} disabled={createWorkflow.isPending}>
              {createWorkflow.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New workflow
            </Button>
            <p className="text-xs text-muted-foreground">
              A workflow runs automatically when its trigger form receives a submission.
            </p>
          </>
        )}
        {createError && <p className="w-full text-xs text-red-500">{createError}</p>}
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <WorkflowIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No workflows yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Build your first automation: when someone submits your intake form, fill your PDF, email
            it to the customer, and notify your team — automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Workflow</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Trigger form</th>
                <th className="px-4 py-2.5 font-medium">Runs</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((workflow) => (
                <tr key={workflow.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/workflows/${workflow.id}`}
                      className="font-medium text-foreground hover:text-[var(--brand-primary,#F97316)] hover:underline"
                    >
                      {workflow.name}
                    </Link>
                    {workflow.description && (
                      <p className="text-xs text-muted-foreground">{workflow.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_STYLES[workflow.status],
                      )}
                    >
                      {workflow.status.toLowerCase()}
                      {workflow.status === WorkflowStatus.PUBLISHED && ` v${workflow.version}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {workflow.triggerFormName ? (
                      <Link
                        href={`/forms/${workflow.triggerFormId}`}
                        className="text-xs text-[var(--brand-primary,#F97316)] hover:underline"
                      >
                        {workflow.triggerFormName}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{workflow.runCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/workflows/${workflow.id}/runs`}>
                          <Activity className="mr-1 h-3.5 w-3.5" />
                          Runs
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Link
                          href={`/workflows/${workflow.id}`}
                          aria-label={`Edit ${workflow.name}`}
                          title="Open in the workflow builder"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(workflow)}
                        disabled={deletingId === workflow.id}
                        aria-label={`Delete ${workflow.name}`}
                        title="Delete this workflow"
                      >
                        {deletingId === workflow.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
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
