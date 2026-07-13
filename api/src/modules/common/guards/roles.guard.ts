// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Guards
// Purpose: Enforces role-based access using @Roles() metadata.
// Numeric hierarchy so higher-privilege roles automatically satisfy lower
// requirements — e.g., OWNER passes @Roles(Role.BUILDER). When no @Roles()
// metadata is present the guard passes, deferring to JwtAuthGuard.
// Ported from enterprise, remapped to the simplified SMB role model.

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

// Numeric hierarchy: higher number = higher privilege.
const ROLE_LEVEL: Record<Role, number> = {
  [Role.PLATFORM_ADMIN]: 100,
  [Role.OWNER]: 80,
  [Role.ADMIN]: 60,
  [Role.BUILDER]: 40,
  [Role.VIEWER]: 10,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() metadata → this guard is a no-op; pass through.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // Guard runs after JwtAuthGuard, so user is always populated on protected routes.
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // The user's level must be >= the minimum required level among listed roles,
    // matching the "BUILDER+" convention used throughout the API contract.
    const minRequired = Math.min(...requiredRoles.map((r) => ROLE_LEVEL[r]));
    const userLevel = ROLE_LEVEL[user.role as Role] ?? 0;

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    return true;
  }
}
