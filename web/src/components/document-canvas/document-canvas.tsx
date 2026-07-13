// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: The mapping studio shell — toolbar (zoom, grid, snap, guides,
// save), field sidebar, and the page viewer. Mappings live in local state
// until "Save mappings" writes them through the BFF; leaving with unsaved
// changes is guarded by a beforeunload prompt.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  DocumentTemplateDetail,
  FieldCoordinateMapping,
  FieldDefinition,
  Form,
  FormSchema,
} from '@attune-sb/shared-types';
import { Check, Grid3x3, Loader2, Magnet, Ruler, Save, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';

import { DocumentFieldSidebar } from './document-field-sidebar';
import { DocumentPageViewer } from './document-page-viewer';

import { useForm } from '@/hooks/use-forms';
import { useSaveMappings } from '@/hooks/use-templates';
import { cn } from '@/lib/utils';

// Layout-only field types never receive submission values.
const UNMAPPABLE_TYPES = new Set(['section', 'pagebreak', 'thankyou']);

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2, 3];
const DEFAULT_ZOOM = 1.5;

function ToggleButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors',
        active
          ? 'border-[var(--brand-primary,#F97316)]/40 bg-[var(--brand-primary,#F97316)]/10 text-[var(--brand-primary,#F97316)]'
          : 'border-border text-muted-foreground hover:bg-muted/50',
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

export function DocumentCanvas({
  template,
}: {
  template: DocumentTemplateDetail;
}): React.ReactElement {
  const [mappings, setMappings] = useState<FieldCoordinateMapping[]>(template.fieldMappings);
  const [dirty, setDirty] = useState(false);
  const [scale, setScale] = useState(DEFAULT_ZOOM);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  const saveMappings = useSaveMappings(template.id);
  const linkedForm = useForm(template.formId ?? '');

  const fields = useMemo((): FieldDefinition[] => {
    if (!template.formId || !linkedForm.data) {
      return [];
    }
    const schema = (linkedForm.data as Form & { schema?: FormSchema }).schema;
    return (schema?.fields ?? []).filter((f) => !UNMAPPABLE_TYPES.has(f.type));
  }, [template.formId, linkedForm.data]);

  const handleMappingsChange = useCallback((next: FieldCoordinateMapping[]) => {
    setMappings(next);
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    saveMappings.mutate(mappings, {
      onSuccess: () => {
        setDirty(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
      },
    });
  }, [mappings, saveMappings]);

  // Warn before navigating away with unsaved mapping changes.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const zoomIndex = ZOOM_LEVELS.indexOf(scale);
  const zoomOut = (): void => {
    if (zoomIndex > 0) {
      setScale(ZOOM_LEVELS[zoomIndex - 1]);
    }
  };
  const zoomIn = (): void => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setScale(ZOOM_LEVELS[zoomIndex + 1]);
    }
  };

  if (!template.formId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
        <p className="text-sm font-medium">This template isn&apos;t linked to a form yet</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Mappings connect a form&apos;s fields to positions on your document. Link the template to
          a form from the templates list, then come back to place fields.
        </p>
        <Link
          href="/templates"
          className="text-xs font-medium text-[var(--brand-primary,#F97316)] hover:underline"
        >
          Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <div className="flex items-center gap-1 rounded-md border">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoomIndex <= 0}
            title="Zoom out"
            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-medium tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
            title="Zoom in"
            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <ToggleButton
          icon={<Grid3x3 className="h-3.5 w-3.5" />}
          label="Grid"
          active={showGrid}
          onClick={() => setShowGrid((v) => !v)}
        />
        <ToggleButton
          icon={<Magnet className="h-3.5 w-3.5" />}
          label="Snap"
          active={snapToGrid}
          onClick={() => setSnapToGrid((v) => !v)}
        />
        <ToggleButton
          icon={<Ruler className="h-3.5 w-3.5" />}
          label="Guides"
          active={showGuides}
          onClick={() => setShowGuides((v) => !v)}
        />

        <div className="ml-auto flex items-center gap-2">
          {saveMappings.isError && (
            <span className="text-xs text-red-500">
              {saveMappings.error instanceof Error ? saveMappings.error.message : 'Save failed'}
            </span>
          )}
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saveMappings.isPending}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-white transition-colors',
              savedFlash
                ? 'bg-green-600'
                : 'bg-[var(--brand-primary,#F97316)] hover:bg-[var(--brand-primary-dark,#EA580C)] disabled:opacity-50',
            )}
          >
            {saveMappings.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : savedFlash ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {savedFlash ? 'Saved' : 'Save mappings'}
          </button>
        </div>
      </div>

      {/* Body: sidebar + canvas */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 border-r bg-background">
          {linkedForm.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DocumentFieldSidebar fields={fields} mappings={mappings} />
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-auto bg-muted/40">
          <DocumentPageViewer
            template={template}
            pdfUrl={`/api/templates/${template.id}/pdf`}
            mappings={mappings}
            onMappingsChange={handleMappingsChange}
            fields={fields}
            scale={scale}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            showGuides={showGuides}
          />
        </main>
      </div>
    </div>
  );
}
