// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Auth request/response contracts shared by API and web BFF.

import type { Role } from './roles';

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  /** Terms/privacy consent — required, recorded with a timestamp server-side */
  acceptedTerms: boolean;
}

export interface LoginResponse {
  userId: string;
  email: string;
  role: Role;
  organizationId: string;
  firstName: string;
  lastName: string;
  tokens: AuthTokenPair;
}

export interface SignupResponse {
  userId: string;
  email: string;
  organizationId: string;
  trialEndsAt: string;
  tokens: AuthTokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  lifecycleState: string;
  createdAt: string;
}
