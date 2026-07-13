// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Runs Page

import type { Metadata } from 'next';

import { RunsView } from './runs-view';

export const metadata: Metadata = { title: 'Workflow runs' };

export default async function WorkflowRunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <RunsView workflowId={id} />;
}
