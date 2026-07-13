// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Billing
// Purpose: SB-014 — the downgrade form picker. When an org has more published
// forms than the plan allows (downgrade left them over cap), nothing is
// auto-unpublished; this card asks the org to choose which forms stay live.
// New publishes stay blocked by the activeForms gate until they're at/under cap.

'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { FormStatus, type Form } from '@attune-sb/shared-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormAction } from '@/hooks/use-forms';

function UnpublishButton({
  formId,
  onDone,
}: {
  readonly formId: string;
  readonly onDone: () => void;
}): React.ReactElement {
  const action = useFormAction(formId);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={action.isPending || action.isSuccess}
      onClick={() => action.mutate({ action: 'unpublish' }, { onSuccess: onDone })}
    >
      {action.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
      {action.isSuccess ? 'Unpublished' : 'Unpublish'}
    </Button>
  );
}

export function OverCapPicker({
  forms,
  limit,
}: {
  readonly forms: Form[];
  readonly limit: number;
}): React.ReactElement | null {
  // Local set so the card updates as forms are unpublished without a reload.
  const [unpublishedIds, setUnpublishedIds] = useState<ReadonlySet<string>>(new Set());
  const published = forms.filter((f) => f.status === FormStatus.PUBLISHED);
  const overBy = published.length - unpublishedIds.size - limit;

  if (published.length === 0 || overBy <= 0) {
    return null;
  }

  return (
    <Card className="border-amber-300 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          More live forms than your plan allows
        </CardTitle>
        <CardDescription className="text-amber-800">
          Your plan includes {limit} published form{limit === 1 ? '' : 's'}, but {published.length}{' '}
          are live. Nothing was unpublished automatically — choose {overBy} to take offline (they
          keep all their data), or upgrade to keep everything live. New publishes are paused until
          you&apos;re within the limit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-amber-200/70">
          {published.map((form) => (
            <li key={form.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link
                  href={`/forms/${form.id}`}
                  className="truncate text-sm font-medium text-foreground hover:underline"
                >
                  {form.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {form.submissionCount ?? 0} submission
                  {(form.submissionCount ?? 0) === 1 ? '' : 's'} · v{form.version}
                </p>
              </div>
              <UnpublishButton
                formId={form.id}
                onDone={() => setUnpublishedIds((ids) => new Set([...ids, form.id]))}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
