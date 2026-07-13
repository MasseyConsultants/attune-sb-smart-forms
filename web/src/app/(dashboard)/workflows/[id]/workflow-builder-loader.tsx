// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder Page
// Purpose: Client wrapper that dynamic-imports the React Flow builder bundle
// (kept out of the shared chunk) after fetching the workflow.

'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { useWorkflow } from '@/hooks/use-workflows';

const WorkflowBuilder = dynamic(
  () => import('@/components/workflow-builder/workflow-builder').then((m) => m.WorkflowBuilder),
  {
    ssr: false,
    loading: () => <BuilderSkeleton />,
  },
);

function BuilderSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_280px]">
        <Skeleton className="h-[32rem]" />
        <Skeleton className="h-[32rem]" />
        <Skeleton className="h-[32rem]" />
      </div>
    </div>
  );
}

export function WorkflowBuilderLoader({
  workflowId,
}: {
  readonly workflowId: string;
}): React.ReactElement {
  const { data: workflow, isLoading, error } = useWorkflow(workflowId);

  if (isLoading) {
    return <BuilderSkeleton />;
  }

  if (error || !workflow) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Could not load this workflow: {error?.message ?? 'not found'}
      </p>
    );
  }

  // Remount on status flips so canvas editability tracks publish/unpublish.
  return <WorkflowBuilder key={`${workflow.id}-${workflow.status}`} workflow={workflow} />;
}
