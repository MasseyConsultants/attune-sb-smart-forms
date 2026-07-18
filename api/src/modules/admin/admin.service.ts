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
  InvitePlatformAdminRequest,
  PlatformStaffSummary,
} from '@attune-sb/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntitlementOverride, Prisma, Role } from '@prisma/client';

import { AdminOrgRow, AdminRepository } from './admin.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { InvitationsService } from '@/modules/invitations/invitations.service';

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
    private readonly invitations: InvitationsService,
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

  // --- Platform staff (SB-030) ---

  async listPlatformStaff(caller: AuthenticatedUser): Promise<PlatformStaffSummary> {
    const orgId = caller.organizationId;
    const [members, pendingInvites, platformAdminCount] = await Promise.all([
      this.repository.listPlatformOrgMembers(orgId),
      this.repository.listPendingPlatformInvites(orgId),
      this.repository.countPlatformAdmins(orgId),
    ]);

    return {
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        isActive: m.isActive,
        lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      pendingInvites: pendingInvites.map((i) => ({
        id: i.id,
        email: i.email,
        firstName: i.firstName,
        lastName: i.lastName,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
      platformAdminCount,
    };
  }

  async invitePlatformAdmin(
    caller: AuthenticatedUser,
    dto: InvitePlatformAdminRequest,
  ): Promise<{ id: string; email: string }> {
    const result = await this.invitations.createPlatformAdminInvite(
      caller,
      dto.email.trim().toLowerCase(),
      dto.firstName.trim(),
      dto.lastName.trim(),
    );
    this.logger.warn(
      `admin.platform_staff.invited email=${result.email} by=${caller.userId}`,
      'AdminService',
    );
    return result;
  }

  async grantPlatformAdmin(caller: AuthenticatedUser, userId: string): Promise<void> {
    const target = await this.repository.findUserInOrg(caller.organizationId, userId);
    if (!target) {
      throw new NotFoundException('User not found in the platform organization');
    }
    if (target.role === Role.PLATFORM_ADMIN) {
      throw new BadRequestException('User is already a platform admin');
    }

    await this.repository.updateUserRole(userId, Role.PLATFORM_ADMIN);
    this.logger.warn(
      `admin.platform_staff.granted target=${userId} by=${caller.userId}`,
      'AdminService',
    );
  }

  async revokePlatformAdmin(caller: AuthenticatedUser, userId: string): Promise<void> {
    if (userId === caller.userId) {
      throw new ForbiddenException('You cannot revoke your own platform admin role');
    }

    const target = await this.repository.findUserInOrg(caller.organizationId, userId);
    if (!target) {
      throw new NotFoundException('User not found in the platform organization');
    }
    if (target.role !== Role.PLATFORM_ADMIN) {
      throw new BadRequestException('User is not a platform admin');
    }

    const adminCount = await this.repository.countPlatformAdmins(caller.organizationId);
    if (adminCount <= 1) {
      throw new ForbiddenException('Cannot revoke the last platform admin');
    }

    // Demote to ADMIN — still a platform-org member, no customer-console access.
    await this.repository.updateUserRole(userId, Role.ADMIN);
    this.logger.warn(
      `admin.platform_staff.revoked target=${userId} by=${caller.userId}`,
      'AdminService',
    );
  }
}
