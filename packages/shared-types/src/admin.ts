// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/shared-types
// Purpose: Platform admin console contracts (S9, SB-016). PLATFORM_ADMIN only —
// a read-mostly support surface with lifecycle/legal-hold/override actions.

import type { UsageSummary } from './billing';

export interface AdminOrgSummary {
  id: string;
  name: string;
  slug: string;
  lifecycleState: string;
  legalHold: boolean;
  planId: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  memberCount: number;
  formCount: number;
  createdAt: string;
  purgeScheduledAt: string | null;
}

export interface AdminOrgMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AdminEntitlementOverride {
  id: string;
  entitlement: string;
  value: unknown;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminOrgDetail extends AdminOrgSummary {
  readOnlyAt: string | null;
  members: AdminOrgMember[];
  usage: UsageSummary;
  overrides: AdminEntitlementOverride[];
  counts: {
    submissions: number;
    documentTemplates: number;
    workflows: number;
    workflowRuns: number;
  };
}

export interface CreateOverrideRequest {
  entitlement: string;
  value: number | boolean | string;
  /** Required — every override is a support action with an audit trail. */
  reason: string;
  /** ISO date; omit for a permanent override. */
  expiresAt?: string;
}

/** Attune platform-org staff (PLATFORM_ADMIN peers) — SB-030. */
export interface PlatformStaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PlatformStaffInvite {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: string;
  createdAt: string;
}

export interface PlatformStaffSummary {
  members: PlatformStaffMember[];
  pendingInvites: PlatformStaffInvite[];
  /** Always ≥ 1 while this endpoint is reachable. */
  platformAdminCount: number;
}

export interface InvitePlatformAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
}
