// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: The contract every step adapter implements. Ported from enterprise
// (step-adapter.interface.ts) minus mobile/test-mode plumbing the SMB edition
// doesn't have. Adapters are pure node executors: they read the run state,
// do one thing, and return outputData to merge back — routing is the
// orchestrator's job.

import type { WorkflowNodeType } from '@attune-sb/shared-types';

export type StepStatus = 'completed' | 'failed' | 'skipped';

export interface StepResult {
  readonly status: StepStatus;
  /** Merged into the run state on success. */
  readonly outputData?: Record<string, unknown>;
  /** Explicit routing (condition nodes); undefined = follow the default edge. */
  readonly nextNodeId?: string | null;
  readonly error?: string;
}

export interface StepContext {
  readonly runId: string;
  readonly workflowId: string;
  readonly organizationId: string;
  readonly nodeId: string;
  readonly nodeType: WorkflowNodeType;
  /** The node's config (WorkflowNode.data). */
  readonly nodeData: Record<string, unknown>;
  /** The run's shared blackboard — read-only inside adapters. */
  readonly state: Record<string, unknown>;
}

export interface StepAdapter {
  /** Node types this adapter executes. */
  readonly handles: readonly WorkflowNodeType[];
  execute(ctx: StepContext): Promise<StepResult>;
}
