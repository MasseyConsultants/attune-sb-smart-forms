// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard

import Link from 'next/link';
import { Workflow } from 'lucide-react';
import type { DashboardWorkflowHealth } from '@attune-sb/shared-types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function statusTone(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-700';
    case 'FAILED':
      return 'text-red-700';
    case 'PAUSED':
      return 'text-amber-700';
    case 'RUNNING':
    case 'PENDING':
      return 'text-blue-700';
    default:
      return 'text-muted-foreground';
  }
}

interface WorkflowHealthProps {
  readonly health: DashboardWorkflowHealth;
  readonly windowDays: number;
}

export function WorkflowHealthCard({
  health,
  windowDays,
}: WorkflowHealthProps): React.ReactElement {
  return (
    <Card data-testid="workflow-health">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="h-4 w-4 text-primary" />
          Workflow health · {windowDays}d
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border p-2">
            <p className="text-lg font-semibold tabular-nums text-green-700">{health.completed}</p>
            <p className="text-[11px] text-muted-foreground">Completed</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-lg font-semibold tabular-nums text-red-700">{health.failed}</p>
            <p className="text-[11px] text-muted-foreground">Failed</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-lg font-semibold tabular-nums text-amber-700">{health.paused}</p>
            <p className="text-[11px] text-muted-foreground">Paused</p>
          </div>
        </div>

        {health.recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workflow runs yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {health.recentRuns.map((run) => (
              <li key={run.runId}>
                <Link
                  href={`/workflows/${run.workflowId}/runs`}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate text-foreground">{run.workflowName}</span>
                  <span className={`shrink-0 text-xs font-medium ${statusTone(run.status)}`}>
                    {run.status.toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
