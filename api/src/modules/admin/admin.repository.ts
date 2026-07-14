// Author: Robert Massey | Created: 2026-07-13 | Module: Admin
// Purpose: The ONLY Prisma access for the platform admin console. These
// queries deliberately cross tenants — the controller is PLATFORM_ADMIN-only
// and every access is audit-logged at the service layer.

import { Injectable } from '@nestjs/common';
import {
  EntitlementOverride,
  Organization,
  OrgLifecycleState,
  Prisma,
  Subscription,
  User,
} from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export type AdminOrgRow = Organization & {
  subscription: Subscription | null;
  _count: { users: number; forms: number };
};

export interface AdminOrgCounts {
  submissions: number;
  documentTemplates: number;
  workflows: number;
  workflowRuns: number;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrgs(params: {
    search?: string;
    lifecycleState?: string;
    page: number;
    pageSize: number;
  }): Promise<{ orgs: AdminOrgRow[]; total: number }> {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(params.lifecycleState
        ? { lifecycleState: params.lifecycleState as OrgLifecycleState }
        : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
              { users: { some: { email: { contains: params.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [orgs, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        include: {
          subscription: true,
          _count: {
            select: {
              users: { where: { deletedAt: null } },
              forms: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { orgs, total };
  }

  findOrg(id: string): Promise<AdminOrgRow | null> {
    return this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscription: true,
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            forms: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  findMembers(organizationId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findCounts(organizationId: string): Promise<AdminOrgCounts> {
    const [submissions, documentTemplates, workflows, workflowRuns] =
      await this.prisma.$transaction([
        this.prisma.submission.count({ where: { organizationId, deletedAt: null } }),
        this.prisma.documentTemplate.count({ where: { organizationId, deletedAt: null } }),
        this.prisma.workflow.count({ where: { organizationId, deletedAt: null } }),
        this.prisma.workflowRun.count({ where: { organizationId } }),
      ]);
    return { submissions, documentTemplates, workflows, workflowRuns };
  }

  findOverrides(organizationId: string): Promise<EntitlementOverride[]> {
    return this.prisma.entitlementOverride.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createOverride(data: {
    organizationId: string;
    entitlement: string;
    value: Prisma.InputJsonValue;
    reason: string;
    expiresAt: Date | null;
  }): Promise<EntitlementOverride> {
    return this.prisma.entitlementOverride.create({ data });
  }

  async deleteOverride(id: string, organizationId: string): Promise<boolean> {
    const { count } = await this.prisma.entitlementOverride.deleteMany({
      where: { id, organizationId },
    });
    return count > 0;
  }

  setLegalHold(organizationId: string, hold: boolean): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { legalHoldAt: hold ? new Date() : null },
    });
  }
}
