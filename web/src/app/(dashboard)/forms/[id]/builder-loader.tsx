// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Form Builder Page
// Purpose: Client wrapper that (1) dynamic-imports the heavy builder bundle
// (dnd-kit + form-engine stay out of the shared chunk) and (2) fetches the
// form through TanStack Query before mounting the builder.

'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from '@/hooks/use-forms';

const FormBuilder = dynamic(
  () => import('@/components/builder/form-builder').then((m) => m.FormBuilder),
  {
    ssr: false,
    loading: () => <BuilderSkeleton />,
  },
);

function BuilderSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_300px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export function BuilderLoader({ formId }: { readonly formId: string }): React.ReactElement {
  const { data: form, isLoading, error } = useForm(formId);

  if (isLoading) {
    return <BuilderSkeleton />;
  }

  if (error || !form) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Could not load this form: {error?.message ?? 'not found'}
      </p>
    );
  }

  return <FormBuilder form={form} />;
}
