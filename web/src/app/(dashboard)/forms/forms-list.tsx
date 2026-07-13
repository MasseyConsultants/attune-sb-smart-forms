// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms List
// Purpose: Client list of the org's forms with create, duplicate, and delete.
// The submissions column links into each form's data view.

'use client';

import { FileText, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormStatus, type Form } from '@attune-sb/shared-types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateForm, useDeleteForm, useFormsList } from '@/hooks/use-forms';

const STATUS_VARIANT: Record<FormStatus, 'default' | 'secondary' | 'outline'> = {
  [FormStatus.DRAFT]: 'secondary',
  [FormStatus.PUBLISHED]: 'default',
  [FormStatus.ARCHIVED]: 'outline',
};

function FormRow({ form }: { readonly form: Form }): React.ReactElement {
  const deleteForm = useDeleteForm();

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3">
        <Link
          href={`/forms/${form.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {form.name}
        </Link>
        {form.description && (
          <p className="truncate text-xs text-muted-foreground">{form.description}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_VARIANT[form.status]}>{form.status}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">v{form.version}</td>
      <td className="px-4 py-3 text-sm">
        <Link
          href={`/forms/${form.id}/submissions`}
          className="text-muted-foreground hover:text-primary hover:underline"
        >
          {form.submissionCount ?? 0}
        </Link>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={deleteForm.isPending}
          onClick={() => {
            if (window.confirm(`Delete "${form.name}"? This cannot be undone from the UI.`)) {
              deleteForm.mutate(form.id);
            }
          }}
        >
          Delete
        </Button>
      </td>
    </tr>
  );
}

export function FormsList(): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, error } = useFormsList();
  const createForm = useCreateForm();
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = (): void => {
    setCreateError(null);
    createForm.mutate(
      { name: 'Untitled form' },
      {
        onSuccess: (form) => router.push(`/forms/${form.id}`),
        onError: (err) => setCreateError(err.message),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Could not load forms: {error.message}
      </p>
    );
  }

  const forms = data?.forms ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} form{(data?.total ?? 0) === 1 ? '' : 's'}
        </p>
        <Button onClick={handleCreate} disabled={createForm.isPending}>
          {createForm.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          New form
        </Button>
      </div>

      {createError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {createError}
        </p>
      )}

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">No forms yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first form and start collecting responses.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={createForm.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            New form
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Version</th>
                <th className="px-4 py-2 font-medium">Submissions</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <FormRow key={form.id} form={form} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
