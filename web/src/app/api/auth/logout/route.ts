// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Clears all auth cookies and revokes refresh tokens server-side.
// Cookie clearing happens regardless of API availability — a broken API
// connection must not trap a user in a session. Ported from enterprise.

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';
import { COOKIE_ACCESS_TOKEN } from '../cookie-names';
import { clearSessionCookies } from '../set-session-cookies';

// GET handler: graceful redirect when a user navigates directly to this URL.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

  // Best-effort API logout — revokes refresh tokens server-side.
  if (accessToken) {
    void fetch(`${getApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }

  clearSessionCookies(cookieStore);

  // 303 redirect: native <form> submissions land on the branded login page.
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
  return NextResponse.redirect(new URL('/login?signedOut=1', base), { status: 303 });
}
