// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Server Util
// Purpose: Single source of truth for the NestJS API base URL used by server-side
// Next.js route handlers. Ported from enterprise.
//
// Priority order:
//   1. INTERNAL_API_URL — docker-internal URL for deployed environments
//   2. NEXT_PUBLIC_API_URL — build-time fallback for local dev
//   3. Hard-coded localhost — last resort

export function getApiUrl(): string {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001/api/v1'
  );
}
