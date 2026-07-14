// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Gallery
// Purpose: /gallery — the unauthenticated, SSR template gallery. This is an
// SEO/acquisition surface: visitors browse curated templates by category and
// are routed to signup to use one. Indexable by design (unlike /f/[slug]).

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import type { LibraryTemplateSummary } from '@attune-sb/shared-types';
import { LIBRARY_CATEGORIES, LIBRARY_CATEGORY_LABELS } from '@attune-sb/shared-types';
import { FileText, Workflow } from 'lucide-react';

import { BRAND } from '@/lib/brand';
import { getApiUrl } from '@/lib/get-api-url';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Form Template Gallery — Attune Smart Forms',
  description:
    'Free form templates for small businesses: inspections, client intake, HR, field service, events, and more. Clone one and go live in minutes.',
};

async function fetchTemplates(category?: string): Promise<LibraryTemplateSummary[]> {
  try {
    const params = new URLSearchParams({ pageSize: '100' });
    if (category) params.set('category', category);
    const res = await fetch(`${getApiUrl()}/library?${params}`, {
      next: { revalidate: 300 }, // curated content changes rarely; cache 5 min
    });
    if (!res.ok) return [];
    const envelope = (await res.json()) as {
      success: boolean;
      data: { templates: LibraryTemplateSummary[] };
    };
    return envelope.success ? envelope.data.templates : [];
  } catch {
    return [];
  }
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<React.ReactElement> {
  const { category } = await searchParams;
  const activeCategory = LIBRARY_CATEGORIES.includes(
    category as (typeof LIBRARY_CATEGORIES)[number],
  )
    ? category
    : undefined;
  const templates = await fetchTemplates(activeCategory);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
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
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm font-medium hover:underline">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[var(--brand-primary,#F97316)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Template gallery</h1>
          <p className="text-sm text-muted-foreground">
            Proven forms for small businesses — inspections, intake, HR, field service, and more.
            Clone one into your workspace and publish it in minutes. Some templates include a
            ready-made automation workflow.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Categories">
          <CategoryLink label="All" href="/gallery" active={!activeCategory} />
          {LIBRARY_CATEGORIES.map((cat) => (
            <CategoryLink
              key={cat}
              label={LIBRARY_CATEGORY_LABELS[cat]}
              href={`/gallery?category=${cat}`}
              active={activeCategory === cat}
            />
          ))}
        </nav>

        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-16 text-center text-sm text-muted-foreground">
            The gallery is being stocked — check back shortly.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/gallery/${template.slug}`}
                className="flex flex-col rounded-lg border bg-background p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{template.name}</h2>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {LIBRARY_CATEGORY_LABELS[template.category]}
                  </span>
                </div>
                <p className="mb-3 line-clamp-3 flex-1 text-xs text-muted-foreground">
                  {template.description}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {template.fieldCount} fields
                    {template.pageCount > 1 && ` · ${template.pageCount} pages`}
                  </span>
                  {template.hasWorkflow && (
                    <span className="flex items-center gap-1 text-[var(--brand-primary,#F97316)]">
                      <Workflow className="h-3 w-3" />
                      Includes workflow
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-[var(--brand-primary,#F97316)] text-white'
          : 'bg-background text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </Link>
  );
}
