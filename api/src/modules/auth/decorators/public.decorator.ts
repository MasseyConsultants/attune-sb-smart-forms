// Author: Robert Massey | Created: 2026-07-12 | Module: Auth
// Purpose: Marks a route as public — JwtAuthGuard skips token validation.

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
