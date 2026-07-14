// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows
// Purpose: Business logic for the workflows domain. Lifecycle FSM mirrors
// forms: DRAFT → PUBLISHED → (unpublish) → DRAFT; publish snapshots an
// immutable WorkflowVersion that runs pin to.
//
// Publish is where the plan gates bite: the graph must validate structurally
// AND contain no nodes above the org's workflowNodeTier — a Growth-only
// approval node in a trial org's graph is a 402 with an upgrade URL, exactly
// like a counted-resource denial.

import {
  WorkflowDetail,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRunDetail,
  WorkflowRunStepSummary,
  WorkflowRunSummary,
  WorkflowSummary,
} from '@attune-sb/shared-types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Workflow, WorkflowRun, WorkflowRunStep, WorkflowStatus } from '@prisma/client';

import type { CreateWorkflowDto } from './dto/create-workflow.dto';
import type { ListWorkflowsQueryDto } from './dto/list-workflows-query.dto';
import type { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { nodesAboveTier, validateGraph } from './workflow-validation';
import { WorkflowsRepository } from './workflows.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { FormsRepository } from '@/modules/forms/forms.repository';

function graphOf(workflow: Workflow): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: (workflow.nodes ?? []) as unknown as WorkflowNode[],
    edges: (workflow.edges ?? []) as unknown as WorkflowEdge[],
  };
}

function toRunSummary(run: WorkflowRun): WorkflowRunSummary {
  return {
    id: run.id,
    workflowId: run.workflowId,
    workflowVersion: run.workflowVersion,
    status: run.status,
    submissionId: run.submissionId,
    triggerType: run.triggerType,
    error: run.error,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
  };
}

function toStepSummary(step: WorkflowRunStep): WorkflowRunStepSummary {
  return {
    id: step.id,
    nodeId: step.nodeId,
    nodeType: step.nodeType as WorkflowRunStepSummary['nodeType'],
    status: step.status,
    error: step.error,
    durationMs: step.durationMs,
    createdAt: step.createdAt.toISOString(),
  };
}

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly repository: WorkflowsRepository,
    private readonly formsRepository: FormsRepository,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {}

  async findAll(
    query: ListWorkflowsQueryDto,
    user: AuthenticatedUser,
  ): Promise<{ workflows: WorkflowSummary[]; total: number }> {
    const { workflows, total } = await this.repository.findMany(user.organizationId, query);
    const summaries = await Promise.all(
      workflows.map((workflow) => this.toSummary(workflow, workflow._count.runs, user)),
    );
    return { workflows: summaries, total };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<WorkflowDetail> {
    const workflow = await this.assertOwned(id, user);
    const graph = graphOf(workflow);
    const summary = await this.toSummary(workflow, 0, user);
    return { ...summary, nodes: graph.nodes, edges: graph.edges };
  }

  async create(dto: CreateWorkflowDto, user: AuthenticatedUser): Promise<WorkflowDetail> {
    if (dto.triggerFormId) {
      await this.assertOwnedForm(dto.triggerFormId, user);
    }
    // Publish requires exactly one start and an end; seed the skeleton so a
    // fresh canvas is never empty (the palette deliberately has no start node).
    const nodes =
      dto.nodes && dto.nodes.length > 0
        ? dto.nodes
        : [
            { id: 'n-start', type: 'start', position: { x: 120, y: 80 }, data: {} },
            { id: 'n-end', type: 'end', position: { x: 120, y: 380 }, data: {} },
          ];
    const workflow = await this.repository.create({
      name: dto.name,
      description: dto.description,
      nodes: nodes as unknown as Prisma.InputJsonValue,
      edges: (dto.edges ?? []) as unknown as Prisma.InputJsonValue,
      triggerFormId: dto.triggerFormId,
      color: dto.color,
      organizationId: user.organizationId,
      createdById: user.userId,
    });
    this.logger.log(`workflow.created id=${workflow.id} by=${user.userId}`, 'WorkflowsService');
    return this.findOne(workflow.id, user);
  }

  async update(
    id: string,
    dto: UpdateWorkflowDto,
    user: AuthenticatedUser,
  ): Promise<WorkflowDetail> {
    const workflow = await this.assertOwned(id, user);

    const structural =
      dto.nodes !== undefined || dto.edges !== undefined || dto.triggerFormId !== undefined;
    if (structural && workflow.status === WorkflowStatus.PUBLISHED) {
      throw new ConflictException('Unpublish the workflow before editing its graph or trigger');
    }
    if (dto.triggerFormId) {
      await this.assertOwnedForm(dto.triggerFormId, user);
    }

    await this.repository.update(id, user.organizationId, {
      name: dto.name,
      description: dto.description,
      color: dto.color,
      ...(dto.nodes !== undefined ? { nodes: dto.nodes as unknown as Prisma.InputJsonValue } : {}),
      ...(dto.edges !== undefined ? { edges: dto.edges as unknown as Prisma.InputJsonValue } : {}),
      ...(dto.triggerFormId !== undefined ? { triggerFormId: dto.triggerFormId } : {}),
    });
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.assertOwned(id, user);
    await this.repository.softDelete(id, user.organizationId);
    this.logger.log(`workflow.deleted id=${id} by=${user.userId}`, 'WorkflowsService');
  }

  // --- Publish FSM ---

  async publish(id: string, user: AuthenticatedUser): Promise<WorkflowDetail> {
    const workflow = await this.assertOwned(id, user);
    if (workflow.status === WorkflowStatus.PUBLISHED) {
      throw new ConflictException('Workflow is already published');
    }

    const graph = graphOf(workflow);
    const errors = validateGraph(graph.nodes, graph.edges);
    if (errors.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Workflow graph validation failed',
        details: errors,
      });
    }

    // Plan-tier node gate — the SMB addition the enterprise engine lacks.
    const snapshot = await this.entitlements.getPlanSnapshot(user.organizationId);
    const orgTier = snapshot.definition.features.workflowNodeTier;
    const overTier = nodesAboveTier(graph.nodes, orgTier);
    if (overTier.length > 0) {
      this.logger.warn(
        `workflow.publish.tier_denied id=${id} nodes=${overTier.join(',')} tier=${orgTier}`,
        'WorkflowsService',
      );
      const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3100');
      throw new EntitlementExceededException({
        entitlement: `workflowNodeTier:${overTier.join(',')}`,
        limit: 0,
        current: overTier.length,
        resetsAt: null,
        upgradeUrl: `${appUrl}/billing`,
      });
    }

    if (!workflow.triggerFormId) {
      throw new UnprocessableEntityException({
        message: 'Workflow graph validation failed',
        details: ['Link a trigger form before publishing — runs start from its submissions.'],
      });
    }
    await this.assertOwnedForm(workflow.triggerFormId, user);

    const nextVersion =
      workflow.status === WorkflowStatus.DRAFT ? workflow.version : workflow.version + 1;
    await this.repository.createVersion({
      workflowId: id,
      version: nextVersion,
      nodes: workflow.nodes as Prisma.InputJsonValue,
      edges: workflow.edges as Prisma.InputJsonValue,
      publishedBy: user.userId,
    });
    await this.repository.update(id, user.organizationId, {
      status: WorkflowStatus.PUBLISHED,
      version: nextVersion,
    });

    this.logger.log(
      `workflow.published id=${id} version=${nextVersion} by=${user.userId}`,
      'WorkflowsService',
    );
    return this.findOne(id, user);
  }

  async unpublish(id: string, user: AuthenticatedUser): Promise<WorkflowDetail> {
    const workflow = await this.assertOwned(id, user);
    if (workflow.status !== WorkflowStatus.PUBLISHED) {
      throw new ConflictException('Only published workflows can be unpublished');
    }
    // Next publish snapshots a new version.
    await this.repository.update(id, user.organizationId, {
      status: WorkflowStatus.DRAFT,
      version: workflow.version + 1,
    });
    this.logger.log(`workflow.unpublished id=${id} by=${user.userId}`, 'WorkflowsService');
    return this.findOne(id, user);
  }

  // --- Runs ---

  async findRuns(
    workflowId: string,
    page: number,
    pageSize: number,
    user: AuthenticatedUser,
  ): Promise<{ runs: WorkflowRunSummary[]; total: number }> {
    await this.assertOwned(workflowId, user);
    const { runs, total } = await this.repository.findRuns(
      workflowId,
      user.organizationId,
      page,
      pageSize,
    );
    return { runs: runs.map(toRunSummary), total };
  }

  async findRun(runId: string, user: AuthenticatedUser): Promise<WorkflowRunDetail> {
    const run = await this.repository.findRun(runId);
    if (!run || run.organizationId !== user.organizationId) {
      throw new NotFoundException('Run not found');
    }
    const steps = await this.repository.findRunSteps(runId);
    return { ...toRunSummary(run), steps: steps.map(toStepSummary) };
  }

  // --- Internals ---

  private async toSummary(
    workflow: Workflow,
    runCount: number,
    user: AuthenticatedUser,
  ): Promise<WorkflowSummary> {
    let triggerFormName: string | null = null;
    if (workflow.triggerFormId) {
      const form = await this.formsRepository.findById(workflow.triggerFormId, user.organizationId);
      triggerFormName = form?.name ?? null;
    }
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      // Prisma's generated enum and the shared-types enum carry identical values.
      status: workflow.status as unknown as WorkflowSummary['status'],
      version: workflow.version,
      triggerFormId: workflow.triggerFormId,
      triggerFormName,
      runCount,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }

  private async assertOwned(id: string, user: AuthenticatedUser): Promise<Workflow> {
    const workflow = await this.repository.findById(id, user.organizationId);
    if (!workflow) {
      if (await this.repository.existsAnywhere(id)) {
        this.logger.warn(
          `SECURITY: cross-org workflow access attempt — ${id} requested by user ${user.userId} of org ${user.organizationId}`,
          'WorkflowsService',
        );
      }
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  private async assertOwnedForm(formId: string, user: AuthenticatedUser): Promise<void> {
    const form = await this.formsRepository.findById(formId, user.organizationId);
    if (!form) {
      throw new NotFoundException('Trigger form not found');
    }
  }
}
