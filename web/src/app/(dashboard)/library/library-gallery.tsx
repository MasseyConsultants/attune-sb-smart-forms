// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library
// Purpose: In-app gallery — curated templates + the org's own, category
// filter, one-click clone into the builder, and "Save as template"
// (publishOrgTemplates gate renders the upgrade prompt on 402).

'use client';

import { useMemo, useState } from 'react';

import type { LibraryTemplateSummary, PublishOrgTemplateRequest } from '@attune-sb/shared-types';
import { LIBRARY_CATEGORIES, LIBRARY_CATEGORY_LABELS } from '@attune-sb/shared-types';
import { Copy, FileText, Layers, Loader2, Search, Trash2, Upload, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { Button } from '@/components/ui/button';
import { LimitExceededError, useFormsList } from '@/hooks/use-forms';
import {
  useCloneTemplate,
  useDeleteOrgTemplate,
  useGalleryTemplates,
  useOrgTemplates,
  usePublishOrgTemplate,
} from '@/hooks/use-library';
import { cn } from '@/lib/utils';

export function LibraryGallery(): React.ReactElement {
  const router = useRouter();
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [publishLimit, setPublishLimit] = useState<LimitExceededError | null>(null);

  const gallery = useGalleryTemplates(category || undefined, search || undefined);
  const orgTemplates = useOrgTemplates();
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

  return (
    <div className="space-y-6">
      {publishLimit && (
        <UpgradeCta
          limitLabel="org templates (Growth plan feature)"
          used={publishLimit.current}
          limit={publishLimit.limit}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryPill label="All" active={category === ''} onClick={() => setCategory('')} />
        {LIBRARY_CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={LIBRARY_CATEGORY_LABELS[cat]}
            active={category === cat}
            onClick={() => setCategory(cat)}
          />
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowPublish(true)}>
          <Upload className="mr-1.5 h-4 w-4" />
          Save a form as template
        </Button>
      </div>

      {cloneError && <p className="text-xs text-red-500">{cloneError}</p>}

      {/* Org templates (when any exist) */}
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

      {/* Curated gallery */}
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
            {(gallery.data?.templates ?? []).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                cloning={cloningId === template.id}
                onClone={() => handleClone(template)}
              />
            ))}
          </div>
        )}
        {!gallery.isLoading && (gallery.data?.templates ?? []).length === 0 && (
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
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {LIBRARY_CATEGORY_LABELS[template.category]}
        </span>
      </div>
      <p className="mb-3 line-clamp-3 flex-1 text-xs text-muted-foreground">
        {template.description}
      </p>
      <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
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
