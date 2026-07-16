// Author: Robert Massey | Created: 2026-07-16 | Module: Ops
// Purpose: The ONLY Prisma access for the Platform Ops console (SB-025).
// Queries deliberately cross tenants — the controller is PLATFORM_ADMIN-only.

import { Injectable } from '@nestjs/common';
import {
  OpsEvent,
  OpsEventKind,
  OpsEventSeverity,
  Prisma,
  StripeWebhookEvent,
} from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export interface OpsEventFilters {
  kind?: OpsEventKind;
  severity?: OpsEventSeverity;
  type?: string;
  organizationId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface UsageCounterRow {
  organizationId: string;
  meter: string;
  used: bigint;
  periodEnd: Date;
  organization: {
    name: string;
    slug: string;
    subscription: { planId: string } | null;
  };
}

export interface FailedRunRow {
  id: string;
  workflowId: string;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  organizationId: string;
  workflow: { name: string };
  organization: { name: string };
}

export interface BusinessCounts {
  totalOrgs: number;
  activeOrgs: number;
  newOrgs7d: number;
  submissions24h: number;
  workflowRuns24h: number;
  workflowFailures24h: number;
}

@Injectable()
export class OpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createEvent(data: Prisma.OpsEventCreateInput): Promise<OpsEvent> {
    return this.prisma.opsEvent.create({ data });
  }

  async findEvents(filters: OpsEventFilters): Promise<{ events: OpsEvent[]; total: number }> {
    const where: Prisma.OpsEventWhereInput = {
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.search
        ? {
            OR: [
              { message: { contains: filters.search, mode: 'insensitive' } },
              { path: { contains: filters.search, mode: 'insensitive' } },
              { type: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [events, total] = await this.prisma.$transaction([
      this.prisma.opsEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.opsEvent.count({ where }),
    ]);
    return { events, total };
  }

  countEventsSince(kind: OpsEventKind, since: Date): Promise<number> {
    return this.prisma.opsEvent.count({ where: { kind, createdAt: { gte: since } } });
  }

  async deleteEventsBefore(cutoff: Date): Promise<number> {
    const { count } = await this.prisma.opsEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  }

  async pingDatabase(): Promise<number> {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return Date.now() - start;
  }

  async findWebhookEvents(params: {
    page: number;
    pageSize: number;
    type?: string;
  }): Promise<{ events: StripeWebhookEvent[]; total: number }> {
    const where: Prisma.StripeWebhookEventWhereInput = params.type
      ? { type: { contains: params.type, mode: 'insensitive' } }
      : {};
    const [events, total] = await this.prisma.$transaction([
      this.prisma.stripeWebhookEvent.findMany({
        where,
        orderBy: { processedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.stripeWebhookEvent.count({ where }),
    ]);
    return { events, total };
  }

  findCurrentUsageCounters(now: Date): Promise<UsageCounterRow[]> {
    return this.prisma.usageCounter.findMany({
      where: {
        used: { gt: 0 },
        periodEnd: { gte: now },
        organization: { deletedAt: null },
      },
      select: {
        organizationId: true,
        meter: true,
        used: true,
        periodEnd: true,
        organization: {
          select: {
            name: true,
            slug: true,
            subscription: { select: { planId: true } },
          },
        },
      },
    });
  }

  findRecentFailedRuns(limit: number): Promise<FailedRunRow[]> {
    return this.prisma.workflowRun.findMany({
      where: { status: 'FAILED' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        workflowId: true,
        error: true,
        startedAt: true,
        completedAt: true,
        organizationId: true,
        workflow: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });
  }

  async findBusinessCounts(now: Date): Promise<BusinessCounts> {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalOrgs, activeOrgs, newOrgs7d, submissions24h, workflowRuns24h, workflowFailures24h] =
      await this.prisma.$transaction([
        this.prisma.organization.count({ where: { deletedAt: null } }),
        this.prisma.organization.count({ where: { deletedAt: null, lifecycleState: 'ACTIVE' } }),
        this.prisma.organization.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
        this.prisma.submission.count({ where: { createdAt: { gte: dayAgo } } }),
        this.prisma.workflowRun.count({ where: { createdAt: { gte: dayAgo } } }),
        this.prisma.workflowRun.count({
          where: { status: 'FAILED', updatedAt: { gte: dayAgo } },
        }),
      ]);

    return {
      totalOrgs,
      activeOrgs,
      newOrgs7d,
      submissions24h,
      workflowRuns24h,
      workflowFailures24h,
    };
  }
}
