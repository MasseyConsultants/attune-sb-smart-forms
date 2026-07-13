// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Workflow graph contracts. Node catalog is the curated SMB subset
// (MASTER_PLAN §4). Fixes the enterprise drift: fill_document/send_document are
// first-class node types here.

import type { WorkflowNodeTier } from './plans';

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export type WorkflowNodeType =
  // Core (all tiers)
  | 'start'
  | 'end'
  | 'form'
  | 'condition'
  | 'email'
  | 'pdf_generate'
  | 'fill_document'
  | 'send_document'
  | 'notify'
  // Growth+
  | 'approval'
  | 'webhook'
  | 'api'
  | 'switch'
  | 'data_transform'
  | 'export'
  // Business
  | 'delay'
  | 'sub_workflow'
  | 'excel_generate'
  | 'loop';

// Node → minimum plan tier that may use it. The workflow builder greys out
// nodes above the org's tier; the orchestrator refuses to publish graphs
// containing them.
export const NODE_TIER: Record<WorkflowNodeType, WorkflowNodeTier> = {
  start: 'core',
  end: 'core',
  form: 'core',
  condition: 'core',
  email: 'core',
  pdf_generate: 'core',
  fill_document: 'core',
  send_document: 'core',
  notify: 'core',
  approval: 'growth',
  webhook: 'growth',
  api: 'growth',
  switch: 'growth',
  data_transform: 'growth',
  export: 'growth',
  delay: 'business',
  sub_workflow: 'business',
  excel_generate: 'business',
  loop: 'business',
};

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  color: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// Published workflow payload with graph embedded at publish time
export interface WorkflowPublishedData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  publishedAt: string;
  version: number;
}

// --- Runs (S7 engine) ---

export type WorkflowRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  // Recorded (never silently dropped) when WORKFLOW_RUNS is at cap.
  | 'SKIPPED_LIMIT'
  | 'CANCELED';

export type WorkflowRunStepStatus = 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface WorkflowRunStepSummary {
  id: string;
  nodeId: string;
  nodeType: WorkflowNodeType;
  status: WorkflowRunStepStatus;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface WorkflowRunSummary {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: WorkflowRunStatus;
  submissionId: string | null;
  triggerType: string;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkflowRunDetail extends WorkflowRunSummary {
  steps: WorkflowRunStepSummary[];
}

// --- API contracts ---

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  version: number;
  triggerFormId: string | null;
  triggerFormName: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
