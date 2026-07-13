// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Organization API contracts (web ↔ API). OrganizationProfile is the
// full GET /organizations/me shape; auth responses use the slimmer
// OrganizationSummary from auth.ts.

import type { SubscriptionSummary } from './billing';
import type { OrgLifecycleState } from './plans';

export interface OrganizationProfile {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly lifecycleState: OrgLifecycleState;
  /** Set while read-only — end of the retention window (ISO date) */
  readonly purgeScheduledAt: string | null;
  readonly createdAt: string;
  readonly subscription: SubscriptionSummary | null;
}
