// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Form Builder
// Purpose: The builder studio shell — palette | canvas | inspector three-pane
// layout with a live preview toggle, debounced autosave for drafts, and the
// publish flow (LIMIT_EXCEEDED → UpgradeCta upgrade prompt).

'use client';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowLeft, Eye, Hammer, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FormRenderer } from '@attune-sb/form-engine';
import { FormStatus, type FieldType, type Form } from '@attune-sb/shared-types';

import { BuilderCanvas } from './builder-canvas';
import { FieldInspector } from './field-inspector';
import { FieldPalette } from './field-palette';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LimitExceededError, useFormAction, useSaveForm } from '@/hooks/use-forms';
import { useBuilderStore } from '@/stores/builder-store';

const AUTOSAVE_DELAY_MS = 1500;

const STATUS_VARIANT: Record<FormStatus, 'default' | 'secondary' | 'outline'> = {
  [FormStatus.DRAFT]: 'secondary',
  [FormStatus.PUBLISHED]: 'default',
  [FormStatus.ARCHIVED]: 'outline',
};

export function FormBuilder({ form }: { readonly form: Form }): React.ReactElement {
  const store = useBuilderStore();
  const saveForm = useSaveForm(form.id);
  const formAction = useFormAction(form.id);

  const [showPreview, setShowPreview] = useState(false);
  const [limitError, setLimitError] = useState<LimitExceededError | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Hydrate the store once per form id — in an effect so we never call set()
  // during render; the store's formId gates rendering until hydration lands.
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    if (initializedFor.current !== form.id) {
      initializedFor.current = form.id;
      store.initialize(form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store identity is stable
  }, [form.id]);

  const hydrated = store.formId === form.id;
  const isDraft = store.status === FormStatus.DRAFT;

  // Debounced autosave — drafts only; published schemas change via Re-publish.
  useEffect(() => {
    if (!store.dirty || !isDraft) {
      return;
    }
    const timer = setTimeout(() => {
      saveForm.mutate(
        { name: store.name, schema: store.schema() },
        { onSuccess: (saved) => store.markSaved(saved) },
      );
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store identity is stable; fields/name/dirty drive the effect
  }, [store.dirty, store.fields, store.name, store.settings, isDraft]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) {
        return;
      }
      const activeData = active.data.current as
        { from: 'palette'; fieldType: FieldType } | { from: 'canvas' } | undefined;

      if (activeData?.from === 'palette') {
        const overIndex = store.fields.findIndex((f) => f.id === over.id);
        store.addField(activeData.fieldType, overIndex === -1 ? undefined : overIndex);
        return;
      }

      if (activeData?.from === 'canvas' && active.id !== over.id) {
        const fromIndex = store.fields.findIndex((f) => f.id === active.id);
        const toIndex = store.fields.findIndex((f) => f.id === over.id);
        store.moveField(fromIndex, toIndex);
      }
    },
    [store],
  );

  const runAction = (action: 'publish' | 'unpublish' | 'republish'): void => {
    setLimitError(null);
    setActionError(null);
    const body = action === 'republish' ? { schema: store.schema() } : {};
    formAction.mutate(
      { action, body },
      {
        onSuccess: (updated) => store.markSaved(updated),
        onError: (err) => {
          if (err instanceof LimitExceededError) {
            setLimitError(err);
          } else {
            setActionError(err.message);
          }
        },
      },
    );
  };

  const selectedField = store.fields.find((f) => f.id === store.selectedFieldId) ?? null;
  const busy = formAction.isPending;

  if (!hydrated) {
    return <div className="p-6 text-sm text-muted-foreground">Loading builder…</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/forms">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Forms
          </Link>
        </Button>
        <Input
          aria-label="Form name"
          className="w-64 font-medium"
          value={store.name}
          disabled={!isDraft}
          onChange={(e) => store.setName(e.target.value)}
        />
        {store.status && <Badge variant={STATUS_VARIANT[store.status]}>{store.status}</Badge>}
        <span className="text-xs text-muted-foreground">
          v{store.version}
          {isDraft && (store.dirty || saveForm.isPending ? ' · saving…' : ' · saved')}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? (
              <>
                <Hammer className="mr-1 h-4 w-4" /> Build
              </>
            ) : (
              <>
                <Eye className="mr-1 h-4 w-4" /> Preview
              </>
            )}
          </Button>
          {isDraft && (
            <Button size="sm" onClick={() => runAction('publish')} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          )}
          {store.status === FormStatus.PUBLISHED && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAction('unpublish')}
                disabled={busy}
              >
                Unpublish
              </Button>
              <Button size="sm" onClick={() => runAction('republish')} disabled={busy}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Re-publish
              </Button>
            </>
          )}
        </div>
      </div>

      {limitError && (
        <UpgradeCta
          limitLabel="published forms"
          used={limitError.current}
          limit={limitError.limit}
        />
      )}
      {actionError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}
      {store.status === FormStatus.PUBLISHED && !showPreview && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          This form is live. Edits here are local until you press Re-publish (creates version{' '}
          {store.version + 1}) — or Unpublish to edit as a draft.
        </p>
      )}

      {showPreview ? (
        <div className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-card p-6">
          <FormRenderer schema={store.schema()} title={store.name} />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_300px]">
            <aside className="rounded-lg border border-border bg-card p-3">
              <FieldPalette onAdd={(type) => store.addField(type)} />
            </aside>
            <section className="rounded-lg border border-border bg-muted/20 p-4">
              <BuilderCanvas
                fields={store.fields}
                selectedFieldId={store.selectedFieldId}
                onSelect={store.selectField}
                onRemove={store.removeField}
              />
            </section>
            <aside className="rounded-lg border border-border bg-card p-4">
              <FieldInspector
                field={selectedField}
                allFields={store.fields}
                onChange={store.updateField}
              />
            </aside>
          </div>
        </DndContext>
      )}
    </div>
  );
}
