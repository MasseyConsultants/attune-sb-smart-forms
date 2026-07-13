// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder
// Purpose: The right-hand config panel for the selected node or edge. Field
// forms per node type; {{field}} token hints come from the trigger form's
// schema. Edge selection edits the routing label (Yes/No/Approved/failure).

'use client';

import type { WorkflowNodeType } from '@attune-sb/shared-types';
import { Trash2, X } from 'lucide-react';

import { NODE_META } from './node-catalog';

import { Button } from '@/components/ui/button';

interface FieldOption {
  readonly id: string;
  readonly label: string;
}

interface NodeConfigPanelProps {
  readonly nodeId: string;
  readonly nodeType: WorkflowNodeType;
  readonly data: Record<string, unknown>;
  readonly fieldOptions: readonly FieldOption[];
  readonly onChange: (key: string, value: unknown) => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

const OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty',
] as const;

function Text({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}): React.ReactElement {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
        />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldPicker({
  label,
  value,
  fieldOptions,
  onChange,
}: {
  label: string;
  value: string;
  fieldOptions: readonly FieldOption[];
  onChange: (v: string) => void;
}): React.ReactElement {
  if (fieldOptions.length === 0) {
    return <Text label={label} value={value} onChange={onChange} placeholder="field id" />;
  }
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: 'Choose a field…' },
        ...fieldOptions.map((f) => ({ value: f.id, label: f.label })),
      ]}
    />
  );
}

interface RowListProps {
  readonly rows: Record<string, unknown>[];
  readonly columns: readonly { key: string; placeholder: string }[];
  readonly onChange: (rows: Record<string, unknown>[]) => void;
  readonly addLabel: string;
}

function RowList({ rows, columns, onChange, addLabel }: RowListProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-1">
          {columns.map((col) => (
            <input
              key={col.key}
              value={String(row[col.key] ?? '')}
              placeholder={col.placeholder}
              onChange={(e) => {
                const next = rows.map((r, i) =>
                  i === index ? { ...r, [col.key]: e.target.value } : r,
                );
                onChange(next);
              }}
              className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-xs"
            />
          ))}
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="shrink-0 text-muted-foreground hover:text-red-500"
            aria-label="Remove row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => onChange([...rows, Object.fromEntries(columns.map((c) => [c.key, '']))])}
      >
        {addLabel}
      </Button>
    </div>
  );
}

function ConfigFields({
  nodeType,
  data,
  fieldOptions,
  onChange,
}: Pick<
  NodeConfigPanelProps,
  'nodeType' | 'data' | 'fieldOptions' | 'onChange'
>): React.ReactElement {
  const text = (key: string): string => String(data[key] ?? '');

  switch (nodeType) {
    case 'email':
      return (
        <>
          <Text
            label="To"
            value={text('to')}
            onChange={(v) => onChange('to', v)}
            placeholder="ops@yourco.com or {{email}}"
          />
          <Text
            label="Subject"
            value={text('subject')}
            onChange={(v) => onChange('subject', v)}
            placeholder="New {{_formName}} submission"
          />
          <Text
            label="Body"
            value={text('body')}
            onChange={(v) => onChange('body', v)}
            placeholder={'Hi,\n\n{{name}} just submitted the form.'}
            multiline
          />
        </>
      );
    case 'notify':
      return (
        <>
          <Text
            label="To (blank = org owner)"
            value={text('to')}
            onChange={(v) => onChange('to', v)}
            placeholder="Defaults to the account owner"
          />
          <Text
            label="Message"
            value={text('message')}
            onChange={(v) => onChange('message', v)}
            multiline
          />
        </>
      );
    case 'condition':
      return (
        <>
          <FieldPicker
            label="Field"
            value={text('field')}
            fieldOptions={fieldOptions}
            onChange={(v) => onChange('field', v)}
          />
          <Select
            label="Operator"
            value={text('operator') || 'equals'}
            onChange={(v) => onChange('operator', v)}
            options={OPERATORS.map((o) => ({ value: o, label: o.replace(/_/g, ' ') }))}
          />
          <Text label="Value" value={text('value')} onChange={(v) => onChange('value', v)} />
          <p className="text-[10px] text-muted-foreground">
            Label the two outgoing edges <b>Yes</b> and <b>No</b> to route each outcome.
          </p>
        </>
      );
    case 'switch':
      return (
        <>
          <FieldPicker
            label="Field"
            value={text('field')}
            fieldOptions={fieldOptions}
            onChange={(v) => onChange('field', v)}
          />
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Cases</span>
            <RowList
              rows={Array.isArray(data.cases) ? (data.cases as Record<string, unknown>[]) : []}
              columns={[{ key: 'value', placeholder: 'case value' }]}
              onChange={(rows) => onChange('cases', rows)}
              addLabel="Add case"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Label each outgoing edge with a case value; an edge labeled <b>default</b> catches the
            rest.
          </p>
        </>
      );
    case 'approval':
      return (
        <>
          <Text
            label="Approver email"
            value={text('to')}
            onChange={(v) => onChange('to', v)}
            placeholder="manager@yourco.com or {{email}}"
          />
          <Text
            label="Message"
            value={text('message')}
            onChange={(v) => onChange('message', v)}
            multiline
          />
          <Text
            label="Link expires (days)"
            value={text('expiresDays') || '7'}
            onChange={(v) => onChange('expiresDays', v)}
          />
          <p className="text-[10px] text-muted-foreground">
            The run pauses here. Label outgoing edges <b>Approved</b> and <b>Rejected</b>.
          </p>
        </>
      );
    case 'webhook':
    case 'api':
      return (
        <>
          <Text
            label="URL"
            value={text('url')}
            onChange={(v) => onChange('url', v)}
            placeholder="https://hooks.yourco.com/intake"
          />
          <Select
            label="Method"
            value={text('method') || 'POST'}
            onChange={(v) => onChange('method', v)}
            options={['POST', 'GET', 'PUT', 'PATCH', 'DELETE'].map((m) => ({
              value: m,
              label: m,
            }))}
          />
          {nodeType === 'api' && (
            <Text
              label="Body (blank = submission JSON)"
              value={text('body')}
              onChange={(v) => onChange('body', v)}
              placeholder='{"name": "{{name}}"}'
              multiline
            />
          )}
          <p className="text-[10px] text-muted-foreground">
            Private network and metadata addresses are blocked for security.
          </p>
        </>
      );
    case 'data_transform':
      return (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Mappings (source → new name)
          </span>
          <RowList
            rows={Array.isArray(data.mappings) ? (data.mappings as Record<string, unknown>[]) : []}
            columns={[
              { key: 'source', placeholder: 'source field' },
              { key: 'target', placeholder: 'new name' },
            ]}
            onChange={(rows) => onChange('mappings', rows)}
            addLabel="Add mapping"
          />
        </div>
      );
    case 'export':
      return (
        <Text
          label="Email the CSV to"
          value={text('to')}
          onChange={(v) => onChange('to', v)}
          placeholder="ops@yourco.com"
        />
      );
    case 'send_document':
      return (
        <>
          <Text
            label="To"
            value={text('to')}
            onChange={(v) => onChange('to', v)}
            placeholder="{{email}} sends to the submitter"
          />
          <Text
            label="Attachment filename"
            value={text('filename')}
            onChange={(v) => onChange('filename', v)}
          />
        </>
      );
    case 'pdf_generate':
      return (
        <Text label="PDF title" value={text('title')} onChange={(v) => onChange('title', v)} />
      );
    case 'fill_document':
      return (
        <p className="text-[10px] text-muted-foreground">
          Fills the document template linked to the trigger form. No configuration needed — map the
          template under Templates.
        </p>
      );
    case 'start':
    case 'end':
    case 'form':
    case 'delay':
    case 'sub_workflow':
    case 'excel_generate':
    case 'loop':
      return <p className="text-[10px] text-muted-foreground">No configuration for this step.</p>;
    default: {
      const exhaustive: never = nodeType;
      return <p>{String(exhaustive)}</p>;
    }
  }
}

export function NodeConfigPanel({
  nodeId,
  nodeType,
  data,
  fieldOptions,
  onChange,
  onDelete,
  onClose,
}: NodeConfigPanelProps): React.ReactElement {
  const meta = NODE_META[nodeType];
  const deletable = nodeType !== 'start';

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {meta && <meta.icon className="h-4 w-4" />}
          <span className="text-sm font-semibold">{meta?.label ?? nodeType}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {meta && <p className="text-[11px] text-muted-foreground">{meta.description}</p>}

      <div className="space-y-3">
        <ConfigFields
          nodeType={nodeType}
          data={data}
          fieldOptions={fieldOptions}
          onChange={onChange}
        />
      </div>

      {fieldOptions.length > 0 && (
        <div className="rounded-md bg-muted/40 p-2">
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">
            Form fields (use as {'{{token}}'})
          </p>
          <div className="flex flex-wrap gap-1">
            {fieldOptions.slice(0, 12).map((f) => (
              <code key={f.id} className="rounded bg-background px-1 py-0.5 text-[10px]">
                {`{{${f.id}}}`}
              </code>
            ))}
          </div>
        </div>
      )}

      {deletable && (
        <Button size="sm" variant="outline" className="mt-auto text-red-600" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete node
        </Button>
      )}
      <p className="text-[10px] text-muted-foreground">Node ID: {nodeId}</p>
    </div>
  );
}
