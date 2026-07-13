// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder
// Purpose: The single custom React Flow node used for every type — a colored
// card with the type icon, label, and a one-line config summary. One generic
// component instead of 14 near-identical ones (the enterprise builder's
// pattern, collapsed).

'use client';

import { memo } from 'react';

import type { WorkflowNodeType } from '@attune-sb/shared-types';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

import { NODE_META } from './node-catalog';

import { cn } from '@/lib/utils';

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
      {nodeType !== 'start' && (
        <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-slate-400" />
      )}
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
