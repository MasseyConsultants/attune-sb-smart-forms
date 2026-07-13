// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: Injects the authenticated user (populated by JwtStrategy) into a handler param.

import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import type { AuthenticatedUser } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
