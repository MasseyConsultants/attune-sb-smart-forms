// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder Page

import type { Metadata } from 'next';

import { WorkflowBuilderLoader } from './workflow-builder-loader';

export const metadata: Metadata = { title: 'Workflow builder' };

export default async function WorkflowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <WorkflowBuilderLoader workflowId={id} />;
}
