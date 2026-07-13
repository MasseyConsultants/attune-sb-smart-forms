// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: Sidebar of mappable form fields, ported from enterprise. Fields
// drag onto the canvas; option-bearing fields (yesno, radio, select, ...)
// expand into per-option draggable sub-rows so each option position can be
// placed independently.

'use client';

import { useState } from 'react';

import type { FieldCoordinateMapping, FieldDefinition } from '@attune-sb/shared-types';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, GripVertical } from 'lucide-react';

import { mappingKey } from './canvas-utils';

import { cn } from '@/lib/utils';

interface DocumentFieldSidebarProps {
  fields: FieldDefinition[];
  mappings: FieldCoordinateMapping[];
}

interface OptionRow {
  value: string;
  label: string;
  color: string;
}

const YESNO_TYPES = new Set(['yesno', 'toggle']);
const CHOICE_TYPES = new Set(['radio', 'select', 'dropdown', 'checkbox', 'multiselect']);

const YESNO_OPTIONS: OptionRow[] = [
  { value: 'yes', label: 'Yes', color: 'text-green-600 dark:text-green-400' },
  { value: 'no', label: 'No', color: 'text-red-600 dark:text-red-400' },
  { value: 'na', label: 'N/A', color: 'text-amber-600 dark:text-amber-400' },
];

const CHOICE_COLOR = 'text-blue-600 dark:text-blue-400';

/** Normalise config.options (string[] | {label,value}[]) into OptionRow[]. */
function normalizeFieldOptions(raw: unknown): OptionRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((o) => {
    if (typeof o === 'string') {
      return { value: o, label: o, color: CHOICE_COLOR };
    }
    const obj = o as { value?: string; label?: string };
    const value = String(obj.value ?? obj.label ?? '');
    return { value, label: String(obj.label ?? obj.value ?? value), color: CHOICE_COLOR };
  });
}

function getFieldOptions(field: FieldDefinition): OptionRow[] | null {
  if (YESNO_TYPES.has(field.type)) {
    return YESNO_OPTIONS;
  }
  if (CHOICE_TYPES.has(field.type)) {
    const opts = normalizeFieldOptions(field.config?.options);
    return opts.length > 0 ? opts : null;
  }
  return null;
}

export function DocumentFieldSidebar({
  fields,
  mappings,
}: DocumentFieldSidebarProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const mappedKeys = new Set(mappings.map(mappingKey));
  const totalSlots = fields.reduce((acc, f) => {
    const opts = getFieldOptions(f);
    return acc + (opts ? opts.length : 1);
  }, 0);
  const mappedCount = mappings.length;

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-3">
        <p className="text-xs font-semibold text-foreground">Form fields</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Drag a field onto a page to place it
        </p>
      </div>

      <div className="border-b bg-muted/30 px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Mapped</span>
          <span className="font-medium">
            {mappedCount} / {totalSlots}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--brand-primary,#F97316)] transition-all"
            style={{ width: totalSlots > 0 ? `${(mappedCount / totalSlots) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {fields.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            No mappable fields. Add fields to the linked form first.
          </p>
        ) : (
          <ul className="divide-y">
            {fields.map((field) => {
              const options = getFieldOptions(field);
              const isExpanded = expandedIds.has(field.id);

              if (options) {
                const mappedOptions = options.filter((opt) =>
                  mappedKeys.has(`${field.id}:${opt.value}`),
                ).length;
                const allMapped = mappedOptions === options.length;
                const summary =
                  options.length <= 3
                    ? options.map((o) => o.label).join(' / ')
                    : `${options.length} options`;

                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(field.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                        allMapped && 'bg-blue-50/50 dark:bg-blue-900/10',
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{field.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {summary} — {mappedOptions}/{options.length} placed
                        </p>
                      </div>
                      {allMapped ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                    </button>

                    {isExpanded && (
                      <ul className="bg-muted/20">
                        {options.map((opt) => {
                          const key = `${field.id}:${opt.value}`;
                          const mapping = mappings.find(
                            (m) => m.fieldId === field.id && m.answerOption === opt.value,
                          );
                          const isMapped = mappedKeys.has(key);

                          return (
                            <li key={key}>
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/field-id', field.id);
                                  e.dataTransfer.setData('text/answer-option', opt.value);
                                  e.dataTransfer.effectAllowed = 'copy';
                                }}
                                className={cn(
                                  'flex cursor-grab items-center gap-2 py-2 pl-8 pr-3 transition-colors hover:bg-muted/50',
                                  isMapped && 'bg-blue-50/30 dark:bg-blue-900/10',
                                )}
                                title={`Drag to place "${opt.label}" on the PDF`}
                              >
                                <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0 flex-1">
                                  <p className={cn('truncate text-xs font-semibold', opt.color)}>
                                    {opt.label}
                                  </p>
                                  {mapping ? (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400">
                                      Page {mapping.page + 1} · ({mapping.x}, {mapping.y}) ·{' '}
                                      {mapping.renderMode ?? 'checkmark'}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground">Not placed</p>
                                  )}
                                </div>
                                {isMapped ? (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-500" />
                                ) : (
                                  <Circle className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const mapping = mappings.find((m) => m.fieldId === field.id && !m.answerOption);
              const isMapped = mapping !== undefined;

              return (
                <li key={field.id}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/field-id', field.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={cn(
                      'flex cursor-grab items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/50',
                      isMapped && 'bg-blue-50/50 dark:bg-blue-900/10',
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{field.label}</p>
                      {mapping ? (
                        <p className="truncate text-[10px] text-blue-600 dark:text-blue-400">
                          Page {mapping.page + 1} · ({mapping.x}, {mapping.y})
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Not placed</p>
                      )}
                    </div>
                    {isMapped ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        <p>Arrow keys move the selected tag (Shift = ×10)</p>
        <p className="mt-0.5">
          Click &ldquo;Save mappings&rdquo; when done — changes are not autosaved.
        </p>
      </div>
    </div>
  );
}
