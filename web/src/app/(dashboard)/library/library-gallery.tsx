// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library
// Purpose: In-app gallery — curated templates + the org's own, with search,
// industry/category facets, one-click clone, and "Save as template".

'use client';

import { useMemo, useState } from 'react';

import type { LibraryTemplateSummary, PublishOrgTemplateRequest } from '@attune-sb/shared-types';
import { LIBRARY_CATEGORIES, LIBRARY_CATEGORY_LABELS } from '@attune-sb/shared-types';
import {
  Copy,
  FileCheck2,
  FileText,
  Layers,
  Loader2,
  Trash2,
  Upload,
  Workflow,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import {
  LibraryBrowseControls,
  TemplateTagChips,
  type LibraryBrowseFilters,
} from '@/components/library/library-browse-controls';
import { Button } from '@/components/ui/button';
import { LimitExceededError, useFormsList } from '@/hooks/use-forms';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useCloneTemplate,
  useDeleteOrgTemplate,
  useGalleryTemplates,
  useOrgTemplates,
  usePublishOrgTemplate,
} from '@/hooks/use-library';

const EMPTY_FILTERS: LibraryBrowseFilters = {
  category: '',
  tag: '',
  search: '',
  hasDocument: false,
  hasWorkflow: false,
};

export function LibraryGallery(): React.ReactElement {
  const router = useRouter();
  const [filters, setFilters] = useState<LibraryBrowseFilters>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 250);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [publishLimit, setPublishLimit] = useState<LimitExceededError | null>(null);

  const listQuery = {
    category: filters.category || undefined,
    tag: filters.tag || undefined,
    search: debouncedSearch.trim() || undefined,
    hasDocument: filters.hasDocument || undefined,
    hasWorkflow: filters.hasWorkflow || undefined,
  };

  const gallery = useGalleryTemplates(listQuery);
  const orgTemplates = useOrgTemplates(listQuery);
  const cloneTemplate = useCloneTemplate();

  const handleClone = (template: LibraryTemplateSummary): void => {
    setCloningId(template.id);
    setCloneError(null);
    cloneTemplate.mutate(template.id, {
      onSuccess: (result) => router.push(`/forms/${result.formId}`),
      onError: (err) => {
        setCloneError(err instanceof Error ? err.message : 'Clone failed');
        setCloningId(null);
      },
    });
  };

  const orgRows = orgTemplates.data?.templates ?? [];
  const curated = gallery.data?.templates ?? [];
  const curatedTotal = gallery.data?.total ?? curated.length;

  return (
    <div className="space-y-6">
      {publishLimit && (
        <UpgradeCta
          limitLabel="org templates (Growth plan feature)"
          used={publishLimit.current}
          limit={publishLimit.limit}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <LibraryBrowseControls
          className="flex-1"
          filters={filters}
          onChange={setFilters}
          resultCount={gallery.isLoading ? undefined : curated.length}
          totalCount={gallery.isLoading ? undefined : curatedTotal}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPublish(true)}
          className="shrink-0"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Save a form as template
        </Button>
      </div>

      {cloneError && <p className="text-xs text-red-500">{cloneError}</p>}

      {orgRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layers className="h-4 w-4" />
            Your organization&apos;s templates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgRows.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                cloning={cloningId === template.id}
                onClone={() => handleClone(template)}
                deletable
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        {orgRows.length > 0 && (
          <h2 className="text-sm font-semibold text-foreground">Curated templates</h2>
        )}
        {gallery.isLoading ? (
          <div className="flex items-center justify-center rounded-lg border p-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {curated.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                cloning={cloningId === template.id}
                onClone={() => handleClone(template)}
              />
            ))}
          </div>
        )}
        {!gallery.isLoading && curated.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            No templates match that filter.
          </div>
        )}
      </section>

      {showPublish && (
        <PublishTemplateDialog
          onClose={() => setShowPublish(false)}
          onLimit={(err) => {
            setPublishLimit(err);
            setShowPublish(false);
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({
  template,
  cloning,
  onClone,
  deletable,
}: {
  template: LibraryTemplateSummary;
  cloning: boolean;
  onClone: () => void;
  deletable?: boolean;
}): React.ReactElement {
  const deleteTemplate = useDeleteOrgTemplate();

  return (
    <div className="flex flex-col rounded-lg border bg-background p-4 transition-shadow hover:shadow-sm">
      <TemplateTagChips tags={template.tags ?? []} category={template.category} />
      <h3 className="mb-2 text-sm font-semibold text-foreground">{template.name}</h3>
      <p className="mb-3 line-clamp-3 flex-1 text-xs text-muted-foreground">
        {template.description}
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
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
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={onClone} disabled={cloning}>
          {cloning ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Copy className="mr-1.5 h-4 w-4" />
          )}
          Use this template
        </Button>
        {deletable && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${template.name}`}
            onClick={() => {
              if (window.confirm(`Delete the org template "${template.name}"?`)) {
                deleteTemplate.mutate(template.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}

function PublishTemplateDialog({
  onClose,
  onLimit,
}: {
  onClose: () => void;
  onLimit: (err: LimitExceededError) => void;
}): React.ReactElement {
  const forms = useFormsList();
  const publishTemplate = usePublishOrgTemplate();
  const [formId, setFormId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(LIBRARY_CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);

  const selectedForm = useMemo(
    () => (forms.data?.forms ?? []).find((f) => f.id === formId),
    [forms.data, formId],
  );

  const handleSubmit = (): void => {
    if (!formId) {
      setError('Choose a form to publish');
      return;
    }
    setError(null);
    const input: PublishOrgTemplateRequest = {
      formId,
      name: name.trim() || selectedForm?.name || 'Untitled template',
      description: description.trim() || selectedForm?.description || 'Org template',
      category: category as PublishOrgTemplateRequest['category'],
    };
    publishTemplate.mutate(input, {
      onSuccess: onClose,
      onError: (err) => {
        if (err instanceof LimitExceededError) {
          onLimit(err);
        } else {
          setError(err instanceof Error ? err.message : 'Publish failed');
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-lg">
        <div>
          <h2 className="text-base font-semibold">Save a form as an org template</h2>
          <p className="text-xs text-muted-foreground">
            Members of your organization can clone it from this library. Available on Growth and
            Business plans.
          </p>
        </div>
        <label className="block space-y-1 text-xs font-medium">
          Form
          <select
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Choose a form…</option>
            {(forms.data?.forms ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium">
          Template name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selectedForm?.name ?? 'Template name'}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block space-y-1 text-xs font-medium">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block space-y-1 text-xs font-medium">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {LIBRARY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {LIBRARY_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={publishTemplate.isPending}>
            {publishTemplate.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Publish template
          </Button>
        </div>
      </div>
    </div>
  );
}
