// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Form Builder
// Purpose: The inspector panel — edits the selected field's label, description,
// required flag, page, options (choice types), and a conditional visibility rule.

'use client';

import { getFieldDefinition } from '@attune-sb/form-engine';
import type { ConditionalOperator, FieldDefinition } from '@attune-sb/shared-types';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const OPTION_TYPES = new Set(['dropdown', 'multiselect', 'select', 'radio']);

const OPERATORS: ReadonlyArray<{ value: ConditionalOperator; label: string }> = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const VALUELESS_OPERATORS = new Set<ConditionalOperator>(['is_empty', 'is_not_empty']);

interface InspectorProps {
  readonly field: FieldDefinition | null;
  readonly allFields: FieldDefinition[];
  readonly onChange: (id: string, patch: Partial<FieldDefinition>) => void;
}

export function FieldInspector({ field, allFields, onChange }: InspectorProps): React.ReactElement {
  if (!field) {
    return (
      <p className="text-sm text-muted-foreground">Select a field on the canvas to configure it.</p>
    );
  }

  const definition = getFieldDefinition(field.type);
  const options = Array.isArray(field.config.options) ? (field.config.options as string[]) : [];
  const rule = field.conditionalVisibility?.rules?.[0];
  const otherFields = allFields.filter((f) => f.id !== field.id);

  const patchConfig = (patch: Record<string, unknown>): void =>
    onChange(field.id, { config: { ...field.config, ...patch } });

  const patchRule = (patch: {
    fieldId?: string;
    operator?: ConditionalOperator;
    value?: unknown;
  }): void => {
    const next = {
      fieldId: patch.fieldId ?? rule?.fieldId ?? otherFields[0]?.id ?? '',
      operator: patch.operator ?? rule?.operator ?? 'equals',
      value: 'value' in patch ? patch.value : rule?.value,
    };
    onChange(field.id, { conditionalVisibility: { enabled: true, rules: [next] } });
  };

  return (
    <div className="space-y-4" data-testid="field-inspector">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {definition?.label ?? field.type}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="inspector-label">Label</Label>
        <Input
          id="inspector-label"
          value={field.label}
          onChange={(e) => onChange(field.id, { label: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inspector-description">Description</Label>
        <Input
          id="inspector-description"
          value={field.description ?? ''}
          placeholder="Optional helper text"
          onChange={(e) => onChange(field.id, { description: e.target.value || undefined })}
        />
      </div>

      <div className="flex items-center gap-4">
        {definition?.supportsRequired !== false && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={field.required}
              onCheckedChange={(checked) => onChange(field.id, { required: checked === true })}
            />
            Required
          </label>
        )}
        <div className="flex items-center gap-2">
          <Label htmlFor="inspector-page" className="text-sm">
            Page
          </Label>
          <Input
            id="inspector-page"
            type="number"
            min={1}
            className="w-16"
            value={field.page}
            onChange={(e) =>
              onChange(field.id, { page: Math.max(1, parseInt(e.target.value, 10) || 1) })
            }
          />
        </div>
      </div>

      {OPTION_TYPES.has(field.type) && (
        <div className="space-y-1.5">
          <Label htmlFor="inspector-options">Options (one per line)</Label>
          <textarea
            id="inspector-options"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={options.join('\n')}
            onChange={(e) =>
              patchConfig({ options: e.target.value.split('\n').filter((o) => o.trim() !== '') })
            }
          />
        </div>
      )}

      {field.type === 'rating' && (
        <div className="space-y-1.5">
          <Label htmlFor="inspector-max">Max rating</Label>
          <Input
            id="inspector-max"
            type="number"
            min={2}
            max={10}
            className="w-20"
            value={Number(field.config.max ?? 5)}
            onChange={(e) => patchConfig({ max: parseInt(e.target.value, 10) || 5 })}
          />
        </div>
      )}

      {definition?.supportsConditional !== false && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox
              checked={field.conditionalVisibility?.enabled ?? false}
              disabled={otherFields.length === 0}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  patchRule({});
                } else {
                  onChange(field.id, { conditionalVisibility: undefined });
                }
              }}
            />
            Show conditionally
          </label>

          {field.conditionalVisibility?.enabled && rule && (
            <div className="space-y-2">
              <select
                aria-label="Condition field"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={rule.fieldId}
                onChange={(e) => patchRule({ fieldId: e.target.value })}
              >
                {otherFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Condition operator"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={rule.operator}
                onChange={(e) => patchRule({ operator: e.target.value as ConditionalOperator })}
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {!VALUELESS_OPERATORS.has(rule.operator) && (
                <Input
                  aria-label="Condition value"
                  value={String(rule.value ?? '')}
                  placeholder="Value"
                  onChange={(e) => patchRule({ value: e.target.value })}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
