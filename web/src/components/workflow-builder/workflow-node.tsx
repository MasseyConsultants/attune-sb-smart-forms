// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder
// Purpose: The single custom React Flow node used for every type — a colored
// card with the type icon, label, and a one-line config summary. One generic
// component instead of 14 near-identical ones (the enterprise builder's
// pattern, collapsed).

'use client';

import { memo, useContext } from 'react';

import type { WorkflowNodeType } from '@attune-sb/shared-types';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { AlertTriangle, FileText } from 'lucide-react';

import { NODE_META } from './node-catalog';
import { TriggerFormContext } from './trigger-form-context';

import { cn } from '@/lib/utils';

// Friendly names so non-technical users read "Dropdown", not "multiselect".
// Keys mirror the FIELD_TYPES union in @attune-sb/shared-types.
const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  multiline: 'Long text',
  textarea: 'Long text',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  url: 'Link',
  dynamiclist: 'List',
  dropdown: 'Dropdown',
  multiselect: 'Multi-select',
  select: 'Dropdown',
  radio: 'Choice',
  checkbox: 'Checkboxes',
  yesno: 'Yes / No',
  toggle: 'On / Off',
  date: 'Date',
  time: 'Time',
  datetime: 'Date & time',
  eventtimestamp: 'Timestamp',
  photo: 'Photo',
  signature: 'Signature',
  barcode: 'Barcode',
  gps: 'Location',
  address: 'Address',
  calculated: 'Calculated',
  currentuser: 'Team member',
  rating: 'Rating',
};

const START_NODE_MAX_FIELDS = 6;

/**
 * The start node is a form card (SB-020): it shows WHICH form kicks off the
 * flow and the data it carries into the pipeline, so the flow lines visibly
 * start from real fields instead of an abstract dot.
 */
function StartFormNode({ selected }: { selected: boolean }): React.ReactElement {
  const trigger = useContext(TriggerFormContext);
  const shown = trigger.fields.slice(0, START_NODE_MAX_FIELDS);
  const hidden = trigger.fields.length - shown.length;

  return (
    <div
      className={cn(
        'min-w-[200px] max-w-[240px] rounded-lg border-2 border-emerald-400 bg-emerald-50 px-3 py-2 shadow-sm transition-shadow',
        selected && 'shadow-md ring-2 ring-[var(--brand-primary,#F97316)] ring-offset-1',
      )}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-emerald-700/80">
            When this form is submitted
          </p>
          <p className="truncate text-xs font-semibold text-emerald-900">
            {trigger.formName ?? 'No form linked yet'}
          </p>
        </div>
      </div>

      {trigger.formName === null ? (
        <p className="mt-1.5 flex items-center gap-1 rounded bg-amber-100 px-1.5 py-1 text-[10px] text-amber-800">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Click to choose the form that starts this flow
        </p>
      ) : (
        shown.length > 0 && (
          <div className="mt-1.5 space-y-0.5 rounded bg-white/70 px-1.5 py-1">
            {shown.map((field) => (
              <div key={field.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[10px] text-emerald-900">{field.label}</span>
                <span className="shrink-0 text-[9px] text-emerald-700/60">
                  {FIELD_TYPE_LABELS[field.type] ?? field.type}
                </span>
              </div>
            ))}
            {hidden > 0 && <p className="text-[9px] text-emerald-700/60">+ {hidden} more fields</p>}
          </div>
        )
      )}

      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-emerald-500" />
    </div>
  );
}

function summaryOf(type: WorkflowNodeType, data: Record<string, unknown>): string {
  switch (type) {
    case 'email':
    case 'send_document':
    case 'approval':
    case 'export':
      return typeof data.to === 'string' && data.to ? `to ${data.to}` : 'no recipient yet';
    case 'condition':
      return typeof data.field === 'string' && data.field
        ? `${data.field} ${String(data.operator ?? 'equals')} ${String(data.value ?? '')}`
        : 'no field yet';
    case 'switch':
      return typeof data.field === 'string' && data.field
        ? `on ${data.field} (${Array.isArray(data.cases) ? data.cases.length : 0} cases)`
        : 'no field yet';
    case 'webhook':
    case 'api':
      return typeof data.url === 'string' && data.url ? data.url : 'no URL yet';
    case 'data_transform':
      return `${Array.isArray(data.mappings) ? data.mappings.length : 0} mappings`;
    case 'pdf_generate':
      return typeof data.title === 'string' ? data.title : '';
    case 'notify':
      return typeof data.message === 'string' ? data.message : '';
    case 'start':
      return 'on form submission';
    case 'end':
    case 'form':
    case 'fill_document':
    case 'delay':
    case 'sub_workflow':
    case 'excel_generate':
    case 'loop':
      return '';
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}

function WorkflowNodeComponent({ type, data, selected }: NodeProps): React.ReactElement {
  const nodeType = type as WorkflowNodeType;
  if (nodeType === 'start') {
    return <StartFormNode selected={selected ?? false} />;
  }
  const meta = NODE_META[nodeType];
  const Icon = meta?.icon;
  const summary = summaryOf(nodeType, (data ?? {}) as Record<string, unknown>);

  return (
    <div
      className={cn(
        'min-w-[160px] max-w-[220px] rounded-lg border-2 px-3 py-2 shadow-sm transition-shadow',
        meta?.cardClass ?? 'border-slate-300 bg-white',
        selected && 'shadow-md ring-2 ring-[var(--brand-primary,#F97316)] ring-offset-1',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-slate-400" />
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate text-xs font-semibold">{meta?.label ?? nodeType}</span>
      </div>
      {summary && <p className="mt-0.5 truncate text-[10px] opacity-70">{summary}</p>}
      {nodeType !== 'end' && (
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-slate-500" />
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
