// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Submissions
// Purpose: Org-wide data view — every form's submissions in one place with
// form/member filters, search, and CSV export.

import type { Metadata } from 'next';

import { OrgSubmissionsView } from './org-submissions-view';

export const metadata: Metadata = { title: 'Submissions' };

export default function SubmissionsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Submissions</h1>
        <p className="text-sm text-muted-foreground">
          Every submission across your organization&apos;s forms — filter, search, and export.
        </p>
      </div>
      <OrgSubmissionsView />
    </div>
  );
}
