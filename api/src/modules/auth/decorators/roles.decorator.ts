// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: Declares the minimum role(s) required for a route; enforced by RolesGuard.

import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
