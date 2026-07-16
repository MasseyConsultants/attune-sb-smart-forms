// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Library
// Purpose: Shared category, industry, capability, and search controls for the
// public gallery and in-app library (SB-029).

'use client';

import {
  LIBRARY_CATEGORIES,
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_INDUSTRY_TAGS,
  LIBRARY_INDUSTRY_TAG_LABELS,
  type LibraryIndustryTag,
  type LibraryTemplateCategory,
} from '@attune-sb/shared-types';
import { FileCheck2, Search, Workflow, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface LibraryBrowseFilters {
  readonly category: string;
  readonly tag: string;
  readonly search: string;
  readonly hasDocument: boolean;
  readonly hasWorkflow: boolean;
}

interface LibraryBrowseControlsProps {
  readonly filters: LibraryBrowseFilters;
  readonly onChange: (next: LibraryBrowseFilters) => void;
  readonly resultCount?: number;
  readonly totalCount?: number;
  readonly className?: string;
}

export function LibraryBrowseControls({
  filters,
  onChange,
  resultCount,
  totalCount,
  className,
}: LibraryBrowseControlsProps): React.ReactElement {
  const set = (patch: Partial<LibraryBrowseFilters>): void => {
    onChange({ ...filters, ...patch });
  };

  const hasActiveFilters =
    Boolean(filters.category) ||
    Boolean(filters.tag) ||
    Boolean(filters.search.trim()) ||
    filters.hasDocument ||
    filters.hasWorkflow;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search by name, description, or industry…"
          aria-label="Search templates"
          className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#F97316)]"
        />
        {filters.search ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => set({ search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-[12rem] space-y-1 text-xs font-medium text-muted-foreground">
          Industry
          <select
            value={filters.tag}
            onChange={(e) => set({ tag: e.target.value })}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm text-foreground"
          >
            <option value="">All industries</option>
            {LIBRARY_INDUSTRY_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {LIBRARY_INDUSTRY_TAG_LABELS[tag]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <CapabilityToggle
            label="PDF document"
            icon={<FileCheck2 className="h-3.5 w-3.5" />}
            active={filters.hasDocument}
            onClick={() => set({ hasDocument: !filters.hasDocument })}
          />
          <CapabilityToggle
            label="Includes workflow"
            icon={<Workflow className="h-3.5 w-3.5" />}
            active={filters.hasWorkflow}
            onClick={() => set({ hasWorkflow: !filters.hasWorkflow })}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  category: '',
                  tag: '',
                  search: '',
                  hasDocument: false,
                  hasWorkflow: false,
                })
              }
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Categories">
        <CategoryPill
          label="All categories"
          active={!filters.category}
          onClick={() => set({ category: '' })}
        />
        {LIBRARY_CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={LIBRARY_CATEGORY_LABELS[cat]}
            active={filters.category === cat}
            onClick={() => set({ category: cat })}
          />
        ))}
      </nav>

      {typeof resultCount === 'number' ? (
        <p className="text-xs text-muted-foreground">
          {resultCount === 0
            ? 'No templates match these filters'
            : typeof totalCount === 'number' && totalCount !== resultCount
              ? `Showing ${resultCount} of ${totalCount} templates`
              : `${resultCount} template${resultCount === 1 ? '' : 's'}`}
        </p>
      ) : null}
    </div>
  );
}

export function TemplateTagChips({
  tags,
  category,
}: {
  readonly tags: readonly LibraryIndustryTag[];
  readonly category: LibraryTemplateCategory;
}): React.ReactElement {
  const visible = tags.slice(0, 2);
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {LIBRARY_CATEGORY_LABELS[category]}
      </span>
      {visible.map((tag) => (
        <span
          key={tag}
          className="border-[var(--brand-primary,#F97316)]/25 bg-[var(--brand-primary,#F97316)]/5 rounded-full border px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary,#F97316)]"
        >
          {LIBRARY_INDUSTRY_TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-[var(--brand-primary,#F97316)] text-white'
          : 'bg-background text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}

function CapabilityToggle({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-[var(--brand-primary,#F97316)]/10 border-[var(--brand-primary,#F97316)] text-[var(--brand-primary,#F97316)]'
          : 'bg-background text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
