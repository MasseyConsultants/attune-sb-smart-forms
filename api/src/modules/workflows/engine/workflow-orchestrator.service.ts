// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: The engine — walks a pinned workflow version node-by-node through
// the adapter registry, merging outputs into run state and writing a
// WorkflowRunStep ledger row per node. Ported from the enterprise
// WorkflowOrchestratorService loop; pause/resume (approvals, delays) lands
// with those adapters in S8.
//
// Failure semantics: an adapter failure routes to the node's failure edge if
// one exists, otherwise the run is FAILED with the step's error captured.
// 'skipped' steps (metered actions at plan cap) advance like successes — a
// cap on one action never kills the rest of the run, and never touches the
// trigger submission.

import { WorkflowEdge, WorkflowNode } from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { Prisma, WorkflowRunStatus, WorkflowRunStepStatus } from '@prisma/client';

import { WorkflowsRepository } from '../workflows.repository';

import { ConditionStepAdapter } from './adapters/condition-step.adapter';
import { EmailStepAdapter } from './adapters/email-step.adapter';
import { FillDocumentStepAdapter } from './adapters/fill-document-step.adapter';
import { NotifyStepAdapter } from './adapters/notify-step.adapter';
import { PdfGenerateStepAdapter } from './adapters/pdf-generate-step.adapter';
import { SendDocumentStepAdapter } from './adapters/send-document-step.adapter';
import type { StepAdapter, StepResult } from './step-adapter.interface';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

// Hard ceiling on nodes per run — cycles are not validated away at publish, so
// the runtime guards against them (enterprise uses 200; SMB graphs are smaller).
const MAX_STEPS = 100;

interface PinnedGraph {
  readonly nodes: WorkflowNode[];
  readonly edges: WorkflowEdge[];
}

@Injectable()
export class WorkflowOrchestratorService {
  private readonly adapters: StepAdapter[];

  constructor(
    private readonly repository: WorkflowsRepository,
    private readonly logger: SecureLoggerService,
    conditionAdapter: ConditionStepAdapter,
    emailAdapter: EmailStepAdapter,
    pdfGenerateAdapter: PdfGenerateStepAdapter,
    fillDocumentAdapter: FillDocumentStepAdapter,
    sendDocumentAdapter: SendDocumentStepAdapter,
    notifyAdapter: NotifyStepAdapter,
  ) {
    this.adapters = [
      conditionAdapter,
      emailAdapter,
      pdfGenerateAdapter,
      fillDocumentAdapter,
      sendDocumentAdapter,
      notifyAdapter,
    ];
  }

  /** Executes a PENDING run to completion. Invoked by the BullMQ processor. */
  async execute(runId: string): Promise<void> {
    const run = await this.repository.findRun(runId);
    if (!run) {
      this.logger.warn(`workflow.run.missing run=${runId}`, 'WorkflowOrchestrator');
      return;
    }
    if (run.status !== WorkflowRunStatus.PENDING) {
      // Replayed BullMQ job — the run already executed. Idempotent no-op.
      return;
    }

    const version = await this.repository.findVersion(run.workflowId, run.workflowVersion);
    if (!version) {
      await this.fail(runId, `Workflow version ${run.workflowVersion} not found`);
      return;
    }
    const graph: PinnedGraph = {
      nodes: (version.nodes ?? []) as unknown as WorkflowNode[],
      edges: (version.edges ?? []) as unknown as WorkflowEdge[],
    };

    const startNode = graph.nodes.find((n) => n.type === 'start');
    if (!startNode) {
      await this.fail(runId, 'Pinned graph has no start node');
      return;
    }

    await this.repository.updateRun(runId, {
      status: WorkflowRunStatus.RUNNING,
      startedAt: new Date(),
    });

    let state = (run.state ?? {}) as Record<string, unknown>;
    let currentNodeId: string | null = startNode.id;
    let steps = 0;

    while (currentNodeId && steps < MAX_STEPS) {
      steps++;
      const node = graph.nodes.find((n) => n.id === currentNodeId);
      if (!node) {
        await this.fail(runId, `Node ${currentNodeId} not found in pinned graph`);
        return;
      }

      if (node.type === 'end') {
        await this.recordStep(runId, node, { status: 'completed' }, 0);
        await this.repository.updateRun(runId, {
          status: WorkflowRunStatus.COMPLETED,
          currentNodeId: null,
          state: state as Prisma.InputJsonValue,
          completedAt: new Date(),
        });
        this.logger.log(
          `workflow.run.completed run=${runId} steps=${steps}`,
          'WorkflowOrchestrator',
        );
        return;
      }

      // start/form are pass-throughs at v1: the trigger submission already
      // supplied the data that a form node would collect.
      if (node.type === 'start' || node.type === 'form') {
        await this.recordStep(runId, node, { status: 'completed' }, 0);
        currentNodeId = this.nextNodeId(node.id, undefined, graph.edges, 'success');
        continue;
      }

      const adapter = this.adapters.find((a) =>
        (a.handles as readonly string[]).includes(node.type),
      );
      if (!adapter) {
        // Types the plan gate let through but S7 doesn't ship an adapter for
        // (approval/webhook/... land in S8) — skip via the default edge.
        await this.recordStep(
          runId,
          node,
          { status: 'skipped', error: `No adapter for node type "${node.type}" yet` },
          0,
        );
        currentNodeId = this.nextNodeId(node.id, undefined, graph.edges, 'success');
        continue;
      }

      await this.repository.updateRun(runId, { currentNodeId: node.id });

      const startedAt = Date.now();
      let result: StepResult;
      try {
        result = await adapter.execute({
          runId,
          workflowId: run.workflowId,
          organizationId: run.organizationId,
          nodeId: node.id,
          nodeType: node.type,
          nodeData: node.data ?? {},
          state,
        });
      } catch (err) {
        result = {
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        };
      }
      const durationMs = Date.now() - startedAt;

      await this.recordStep(runId, node, result, durationMs);

      if (result.outputData) {
        state = { ...state, ...result.outputData };
        await this.repository.updateRun(runId, { state: state as Prisma.InputJsonValue });
      }

      if (result.status === 'failed') {
        const failureNext = this.nextNodeId(node.id, undefined, graph.edges, 'failure');
        if (failureNext) {
          state = { ...state, _lastError: result.error ?? 'Step failed' };
          currentNodeId = failureNext;
          continue;
        }
        await this.fail(
          runId,
          `Node ${node.id} (${node.type}) failed: ${result.error ?? 'unknown error'}`,
        );
        return;
      }

      // completed + skipped both advance
      const branchHint =
        node.type === 'condition' && result.outputData
          ? String(result.outputData['conditionResult'])
          : null;
      currentNodeId = this.nextNodeId(
        node.id,
        result.nextNodeId,
        graph.edges,
        'success',
        branchHint,
      );
    }

    if (steps >= MAX_STEPS) {
      await this.fail(runId, `Exceeded maximum step count (${MAX_STEPS}) — cycle in graph?`);
      return;
    }

    // Ran off the graph without hitting an end node — complete rather than
    // fail: everything that executed, executed.
    await this.repository.updateRun(runId, {
      status: WorkflowRunStatus.COMPLETED,
      currentNodeId: null,
      state: state as Prisma.InputJsonValue,
      completedAt: new Date(),
    });
  }

  // --- Internals ---

  private async recordStep(
    runId: string,
    node: WorkflowNode,
    result: StepResult,
    durationMs: number,
  ): Promise<void> {
    const statusMap: Record<StepResult['status'], WorkflowRunStepStatus> = {
      completed: WorkflowRunStepStatus.COMPLETED,
      failed: WorkflowRunStepStatus.FAILED,
      skipped: WorkflowRunStepStatus.SKIPPED,
    };
    await this.repository.createRunStep({
      runId,
      nodeId: node.id,
      nodeType: node.type,
      status: statusMap[result.status],
      output: result.outputData as Prisma.InputJsonValue | undefined,
      error: result.error,
      durationMs,
    });
  }

  private async fail(runId: string, error: string): Promise<void> {
    await this.repository.updateRun(runId, {
      status: WorkflowRunStatus.FAILED,
      error,
      completedAt: new Date(),
    });
    this.logger.warn(`workflow.run.failed run=${runId}: ${error}`, 'WorkflowOrchestrator');
  }

  /**
   * Edge routing, ported from enterprise getNextNodeId:
   * 1. Explicit adapter target wins (condition trueNodeId/falseNodeId)
   * 2. failure route → edge labeled/flagged failure
   * 3. branch hint → edge whose label matches (true/yes ↔ false/no aliases)
   * 4. otherwise the first unlabeled/default edge
   */
  private nextNodeId(
    sourceId: string,
    explicitTarget: string | null | undefined,
    edges: WorkflowEdge[],
    route: 'success' | 'failure',
    branchHint?: string | null,
  ): string | null {
    if (explicitTarget !== undefined && explicitTarget !== null) {
      return explicitTarget;
    }

    const outgoing = edges.filter((e) => e.source === sourceId);
    const labelOf = (e: WorkflowEdge): string => (e.label ?? '').toLowerCase().trim();

    if (route === 'failure') {
      return (
        outgoing.find((e) => labelOf(e) === 'failure' || labelOf(e) === 'error')?.target ?? null
      );
    }

    if (branchHint !== null && branchHint !== undefined && outgoing.length > 1) {
      const hint = branchHint.toLowerCase().trim();
      const aliases =
        hint === 'true' ? ['true', 'yes', 'y'] : hint === 'false' ? ['false', 'no', 'n'] : [hint];
      const match = outgoing.find((e) => aliases.includes(labelOf(e)));
      if (match) {
        return match.target;
      }
      const fallback = outgoing.find((e) => ['default', 'else', 'otherwise'].includes(labelOf(e)));
      if (fallback) {
        return fallback.target;
      }
    }

    const plain = outgoing.find((e) => !['failure', 'error'].includes(labelOf(e)));
    return plain?.target ?? null;
  }
}
