// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Form Builder
// Purpose: Draggable palette of the 30 field types, grouped by category.
// Fields are added by dragging onto the canvas or by clicking.

'use client';

import { useDraggable } from '@dnd-kit/core';

import { FIELD_DEFINITIONS, type FieldTypeDefinition } from '@attune-sb/form-engine';
import type { FieldType } from '@attune-sb/shared-types';

const CATEGORY_LABELS: Record<FieldTypeDefinition['category'], string> = {
  text: 'Text & Input',
  choice: 'Choices',
  date: 'Date & Time',
  capture: 'Capture',
  calculated: 'Smart',
  layout: 'Layout',
};

const CATEGORY_ORDER: FieldTypeDefinition['category'][] = [
  'text',
  'choice',
  'date',
  'capture',
  'calculated',
  'layout',
];

function PaletteItem({
  definition,
  onAdd,
}: {
  readonly definition: FieldTypeDefinition;
  readonly onAdd: (type: FieldType) => void;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}`,
    data: { from: 'palette', fieldType: definition.type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(definition.type)}
      className={`flex w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 ${
        isDragging ? 'opacity-40' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <span aria-hidden className="w-5 text-center text-sm">
        {definition.icon}
      </span>
      {definition.label}
    </button>
  );
}

export function FieldPalette({
  onAdd,
}: {
  readonly onAdd: (type: FieldType) => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((category) => (
        <div key={category}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[category]}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {FIELD_DEFINITIONS.filter((d) => d.category === category).map((definition) => (
              <PaletteItem key={definition.type} definition={definition} onAdd={onAdd} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
