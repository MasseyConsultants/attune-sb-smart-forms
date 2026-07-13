// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder
// Purpose: The SMB node palette — display metadata and default config per node
// type, grouped for the palette. Tier gating reads NODE_TIER from
// shared-types (the same table the publish gate enforces server-side).

import type { WorkflowNodeType } from '@attune-sb/shared-types';
import { NODE_TIER } from '@attune-sb/shared-types';
import {
  ArrowDownToLine,
  CheckCircle2,
  FileOutput,
  FileText,
  GitBranch,
  Globe,
  Mail,
  MailPlus,
  Megaphone,
  Play,
  Shuffle,
  Split,
  Square,
  Table,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NodeMeta {
  readonly type: WorkflowNodeType;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
  /** Tailwind classes for the node card (bg/border/text). */
  readonly cardClass: string;
  readonly defaultData: Record<string, unknown>;
}

export const NODE_META: Partial<Record<WorkflowNodeType, NodeMeta>> = {
  start: {
    type: 'start',
    label: 'Start',
    description: 'Runs when the trigger form receives a submission',
    icon: Play,
    cardClass: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    defaultData: {},
  },
  end: {
    type: 'end',
    label: 'End',
    description: 'Marks the run complete',
    icon: Square,
    cardClass: 'border-slate-400 bg-slate-50 text-slate-900',
    defaultData: {},
  },
  condition: {
    type: 'condition',
    label: 'Condition',
    description: 'Branch on a form field (Yes/No edges)',
    icon: GitBranch,
    cardClass: 'border-amber-400 bg-amber-50 text-amber-900',
    defaultData: { field: '', operator: 'equals', value: '' },
  },
  email: {
    type: 'email',
    label: 'Send email',
    description: 'Branded email with {{field}} tokens',
    icon: Mail,
    cardClass: 'border-sky-400 bg-sky-50 text-sky-900',
    defaultData: { to: '', subject: '', body: '' },
  },
  pdf_generate: {
    type: 'pdf_generate',
    label: 'Generate PDF',
    description: 'Summary PDF of the submission',
    icon: FileText,
    cardClass: 'border-rose-400 bg-rose-50 text-rose-900',
    defaultData: { title: '{{_formName}} submission' },
  },
  fill_document: {
    type: 'fill_document',
    label: 'Fill document',
    description: "Fill the form's mapped template (SmartMapper)",
    icon: FileOutput,
    cardClass: 'border-orange-400 bg-orange-50 text-orange-900',
    defaultData: {},
  },
  send_document: {
    type: 'send_document',
    label: 'Send document',
    description: 'Email the filled PDF as an attachment',
    icon: MailPlus,
    cardClass: 'border-indigo-400 bg-indigo-50 text-indigo-900',
    defaultData: { to: '', filename: '{{_formName}}.pdf' },
  },
  notify: {
    type: 'notify',
    label: 'Notify team',
    description: 'Internal notification to the org owner',
    icon: Megaphone,
    cardClass: 'border-teal-400 bg-teal-50 text-teal-900',
    defaultData: { message: 'New {{_formName}} submission' },
  },
  approval: {
    type: 'approval',
    label: 'Approval',
    description: 'Pause until someone approves or rejects by email link',
    icon: CheckCircle2,
    cardClass: 'border-green-500 bg-green-50 text-green-900',
    defaultData: { to: '', message: '', expiresDays: 7 },
  },
  webhook: {
    type: 'webhook',
    label: 'Webhook',
    description: 'POST the submission to a URL',
    icon: Globe,
    cardClass: 'border-violet-400 bg-violet-50 text-violet-900',
    defaultData: { url: '', method: 'POST' },
  },
  api: {
    type: 'api',
    label: 'API call',
    description: 'Custom HTTP request with headers and body',
    icon: ArrowDownToLine,
    cardClass: 'border-purple-400 bg-purple-50 text-purple-900',
    defaultData: { url: '', method: 'POST', body: '' },
  },
  switch: {
    type: 'switch',
    label: 'Switch',
    description: 'Multi-way branch on a field value',
    icon: Split,
    cardClass: 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-900',
    defaultData: { field: '', cases: [] },
  },
  data_transform: {
    type: 'data_transform',
    label: 'Transform data',
    description: 'Rename and reshape values for later steps',
    icon: Shuffle,
    cardClass: 'border-cyan-400 bg-cyan-50 text-cyan-900',
    defaultData: { mappings: [] },
  },
  export: {
    type: 'export',
    label: 'Export CSV',
    description: 'Email the submission as a CSV file',
    icon: Table,
    cardClass: 'border-lime-500 bg-lime-50 text-lime-900',
    defaultData: { to: '' },
  },
};

export interface PaletteGroup {
  readonly label: string;
  readonly types: readonly WorkflowNodeType[];
}

export const PALETTE_GROUPS: readonly PaletteGroup[] = [
  { label: 'Flow', types: ['condition', 'switch', 'end'] },
  { label: 'Documents', types: ['fill_document', 'pdf_generate', 'send_document'] },
  { label: 'Messaging', types: ['email', 'notify', 'export'] },
  { label: 'People & systems', types: ['approval', 'webhook', 'api', 'data_transform'] },
];

const TIER_RANK = { core: 0, growth: 1, business: 2 } as const;

/** True when a node type is above the org's plan tier (greyed in the palette). */
export function isAboveTier(
  type: WorkflowNodeType,
  orgTier: keyof typeof TIER_RANK | undefined,
): boolean {
  if (!orgTier) {
    return false; // still loading — don't flash locks
  }
  return TIER_RANK[NODE_TIER[type]] > TIER_RANK[orgTier];
}
