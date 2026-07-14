// Author: Robert Massey | Created: 2026-07-13 | Module: Admin
// Purpose: Platform admin console (SB-016) — cross-tenant org visibility for
// support. Read-mostly by design: the mutations are legal hold, entitlement
// overrides, and lifecycle restore (delegated to LifecycleService). Every
// mutation logs who did it; impersonation deliberately does not exist at v1.

import {
  AdminEntitlementOverride,
  AdminOrgDetail,
  AdminOrgSummary,
  CreateOverrideRequest,
} from '@attune-sb/shared-types';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntitlementOverride, Prisma } from '@prisma/client';

import { AdminOrgRow, AdminRepository } from './admin.repository';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

function toSummary(row: AdminOrgRow): AdminOrgSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    lifecycleState: row.lifecycleState,
    legalHold: row.legalHoldAt !== null,
    planId: row.subscription?.planId ?? 'trial',
    subscriptionStatus: row.subscription?.status ?? null,
    trialEndsAt: row.subscription?.trialEndsAt?.toISOString() ?? null,
    memberCount: row._count.users,
    formCount: row._count.forms,
    createdAt: row.createdAt.toISOString(),
    purgeScheduledAt: row.purgeScheduledAt?.toISOString() ?? null,
  };
}

function toOverride(row: EntitlementOverride): AdminEntitlementOverride {
  return {
    id: row.id,
    entitlement: row.entitlement,
    value: row.value,
    reason: row.reason,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly repository: AdminRepository,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  async listOrgs(params: {
    search?: string;
    lifecycleState?: string;
    page: number;
    pageSize: number;
  }): Promise<{ orgs: AdminOrgSummary[]; total: number }> {
    const { orgs, total } = await this.repository.findOrgs(params);
    return { orgs: orgs.map(toSummary), total };
  }

  async getOrg(id: string): Promise<AdminOrgDetail> {
    const org = await this.repository.findOrg(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const [members, usage, overrides, counts] = await Promise.all([
      this.repository.findMembers(id),
      this.entitlements.getUsageSummary(id),
      this.repository.findOverrides(id),
      this.repository.findCounts(id),
    ]);

    return {
      ...toSummary(org),
      readOnlyAt: org.readOnlyAt?.toISOString() ?? null,
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        isActive: m.isActive,
        lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
      })),
      usage,
      overrides: overrides.map(toOverride),
      counts,
    };
  }

  async setLegalHold(id: string, hold: boolean, actorId: string): Promise<void> {
    const org = await this.repository.findOrg(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    await this.repository.setLegalHold(id, hold);
    this.logger.warn(
      `admin.legal_hold ${hold ? 'SET' : 'CLEARED'} org=${id} by=${actorId}`,
      'AdminService',
    );
  }

  async createOverride(
    id: string,
    dto: CreateOverrideRequest,
    actorId: string,
  ): Promise<AdminEntitlementOverride> {
    const org = await this.repository.findOrg(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('expiresAt must be a valid ISO date');
    }

    const row = await this.repository.createOverride({
      organizationId: id,
      entitlement: dto.entitlement,
      value: dto.value as Prisma.InputJsonValue,
      reason: dto.reason,
      expiresAt,
    });
    await this.entitlements.invalidate(id);
    this.logger.warn(
      `admin.override.created org=${id} entitlement=${dto.entitlement} value=${JSON.stringify(dto.value)} by=${actorId}`,
      'AdminService',
    );
    return toOverride(row);
  }

  async deleteOverride(orgId: string, overrideId: string, actorId: string): Promise<void> {
    const deleted = await this.repository.deleteOverride(overrideId, orgId);
    if (!deleted) {
      throw new NotFoundException('Override not found');
    }
    await this.entitlements.invalidate(orgId);
    this.logger.warn(
      `admin.override.deleted org=${orgId} override=${overrideId} by=${actorId}`,
      'AdminService',
    );
  }
}
