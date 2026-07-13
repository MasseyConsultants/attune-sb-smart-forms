// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements / Guard
// Purpose: Enforces @RequireEntitlement() boolean gates. Runs after JwtAuthGuard
// and RolesGuard in the global guard order (JWT → Roles → Entitlements →
// OrgThrottler). Routes without the decorator pass through untouched — metered
// limits are enforced in services via assertMeterAvailable(), not here.

import type { PlanFeatures } from '@attune-sb/shared-types';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_ENTITLEMENT_KEY } from './decorators/require-entitlement.decorator';
import { EntitlementsService } from './entitlements.service';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Injectable()
export class EntitlementsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const features = this.reflector.getAllAndOverride<(keyof PlanFeatures)[] | undefined>(
      REQUIRE_ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!features || features.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user?.organizationId) {
      // Public/unauthenticated routes cannot carry entitlement gates; JwtAuthGuard
      // has already rejected unauthenticated access to non-public routes.
      return true;
    }

    for (const feature of features) {
      await this.entitlementsService.requireFeature(user.organizationId, feature);
    }
    return true;
  }
}
