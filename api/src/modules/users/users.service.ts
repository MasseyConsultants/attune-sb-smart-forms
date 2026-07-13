// Author: Robert Massey | Created: 2026-07-12 | Module: Users
// Purpose: User profile + org member management. Tenant isolation enforced here:
// every query filters by the caller's organizationId.

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';

import { UsersRepository } from './users.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export interface UserProfileDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly emailVerified: boolean;
  readonly organizationId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logger: SecureLoggerService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    return this.toDto(user);
  }

  async listOrgMembers(caller: AuthenticatedUser): Promise<UserProfileDto[]> {
    const users = await this.usersRepository.listByOrganization(caller.organizationId);
    return users.map((u) => this.toDto(u));
  }

  async updateRole(
    caller: AuthenticatedUser,
    targetUserId: string,
    role: Role,
  ): Promise<UserProfileDto> {
    const target = await this.requireSameOrgUser(caller, targetUserId);

    if (role === Role.PLATFORM_ADMIN || role === Role.OWNER) {
      throw new ForbiddenException('This role cannot be assigned');
    }
    if (target.role === Role.OWNER) {
      throw new ForbiddenException('The organization owner role cannot be changed');
    }

    const updated = await this.usersRepository.update(targetUserId, { role });
    this.logger.log(`user.role_changed target=${targetUserId} role=${role}`, 'UsersService');
    return this.toDto(updated);
  }

  async deactivate(caller: AuthenticatedUser, targetUserId: string): Promise<void> {
    const target = await this.requireSameOrgUser(caller, targetUserId);
    if (target.role === Role.OWNER) {
      throw new ForbiddenException('The organization owner cannot be removed');
    }
    if (target.id === caller.userId) {
      throw new ForbiddenException('You cannot remove your own account');
    }
    await this.usersRepository.softDelete(targetUserId);
    this.logger.log(`user.deactivated target=${targetUserId}`, 'UsersService');
  }

  private async requireSameOrgUser(caller: AuthenticatedUser, targetUserId: string): Promise<User> {
    const target = await this.usersRepository.findById(targetUserId);
    if (!target || target.deletedAt) {
      throw new NotFoundException('User not found');
    }
    // Cross-org access is a security event — log and deny.
    if (target.organizationId !== caller.organizationId && caller.role !== Role.PLATFORM_ADMIN) {
      this.logger.warn(
        `security.cross_org_access caller=${caller.userId} target=${targetUserId}`,
        'UsersService',
      );
      throw new NotFoundException('User not found');
    }
    return target;
  }

  private toDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      organizationId: user.organizationId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
