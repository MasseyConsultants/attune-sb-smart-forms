// Author: Robert Massey | Created: 2026-07-16 | Module: Dashboard
// Purpose: Aggregate reads for the workspace home. Prisma lives here only.

import { Injectable } from '@nestjs/common';
import {
  FormStatus,
  Meter,
  OrgLifecycleState,
  Prisma,
  SubmissionStatus,
  WorkflowRunStatus,
} from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export interface DayCountRow {
  readonly date: string;
  readonly count: number;
}

export interface TopFormRow {
  readonly formId: string;
  readonly name: string;
  readonly status: string;
  readonly submissionCount: number;
}

export interface RecentRunRow {
  readonly runId: string;
  readonly workflowId: string;
  readonly workflowName: string;
  readonly status: string;
  readonly startedAt: Date | null;
  readonly createdAt: Date;
}

export interface PendingApprovalRow {
  readonly id: string;
  readonly assignedTo: string;
  readonly message: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly runId: string;
  readonly workflowId: string;
  readonly workflowName: string;
}

export interface FailedRunRow {
  readonly id: string;
  readonly error: string | null;
  readonly createdAt: Date;
  readonly workflowId: string;
  readonly workflowName: string;
}

export interface OrgWorkspaceRow {
  readonly id: string;
  readonly name: string;
  readonly lifecycleState: OrgLifecycleState;
  readonly purgeScheduledAt: Date | null;
  readonly subscription: {
    readonly planId: string;
    readonly status: string;
    readonly trialEndsAt: Date | null;
    readonly currentPeriodEnd: Date | null;
    readonly billingAnchorDay: number;
    readonly seats: number;
    readonly stripeSubscriptionId: string | null;
  } | null;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrgWorkspace(organizationId: string): Promise<OrgWorkspaceRow | null> {
    return this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        lifecycleState: true,
        purgeScheduledAt: true,
        subscription: {
          select: {
            planId: true,
            status: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
            billingAnchorDay: true,
            seats: true,
            stripeSubscriptionId: true,
          },
        },
      },
    });
  }

  countSubmissionsInRange(organizationId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.submission.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: SubmissionStatus.OVER_LIMIT },
        createdAt: { gte: from, lt: to },
      },
    });
  }

  countUsageEventsInRange(
    organizationId: string,
    meter: Meter,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.prisma.usageEvent.count({
      where: {
        organizationId,
        meter,
        createdAt: { gte: from, lt: to },
      },
    });
  }

  countWorkflowRunsInRange(organizationId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.workflowRun.count({
      where: {
        organizationId,
        createdAt: { gte: from, lt: to },
      },
    });
  }

  countPublishedForms(organizationId: string): Promise<number> {
    return this.prisma.form.count({
      where: {
        organizationId,
        deletedAt: null,
        status: FormStatus.PUBLISHED,
      },
    });
  }

  countForms(organizationId: string): Promise<number> {
    return this.prisma.form.count({
      where: { organizationId, deletedAt: null },
    });
  }

  countTemplates(organizationId: string): Promise<number> {
    return this.prisma.documentTemplate.count({
      where: { organizationId, deletedAt: null },
    });
  }

  async countMappedTemplates(organizationId: string): Promise<number> {
    const rows = await this.prisma.documentTemplate.findMany({
      where: { organizationId, deletedAt: null },
      select: { fieldMappings: true },
    });
    return rows.filter((row) => {
      const mappings = row.fieldMappings;
      return Array.isArray(mappings) && mappings.length > 0;
    }).length;
  }

  async hasAnySubmission(organizationId: string): Promise<boolean> {
    const row = await this.prisma.submission.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: SubmissionStatus.OVER_LIMIT },
      },
      select: { id: true },
    });
    return row !== null;
  }

  async hasAnyDocumentFill(organizationId: string): Promise<boolean> {
    const row = await this.prisma.submission.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        filledAt: { not: null },
      },
      select: { id: true },
    });
    return row !== null;
  }

  countWorkflows(organizationId: string): Promise<number> {
    return this.prisma.workflow.count({
      where: { organizationId, deletedAt: null },
    });
  }

  countQuarantined(organizationId: string): Promise<number> {
    return this.prisma.submission.count({
      where: {
        organizationId,
        deletedAt: null,
        status: SubmissionStatus.OVER_LIMIT,
      },
    });
  }

  listPendingApprovals(organizationId: string, take: number): Promise<PendingApprovalRow[]> {
    return this.prisma.approvalToken
      .findMany({
        where: {
          organizationId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          assignedTo: true,
          message: true,
          createdAt: true,
          expiresAt: true,
          runId: true,
          run: {
            select: {
              workflowId: true,
              workflow: { select: { name: true } },
            },
          },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          assignedTo: row.assignedTo,
          message: row.message,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
          runId: row.runId,
          workflowId: row.run.workflowId,
          workflowName: row.run.workflow.name,
        })),
      );
  }

  countPendingApprovals(organizationId: string): Promise<number> {
    return this.prisma.approvalToken.count({
      where: {
        organizationId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  listFailedRuns(organizationId: string, since: Date, take: number): Promise<FailedRunRow[]> {
    return this.prisma.workflowRun
      .findMany({
        where: {
          organizationId,
          status: WorkflowRunStatus.FAILED,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          error: true,
          createdAt: true,
          workflowId: true,
          workflow: { select: { name: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          error: row.error,
          createdAt: row.createdAt,
          workflowId: row.workflowId,
          workflowName: row.workflow.name,
        })),
      );
  }

  countFailedRuns(organizationId: string, since: Date): Promise<number> {
    return this.prisma.workflowRun.count({
      where: {
        organizationId,
        status: WorkflowRunStatus.FAILED,
        createdAt: { gte: since },
      },
    });
  }

  countPendingInvites(organizationId: string): Promise<number> {
    return this.prisma.inviteToken.count({
      where: {
        orgId: organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  countActiveUsers(organizationId: string): Promise<number> {
    return this.prisma.user.count({
      where: { organizationId, deletedAt: null, isActive: true },
    });
  }

  async countSubmissionsByDay(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<DayCountRow[]> {
    const rows = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS date,
               COUNT(*)::bigint AS count
        FROM submissions
        WHERE organization_id = ${organizationId}
          AND deleted_at IS NULL
          AND status <> 'OVER_LIMIT'
          AND created_at >= ${from}
          AND created_at < ${to}
        GROUP BY 1
        ORDER BY 1`,
    );
    return rows.map((row) => ({
      date: toUtcDateKey(row.date),
      count: Number(row.count),
    }));
  }

  async countDocFillsByDay(organizationId: string, from: Date, to: Date): Promise<DayCountRow[]> {
    const rows = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(
      Prisma.sql`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS date,
               COUNT(*)::bigint AS count
        FROM usage_events
        WHERE organization_id = ${organizationId}
          AND meter = 'DOC_FILLS'
          AND created_at >= ${from}
          AND created_at < ${to}
        GROUP BY 1
        ORDER BY 1`,
    );
    return rows.map((row) => ({
      date: toUtcDateKey(row.date),
      count: Number(row.count),
    }));
  }

  async topFormsBySubmissions(
    organizationId: string,
    from: Date,
    to: Date,
    take: number,
  ): Promise<TopFormRow[]> {
    const groups = await this.prisma.submission.groupBy({
      by: ['formId'],
      where: {
        organizationId,
        deletedAt: null,
        status: { not: SubmissionStatus.OVER_LIMIT },
        createdAt: { gte: from, lt: to },
      },
      _count: { _all: true },
    });
    if (groups.length === 0) {
      return [];
    }

    groups.sort((a, b) => b._count._all - a._count._all);
    const top = groups.slice(0, take);

    const forms = await this.prisma.form.findMany({
      where: {
        organizationId,
        id: { in: top.map((g) => g.formId) },
        deletedAt: null,
      },
      select: { id: true, name: true, status: true },
    });
    const byId = new Map(forms.map((f) => [f.id, f]));

    const result: TopFormRow[] = [];
    for (const g of top) {
      const form = byId.get(g.formId);
      if (!form) {
        continue;
      }
      result.push({
        formId: form.id,
        name: form.name,
        status: form.status,
        submissionCount: g._count._all,
      });
    }
    return result;
  }

  countRunsByStatus(
    organizationId: string,
    from: Date,
    to: Date,
    status: WorkflowRunStatus,
  ): Promise<number> {
    return this.prisma.workflowRun.count({
      where: {
        organizationId,
        status,
        createdAt: { gte: from, lt: to },
      },
    });
  }

  listRecentRuns(organizationId: string, take: number): Promise<RecentRunRow[]> {
    return this.prisma.workflowRun
      .findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          status: true,
          startedAt: true,
          createdAt: true,
          workflowId: true,
          workflow: { select: { name: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          runId: row.id,
          workflowId: row.workflowId,
          workflowName: row.workflow.name,
          status: row.status,
          startedAt: row.startedAt,
          createdAt: row.createdAt,
        })),
      );
  }
}

function toUtcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}
