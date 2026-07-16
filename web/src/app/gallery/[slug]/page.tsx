// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Gallery
// Purpose: /gallery/[slug] — SSR template detail: field-by-field preview and a
// signup CTA (logged-in users clone from the in-app /library instead).

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { LibraryTemplateDetail } from '@attune-sb/shared-types';
import { LIBRARY_CATEGORY_LABELS, LIBRARY_INDUSTRY_TAG_LABELS } from '@attune-sb/shared-types';
import { ArrowLeft, CheckCircle2, FileCheck2, Workflow } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { getApiUrl } from '@/lib/get-api-url';

async function fetchTemplate(slug: string): Promise<LibraryTemplateDetail | null> {
  try {
    const res = await fetch(`${getApiUrl()}/library/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const envelope = (await res.json()) as { success: boolean; data: LibraryTemplateDetail };
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
  const template = await fetchTemplate(slug);
  if (!template) {
    return { title: 'Template not found' };
  }
  return {
    title: `${template.name} — Free Form Template`,
    description: template.description,
  };
}

const LAYOUT_TYPES = new Set(['section', 'pagebreak', 'thankyou']);

export default async function GalleryTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const template = await fetchTemplate(slug);
  if (!template) {
    notFound();
  }

  const inputFields = template.schema.fields.filter((f) => !LAYOUT_TYPES.has(f.type));

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/">
            <Image
              src={BRAND.logoDark}
              alt={BRAND.appName}
              width={150}
              height={30}
              className="object-contain"
              style={{ height: 'auto' }}
              unoptimized
              priority
            />
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-[var(--brand-primary,#F97316)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Start free trial
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to gallery
        </Link>

        <div className="rounded-xl border bg-background p-6 sm:p-8">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {LIBRARY_CATEGORY_LABELS[template.category]}
            </span>
            {(template.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="border-[var(--brand-primary,#F97316)]/25 bg-[var(--brand-primary,#F97316)]/5 rounded-full border px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary,#F97316)]"
              >
                {LIBRARY_INDUSTRY_TAG_LABELS[tag]}
              </span>
            ))}
            {template.hasWorkflow && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary,#F97316)]">
                <Workflow className="h-3 w-3" />
                Includes automation workflow
              </span>
            )}
            {template.hasDocument && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary,#F97316)]">
                <FileCheck2 className="h-3 w-3" />
                Ready-made PDF document
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{template.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/signup?template=${template.slug}`}
              className="rounded-md bg-[var(--brand-primary,#F97316)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Use this template — free
            </Link>
            <p className="text-xs text-muted-foreground">
              14-day free trial, no credit card required. Already have an account? Find it in your{' '}
              <Link href="/library" className="underline">
                template library
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-6 sm:p-8">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            What&apos;s in this template ({inputFields.length} fields
            {template.pageCount > 1 ? `, ${template.pageCount} pages` : ''})
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {inputFields.map((field) => (
              <li key={field.id} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary,#F97316)]" />
                <span>
                  {field.label}
                  <span className="ml-1.5 text-[11px] text-muted-foreground">({field.type})</span>
                </span>
              </li>
            ))}
          </ul>
          {template.workflow && (
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <Workflow className="h-4 w-4 text-[var(--brand-primary,#F97316)]" />
                Bundled workflow: {template.workflow.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                Cloning this template also sets up a {template.workflow.nodes.length}-step
                automation that runs on every submission — customize it in the visual workflow
                builder.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
