// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Guards
// Purpose: Per-organisation rate limiting. Authenticated requests are bucketed
// by organizationId rather than client IP so one high-volume org cannot consume
// the quota of other tenants. Public routes fall back to client IP.
// SMB extension (S1): per-plan request budgets resolved from PLAN_ENTITLEMENTS —
// the guard reads the org's cached plan tier and applies its apiRateLimitPerMin.

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class OrgThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as { organizationId?: string } | undefined;
    if (user?.organizationId) {
      return Promise.resolve(user.organizationId);
    }
    // Fall back to IP for unauthenticated / public routes.
    return Promise.resolve((req['ip'] as string | undefined) ?? 'unknown');
  }
}
