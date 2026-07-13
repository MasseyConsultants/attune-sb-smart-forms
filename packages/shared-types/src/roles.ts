// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Simplified SMB role model (MASTER_PLAN §4 RBAC).
// PLATFORM_ADMIN is Attune IT staff; the rest are tenant-scoped.

export enum Role {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  BUILDER = 'BUILDER',
  VIEWER = 'VIEWER',
}

// Numeric hierarchy: higher number = higher privilege. A role satisfies any
// requirement at or below its level (OWNER passes @Roles(Role.BUILDER)).
export const ROLE_LEVEL: Record<Role, number> = {
  [Role.PLATFORM_ADMIN]: 100,
  [Role.OWNER]: 80,
  [Role.ADMIN]: 60,
  [Role.BUILDER]: 40,
  [Role.VIEWER]: 10,
};
