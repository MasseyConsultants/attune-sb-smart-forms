// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflows List

import type { Metadata } from 'next';

import { WorkflowsList } from './workflows-list';

export const metadata: Metadata = { title: 'Workflows' };

export default function WorkflowsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Automate what happens after a form is submitted — fill and email documents, route
          approvals, call webhooks. Publish a workflow and every submission runs it.
        </p>
      </div>
      <WorkflowsList />
    </div>
  );
}
