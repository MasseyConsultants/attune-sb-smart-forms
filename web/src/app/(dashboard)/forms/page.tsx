// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms List

import type { Metadata } from 'next';

import { FormsList } from './forms-list';

export const metadata: Metadata = { title: 'Forms' };

export default function FormsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Forms</h1>
        <p className="text-sm text-muted-foreground">
          Build, publish, and share forms. Published forms count toward your plan&apos;s cap.
        </p>
      </div>
      <FormsList />
    </div>
  );
}
