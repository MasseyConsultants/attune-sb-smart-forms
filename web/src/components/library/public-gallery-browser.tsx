// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Public Gallery
// Purpose: Interactive browse for /gallery — search, industry, category, and
// capability filters synced to the URL for shareable/SEO-friendly links.

'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import type { LibraryTemplateSummary } from '@attune-sb/shared-types';
import { FileCheck2, FileText, Loader2, Workflow } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  LibraryBrowseControls,
  TemplateTagChips,
  type LibraryBrowseFilters,
} from '@/components/library/library-browse-controls';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useGalleryTemplates } from '@/hooks/use-library';

function filtersFromParams(params: URLSearchParams): LibraryBrowseFilters {
  return {
    category: params.get('category') ?? '',
    tag: params.get('tag') ?? '',
    search: params.get('search') ?? '',
    hasDocument: params.get('hasDocument') === 'true',
    hasWorkflow: params.get('hasWorkflow') === 'true',
  };
}

function paramsFromFilters(filters: LibraryBrowseFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.hasDocument) params.set('hasDocument', 'true');
  if (filters.hasWorkflow) params.set('hasWorkflow', 'true');
  return params;
}

export function PublicGalleryBrowser(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [filters, setFilters] = useState<LibraryBrowseFilters>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString())),
  );
  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const gallery = useGalleryTemplates({
    category: queryFilters.category || undefined,
    tag: queryFilters.tag || undefined,
    search: queryFilters.search.trim() || undefined,
    hasDocument: queryFilters.hasDocument || undefined,
    hasWorkflow: queryFilters.hasWorkflow || undefined,
  });

  useEffect(() => {
    const next = paramsFromFilters({ ...filters, search: debouncedSearch });
    const qs = next.toString();
    const current = searchParams.toString();
    if (qs === current) return;
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [filters, debouncedSearch, pathname, router, searchParams]);

  const templates = gallery.data?.templates ?? [];
  const total = gallery.data?.total ?? templates.length;

  return (
    <div className="space-y-6">
      <LibraryBrowseControls
        filters={filters}
        onChange={setFilters}
        resultCount={gallery.isLoading ? undefined : templates.length}
        totalCount={gallery.isLoading ? undefined : total}
      />

      {gallery.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-background p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-background p-16 text-center text-sm text-muted-foreground">
          No templates match that filter. Try another industry or clear search.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <GalleryCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryCard({ template }: { template: LibraryTemplateSummary }): React.ReactElement {
  return (
    <Link
      href={`/gallery/${template.slug}`}
      className="flex flex-col rounded-lg border bg-background p-5 transition-shadow hover:shadow-md"
    >
      <TemplateTagChips tags={template.tags ?? []} category={template.category} />
      <h2 className="mb-2 text-sm font-semibold text-foreground">{template.name}</h2>
      <p className="mb-3 line-clamp-3 flex-1 text-xs text-muted-foreground">
        {template.description}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
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
        {template.hasDocument && (
          <span className="flex items-center gap-1 text-[var(--brand-primary,#F97316)]">
            <FileCheck2 className="h-3 w-3" />
            PDF document
          </span>
        )}
      </div>
    </Link>
  );
}
