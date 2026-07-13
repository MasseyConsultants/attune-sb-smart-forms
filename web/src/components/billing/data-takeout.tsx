// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Billing
// Purpose: SB-015 — the export-all entry point. Every form gets CSV + Excel
// takeout links. Deliberately available in read-only mode: export is the last
// thing we ever take away (data lifecycle rule).

import { Download } from 'lucide-react';
import type { Form } from '@attune-sb/shared-types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DataTakeout({ forms }: { readonly forms: Form[] }): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export your data</CardTitle>
        <CardDescription>
          Download every form&apos;s submissions. Exports stay available even if your plan lapses —
          your data is always yours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forms to export yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {forms.map((form) => (
              <li key={form.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{form.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {form.submissionCount ?? 0} submission
                    {(form.submissionCount ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  <a
                    href={`/api/forms/${form.id}/submissions/export?format=csv`}
                    download
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </a>
                  <a
                    href={`/api/forms/${form.id}/submissions/export?format=xlsx`}
                    download
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Excel
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
