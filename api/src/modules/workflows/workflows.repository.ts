// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows
// Purpose: The only place Prisma is touched for workflows, versions, runs and
// run steps. Every query is org-scoped at the call boundary.

import { Injectable } from '@nestjs/common';
import {
  ApprovalToken,
  Prisma,
  Workflow,
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowRunStep,
  WorkflowRunStepStatus,
  WorkflowStatus,
  WorkflowVersion,
} from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export interface ListWorkflowsParams {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: WorkflowStatus;
  readonly search?: string;
}

@Injectable()
export class WorkflowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Workflows ---

  async findMany(
    organizationId: string,
    params: ListWorkflowsParams,
  ): Promise<{ workflows: (Workflow & { _count: { runs: number } })[]; total: number }> {
    const where: Prisma.WorkflowWhereInput = {
      organizationId,
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? { name: { contains: params.search, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };
    const [workflows, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where,
        include: { _count: { select: { runs: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.workflow.count({ where }),
    ]);
    return { workflows, total };
  }

  findById(id: string, organizationId: string): Promise<Workflow | null> {
    return this.prisma.workflow.findFirst({ where: { id, organizationId, deletedAt: null } });
  }

  existsAnywhere(id: string): Promise<boolean> {
    return this.prisma.workflow.count({ where: { id } }).then((count) => count > 0);
  }

  /** Published workflows triggered by a form — the intake hook's lookup. */
  findPublishedByTriggerForm(formId: string, organizationId: string): Promise<Workflow[]> {
    return this.prisma.workflow.findMany({
      where: {
        triggerFormId: formId,
        organizationId,
        status: WorkflowStatus.PUBLISHED,
        deletedAt: null,
      },
    });
  }

  create(data: {
    name: string;
    description?: string;
    nodes: Prisma.InputJsonValue;
    edges: Prisma.InputJsonValue;
    triggerFormId?: string;
    color?: string;
    organizationId: string;
    createdById: string;
  }): Promise<Workflow> {
    return this.prisma.workflow.create({ data });
  }

  update(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string | null;
      nodes?: Prisma.InputJsonValue;
      edges?: Prisma.InputJsonValue;
      triggerFormId?: string | null;
      color?: string;
      status?: WorkflowStatus;
      version?: number;
    },
  ): Promise<Workflow> {
    return this.prisma.workflow.update({ where: { id, organizationId }, data });
  }

  softDelete(id: string, organizationId: string): Promise<Workflow> {
    return this.prisma.workflow.update({
      where: { id, organizationId },
      data: { deletedAt: new Date(), status: WorkflowStatus.ARCHIVED },
    });
  }

  countPublished(organizationId: string): Promise<number> {
    return this.prisma.workflow.count({
      where: { organizationId, status: WorkflowStatus.PUBLISHED, deletedAt: null },
    });
  }

  // --- Versions ---

  createVersion(data: {
    workflowId: string;
    version: number;
    nodes: Prisma.InputJsonValue;
    edges: Prisma.InputJsonValue;
    publishedBy?: string;
  }): Promise<WorkflowVersion> {
    return this.prisma.workflowVersion.create({ data });
  }

  findVersion(workflowId: string, version: number): Promise<WorkflowVersion | null> {
    return this.prisma.workflowVersion.findUnique({
      where: { workflowId_version: { workflowId, version } },
    });
  }

  // --- Runs ---

  createRun(data: {
    workflowId: string;
    workflowVersion: number;
    organizationId: string;
    status: WorkflowRunStatus;
    state: Prisma.InputJsonValue;
    triggerType: string;
    submissionId?: string;
    error?: string;
  }): Promise<WorkflowRun> {
    return this.prisma.workflowRun.create({ data });
  }

  findRun(id: string): Promise<WorkflowRun | null> {
    return this.prisma.workflowRun.findUnique({ where: { id } });
  }

  updateRun(
    id: string,
    data: {
      status?: WorkflowRunStatus;
      currentNodeId?: string | null;
      state?: Prisma.InputJsonValue;
      error?: string | null;
      startedAt?: Date;
      completedAt?: Date;
    },
  ): Promise<WorkflowRun> {
    return this.prisma.workflowRun.update({ where: { id }, data });
  }

  async findRuns(
    workflowId: string,
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ runs: WorkflowRun[]; total: number }> {
    const where: Prisma.WorkflowRunWhereInput = { workflowId, organizationId };
    const [runs, total] = await this.prisma.$transaction([
      this.prisma.workflowRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.workflowRun.count({ where }),
    ]);
    return { runs, total };
  }

  findRunSteps(runId: string): Promise<WorkflowRunStep[]> {
    return this.prisma.workflowRunStep.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
  }

  createRunStep(data: {
    runId: string;
    nodeId: string;
    nodeType: string;
    status: WorkflowRunStepStatus;
    output?: Prisma.InputJsonValue;
    error?: string;
    durationMs?: number;
  }): Promise<WorkflowRunStep> {
    return this.prisma.workflowRunStep.create({ data });
  }

  /** Tallies blob bytes a run produced — feeds the STORAGE_BYTES live sum. */
  addRunArtifactBytes(runId: string, bytes: number): Promise<WorkflowRun> {
    return this.prisma.workflowRun.update({
      where: { id: runId },
      data: { artifactBytes: { increment: bytes } },
    });
  }

  // --- Approval tokens ---

  createApprovalToken(data: {
    tokenHash: string;
    runId: string;
    nodeId: string;
    organizationId: string;
    assignedTo: string;
    message?: string;
    expiresAt: Date;
  }): Promise<ApprovalToken> {
    return this.prisma.approvalToken.create({ data });
  }

  findApprovalTokenByHash(
    tokenHash: string,
  ): Promise<(ApprovalToken & { run: WorkflowRun & { workflow: Workflow } }) | null> {
    return this.prisma.approvalToken.findUnique({
      where: { tokenHash },
      include: { run: { include: { workflow: true } } },
    });
  }

  markApprovalTokenUsed(
    id: string,
    decision: 'approved' | 'rejected',
    note?: string,
  ): Promise<ApprovalToken> {
    return this.prisma.approvalToken.update({
      where: { id },
      data: { decision, note, usedAt: new Date() },
    });
  }
}
