// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Guards
// Purpose: Per-organisation rate limiting. Authenticated requests are bucketed
// by organizationId rather than client IP so one high-volume org cannot consume
// the quota of other tenants. Public routes fall back to client IP.
// S2: the per-minute ('long') budget comes from the org's plan —
// PLAN_ENTITLEMENTS.limits.apiRateLimitPerMin. Resource throttling and payment
// are the same axis.

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';

import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

const PLAN_SCOPED_THROTTLER = 'long';

@Injectable()
export class OrgThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as { organizationId?: string } | undefined;
    if (user?.organizationId) {
      return Promise.resolve(user.organizationId);
    }
    // Fall back to IP for unauthenticated / public routes.
    return Promise.resolve((req['ip'] as string | undefined) ?? 'unknown');
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
    getTracker: ThrottlerGetTrackerFunction,
    generateKey: ThrottlerGenerateKeyFunction,
  ): Promise<boolean> {
    let effectiveLimit = limit;

    if (throttler.name === PLAN_SCOPED_THROTTLER) {
      const { req } = this.getRequestResponse(context);
      const user = req['user'] as { organizationId?: string } | undefined;
      if (user?.organizationId) {
        try {
          const snapshot = await this.entitlements.getPlanSnapshot(user.organizationId);
          effectiveLimit = snapshot.definition.limits.apiRateLimitPerMin;
        } catch {
          // Plan lookup failure must not take the API down — keep the static limit.
        }
      }
    }

    return super.handleRequest(context, effectiveLimit, ttl, throttler, getTracker, generateKey);
  }
}
