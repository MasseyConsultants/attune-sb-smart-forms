// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard

import Link from 'next/link';
import { FileText } from 'lucide-react';
import type { DashboardTopForm } from '@attune-sb/shared-types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopFormsProps {
  readonly forms: ReadonlyArray<DashboardTopForm>;
  readonly windowDays: number;
}

export function TopForms({ forms, windowDays }: TopFormsProps): React.ReactElement {
  return (
    <Card data-testid="top-forms">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Top forms · {windowDays}d
        </CardTitle>
      </CardHeader>
      <CardContent>
        {forms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions in this window yet.</p>
        ) : (
          <ul className="space-y-2">
            {forms.map((form) => (
              <li key={form.formId}>
                <Link
                  href={`/forms/${form.formId}/submissions`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">{form.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {form.submissionCount.toLocaleString()}
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
