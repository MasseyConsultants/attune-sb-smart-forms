// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/shared-types
// Purpose: Team management contracts (SB-018). Members are UserProfile rows;
// invites are the pending-seat pipeline. Seat caps come from plan limits
// (maxUsers) and are enforced server-side at invite create AND accept.

import { Role } from './roles';

export interface TeamInvite {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  orgId: string;
  invitedById: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CreateInviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  /** Tenant roles at or below the inviter's own level; never OWNER/PLATFORM_ADMIN. */
  role: Role;
}

/** Roles an ADMIN+ can assign to teammates. */
export const ASSIGNABLE_ROLES = [Role.ADMIN, Role.BUILDER, Role.VIEWER] as const;
