// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Form Fill
// Purpose: /f/[slug] — the unauthenticated, SSR public fill page. The schema is
// fetched server-side (fast first paint, no auth), the interactive renderer
// hydrates client-side. Unknown/unpublished/read-only-org slugs all 404 —
// the API deliberately never distinguishes those cases publicly.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { FormSchema } from '@attune-sb/shared-types';

import { getApiUrl } from '@/lib/get-api-url';

import { PublicFormClient } from './public-form-client';

interface PublicForm {
  formId: string;
  name: string;
  description: string | null;
  version: number;
  schema: FormSchema;
  showBranding: boolean;
}

async function fetchPublicForm(slug: string): Promise<PublicForm | null> {
  try {
    const res = await fetch(`${getApiUrl()}/public/forms/${encodeURIComponent(slug)}`, {
      // Fill pages must reflect a republish quickly, but don't need to hit the
      // API on every visitor: 30 s revalidation window.
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return null;
    }
    const envelope = (await res.json()) as { success: boolean; data: PublicForm };
    return envelope.success ? envelope.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const form = await fetchPublicForm(slug);
  if (!form) {
    return { title: 'Form not found' };
  }
  return {
    title: form.name,
    description: form.description ?? undefined,
    robots: { index: false }, // public ≠ discoverable; slugs are the capability
  };
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const form = await fetchPublicForm(slug);
  if (!form) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/40 py-8 sm:py-14">
      <main className="mx-auto w-full max-w-2xl px-4">
        <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm sm:p-10">
          <PublicFormClient
            slug={slug}
            name={form.name}
            description={form.description}
            schema={form.schema}
            showBranding={form.showBranding}
          />
        </div>
      </main>
    </div>
  );
}
