// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Server API Client
// Purpose: Server-component fetch helper — reads the httpOnly access token cookie
// and calls the NestJS API with a Bearer header. Never usable from client code.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getApiUrl } from './get-api-url';

interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: { readonly code: string; readonly message: string };
}

/**
 * GET a resource from the API as the current user.
 * Redirects to logout (which clears cookies, then lands on /login) on 401.
 * Returns null on other failures so pages can render a degraded state.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    redirect('/api/auth/logout');
  }

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (res.status === 401) {
    redirect('/api/auth/logout');
  }
  if (!res.ok) {
    return null;
  }

  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.success ? envelope.data : null;
}
