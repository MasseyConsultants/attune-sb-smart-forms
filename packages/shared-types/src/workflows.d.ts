import type { WorkflowNodeTier } from './plans';
export declare enum WorkflowStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
export type WorkflowNodeType =
  | 'start'
  | 'end'
  | 'form'
  | 'condition'
  | 'email'
  | 'pdf_generate'
  | 'fill_document'
  | 'send_document'
  | 'notify'
  | 'approval'
  | 'webhook'
  | 'api'
  | 'switch'
  | 'data_transform'
  | 'export'
  | 'delay'
  | 'sub_workflow'
  | 'excel_generate'
  | 'loop';
export declare const NODE_TIER: Record<WorkflowNodeType, WorkflowNodeTier>;
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: {
    x: number;
    y: number;
  };
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
export interface WorkflowPublishedData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  publishedAt: string;
  version: number;
}
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  triggerData: Record<string, unknown> | null;
  resultData: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  executedBy: string | null;
  createdAt: string;
}
