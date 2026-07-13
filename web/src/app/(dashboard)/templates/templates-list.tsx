// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Templates List
// Purpose: Template management — upload (with optional form link), status,
// open the mapping studio, delete. LIMIT_EXCEEDED uploads render the upgrade
// prompt instead of a generic error.

'use client';

import { useRef, useState } from 'react';

import type { DocumentTemplateSummary } from '@attune-sb/shared-types';
import { DocumentTemplateStatus } from '@attune-sb/shared-types';
import { FileStack, Loader2, MapPin, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { Button } from '@/components/ui/button';
import { LimitExceededError, useFormsList } from '@/hooks/use-forms';
import { useDeleteTemplate, useTemplatesList, useUploadTemplate } from '@/hooks/use-templates';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<DocumentTemplateStatus, string> = {
  [DocumentTemplateStatus.UPLOADED]: 'bg-slate-100 text-slate-700',
  [DocumentTemplateStatus.PROCESSING]: 'bg-blue-100 text-blue-700',
  [DocumentTemplateStatus.READY]: 'bg-green-100 text-green-700',
  [DocumentTemplateStatus.FAILED]: 'bg-red-100 text-red-700',
};

export function TemplatesList(): React.ReactElement {
  const templates = useTemplatesList();
  const forms = useFormsList();
  const upload = useUploadTemplate();
  const deleteTemplate = useDeleteTemplate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkFormId, setLinkFormId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState<LimitExceededError | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Forms not yet backed by a template — eligible link targets.
  const linkedFormIds = new Set(
    (templates.data ?? []).map((t) => t.formId).filter((id): id is string => id !== null),
  );
  const linkableForms = (forms.data?.forms ?? []).filter((f) => !linkedFormIds.has(f.id));

  const handleFileChosen = (file: File | undefined): void => {
    if (!file) {
      return;
    }
    setUploadError(null);
    setLimitHit(null);
    upload.mutate(
      { file, formId: linkFormId || undefined },
      {
        onError: (err) => {
          if (err instanceof LimitExceededError) {
            setLimitHit(err);
          } else {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
          }
        },
        onSuccess: () => setLinkFormId(''),
      },
    );
    // Allow re-selecting the same file after a failure.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (template: DocumentTemplateSummary): void => {
    if (!window.confirm(`Delete "${template.name}"? Its mappings will be lost.`)) {
      return;
    }
    setDeletingId(template.id);
    deleteTemplate.mutate(template.id, { onSettled: () => setDeletingId(null) });
  };

  if (templates.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = templates.data ?? [];

  return (
    <div className="space-y-4">
      {limitHit && (
        <UpgradeCta
          limitLabel="uploaded templates"
          used={limitHit.current}
          limit={limitHit.limit}
        />
      )}

      {/* Upload bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFileChosen(e.target.files?.[0])}
        />
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          {upload.isPending ? 'Uploading…' : 'Upload PDF or DOCX'}
        </Button>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Link to form:
          <select
            value={linkFormId}
            onChange={(e) => setLinkFormId(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            <option value="">Choose later</option>
            {linkableForms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <p className="text-xs text-muted-foreground">
          Word documents are converted to PDF — complex layouts may shift.
        </p>
        {uploadError && <p className="w-full text-xs text-red-500">{uploadError}</p>}
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
          <FileStack className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No templates yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Upload the paper form you already use — a W-9, an intake sheet, an inspection checklist
            — and map your online form&apos;s fields onto it.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Template</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Pages</th>
                <th className="px-4 py-2.5 font-medium">Linked form</th>
                <th className="px-4 py-2.5 font-medium">Mappings</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((template) => {
                const ready = template.status === DocumentTemplateStatus.READY;
                return (
                  <tr key={template.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {ready ? (
                        <Link
                          href={`/templates/${template.id}`}
                          className="font-medium text-foreground hover:text-[var(--brand-primary,#F97316)] hover:underline"
                        >
                          {template.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-muted-foreground">{template.name}</span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(template.sizeBytes / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-medium',
                          STATUS_STYLES[template.status],
                        )}
                      >
                        {template.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{template.pageCount}</td>
                    <td className="px-4 py-3">
                      {template.formName ? (
                        <Link
                          href={`/forms/${template.formId}`}
                          className="text-xs text-[var(--brand-primary,#F97316)] hover:underline"
                        >
                          {template.formName}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{template.mappingCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {ready && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/templates/${template.id}`}>
                              <MapPin className="mr-1 h-3.5 w-3.5" />
                              Map fields
                            </Link>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(template)}
                          disabled={deletingId === template.id}
                          aria-label={`Delete ${template.name}`}
                        >
                          {deletingId === template.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
