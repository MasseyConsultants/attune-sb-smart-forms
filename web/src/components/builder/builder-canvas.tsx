// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Form Builder
// Purpose: The sortable canvas — one card per field, selectable, reorderable
// via dnd-kit sortable, with a droppable empty state for the first field.

'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

import { getFieldDefinition } from '@attune-sb/form-engine';
import type { FieldDefinition } from '@attune-sb/shared-types';

interface CanvasProps {
  readonly fields: FieldDefinition[];
  readonly selectedFieldId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

function CanvasField({
  field,
  selected,
  onSelect,
  onRemove,
}: {
  readonly field: FieldDefinition;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
  readonly onRemove: (id: string) => void;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { from: 'canvas' },
  });

  const definition = getFieldDefinition(field.type);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded-lg border bg-card p-3 ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border'
      } ${isDragging ? 'z-10 opacity-70 shadow-lg' : ''}`}
      onClick={() => onSelect(field.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(field.id);
        }
      }}
      data-testid={`canvas-field-${field.id}`}
    >
      <span
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...listeners}
        {...attributes}
        aria-label={`Reorder ${field.label}`}
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span aria-hidden className="w-5 text-center text-sm">
        {definition?.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {field.label}
          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {definition?.label ?? field.type} · page {field.page}
          {field.conditionalVisibility?.enabled ? ' · conditional' : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(field.id);
        }}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label={`Delete ${field.label}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BuilderCanvas({
  fields,
  selectedFieldId,
  onSelect,
  onRemove,
}: CanvasProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-dropzone' });

  return (
    <div ref={setNodeRef} className="min-h-[400px] space-y-2" data-testid="builder-canvas">
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {fields.map((field) => (
          <CanvasField
            key={field.id}
            field={field}
            selected={field.id === selectedFieldId}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
      </SortableContext>
      {fields.length === 0 && (
        <div
          className={`flex h-48 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground ${
            isOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          Drag a field here or click one in the palette to get started
        </div>
      )}
    </div>
  );
}
