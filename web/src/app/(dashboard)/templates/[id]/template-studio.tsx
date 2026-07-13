// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Mapping Studio
// Purpose: Client wrapper for the mapping studio — loads the template detail
// and hands off to DocumentCanvas. The canvas itself is dynamically imported
// (pdfjs is heavy and admin-only).

'use client';

import { DocumentTemplateStatus } from '@attune-sb/shared-types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { useTemplate } from '@/hooks/use-templates';

const DocumentCanvas = dynamic(
  () => import('@/components/document-canvas/document-canvas').then((m) => m.DocumentCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export function TemplateStudio({ templateId }: { templateId: string }): React.ReactElement {
  const template = useTemplate(templateId);

  if (template.isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (template.isError || !template.data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-16 text-center">
        <p className="text-sm font-medium">Template not found</p>
        <Link
          href="/templates"
          className="text-xs text-[var(--brand-primary,#F97316)] hover:underline"
        >
          Back to templates
        </Link>
      </div>
    );
  }

  if (template.data.status !== DocumentTemplateStatus.READY) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-16 text-center">
        <p className="text-sm font-medium">This template is {template.data.status.toLowerCase()}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Only successfully processed templates can be mapped. Try re-uploading the document.
        </p>
        <Link
          href="/templates"
          className="text-xs text-[var(--brand-primary,#F97316)] hover:underline"
        >
          Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b bg-background px-4 py-2">
        <Link
          href="/templates"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Templates
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="truncate text-sm font-semibold">{template.data.name}</h1>
        {template.data.formName && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            fills: {template.data.formName}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DocumentCanvas template={template.data} />
      </div>
    </div>
  );
}
