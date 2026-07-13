// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Exchanges the httpOnly refresh token for a new pair and rewrites
// session cookies. On failure, clears cookies for a clean /login redirect.
// Ported from enterprise.

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';
import { COOKIE_REFRESH_TOKEN } from '../cookie-names';
import { setSessionCookies, clearSessionCookies } from '../set-session-cookies';

interface RefreshApiResponse {
  readonly success: boolean;
  readonly data: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresIn: number;
  };
  readonly error?: { readonly code: string; readonly message: string };
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' } },
      { status: 401 },
    );
  }

  const apiRes = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const envelope = (await apiRes.json()) as RefreshApiResponse;

  if (!apiRes.ok || !envelope.success) {
    clearSessionCookies(cookieStore);
    return NextResponse.json(
      {
        success: false,
        error: envelope.error ?? { code: 'REFRESH_FAILED', message: 'Token refresh failed' },
      },
      { status: 401 },
    );
  }

  setSessionCookies(cookieStore, envelope.data);
  return NextResponse.json({ success: true }, { status: 200 });
}
