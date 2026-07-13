// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Middleware
// Purpose: Auth gating and proactive token refresh. Ported from enterprise
// (see that file's six-point strategy notes); SMB additions: /signup, legal
// pages, and public form fill (/f/*) are public.

import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/verify-email',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/f/', // public form fill pages — unauthenticated by design
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/invitations',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
];

const COOKIE_ACCESS_TOKEN = 'access_token';
const COOKIE_REFRESH_TOKEN = 'refresh_token';
const COOKIE_SESSION_ACTIVE = 'session_active';
const COOKIE_ACCESS_EXP = 'access_token_exp';
const COOKIE_REFRESHING = 'token_refreshing';

// 30 s gives one comfortable refresh cycle without triggering on nearly every navigation.
const REFRESH_AHEAD_SECS = 30;

// Maximum session lifetime; refresh tokens + session_active share this TTL.
const SESSION_MAX_AGE = 12 * 60 * 60;

const API_URL =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const IS_PROD = process.env.NODE_ENV === 'production';

interface RefreshData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type RefreshOutcome = { ok: true; data: RefreshData } | { ok: false; hardLogout: boolean };

async function silentRefresh(req: NextRequest): Promise<RefreshOutcome> {
  const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  if (!refreshToken) return { ok: false, hardLogout: true };

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, hardLogout: true };
    }
    if (!res.ok) {
      return { ok: false, hardLogout: false }; // transient — don't log out
    }

    const envelope = (await res.json()) as { success: boolean; data: RefreshData };
    if (!envelope.success) return { ok: false, hardLogout: true };
    return { ok: true, data: envelope.data };
  } catch {
    return { ok: false, hardLogout: false };
  }
}

/** True if the access token is absent or will expire within REFRESH_AHEAD_SECS. */
function tokenNeedsRefresh(req: NextRequest): boolean {
  const accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (!accessToken) return true;

  const expCookie = req.cookies.get(COOKIE_ACCESS_EXP)?.value;
  if (!expCookie) return true;

  const expSecs = parseInt(expCookie, 10);
  if (isNaN(expSecs)) return true;

  const nowSecs = Math.floor(Date.now() / 1000);
  return expSecs - nowSecs < REFRESH_AHEAD_SECS;
}

function applyRefreshCookies(res: NextResponse, data: RefreshData): void {
  const opts = { httpOnly: true, secure: IS_PROD, sameSite: 'strict' as const, path: '/' };
  res.cookies.set(COOKIE_ACCESS_TOKEN, data.accessToken, { ...opts, maxAge: data.expiresIn });
  res.cookies.set(COOKIE_REFRESH_TOKEN, data.refreshToken, { ...opts, maxAge: SESSION_MAX_AGE });
  res.cookies.set(COOKIE_ACCESS_EXP, String(Math.floor(Date.now() / 1000) + data.expiresIn), {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: data.expiresIn + 60,
  });
  res.cookies.set(COOKIE_SESSION_ACTIVE, '1', {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  res.cookies.set(COOKIE_REFRESHING, '', { path: '/', maxAge: 0 });
}

function hardLogout(req: NextRequest, pathname: string): NextResponse {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('from', pathname);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(COOKIE_SESSION_ACTIVE, '', { path: '/', maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH_TOKEN, '', { path: '/', maxAge: 0, httpOnly: true });
  res.cookies.set(COOKIE_ACCESS_TOKEN, '', { path: '/', maxAge: 0, httpOnly: true });
  res.cookies.set(COOKIE_ACCESS_EXP, '', { path: '/', maxAge: 0 });
  res.cookies.set(COOKIE_REFRESHING, '', { path: '/', maxAge: 0 });
  return res;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionActive = req.cookies.get(COOKIE_SESSION_ACTIVE)?.value;

  if (!sessionActive) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Concurrent-request guard: another request is already refreshing — serve
  // optimistically; new cookies arrive on the next request cycle.
  const alreadyRefreshing = req.cookies.get(COOKIE_REFRESHING)?.value;
  if (alreadyRefreshing) {
    return NextResponse.next();
  }

  if (tokenNeedsRefresh(req)) {
    const outcome = await silentRefresh(req);

    if (outcome.ok) {
      // Inject the fresh token into the forwarded request headers so server
      // components see it in the SAME request — no redirect, no flicker.
      const nowSecs = Math.floor(Date.now() / 1000);
      const updatedCookies = (req.headers.get('cookie') ?? '')
        .split(';')
        .map((c) => c.trim())
        .filter(
          (c) =>
            c.length > 0 &&
            !c.startsWith(`${COOKIE_ACCESS_TOKEN}=`) &&
            !c.startsWith(`${COOKIE_ACCESS_EXP}=`) &&
            !c.startsWith(`${COOKIE_SESSION_ACTIVE}=`) &&
            !c.startsWith(`${COOKIE_REFRESHING}=`),
        )
        .concat([
          `${COOKIE_ACCESS_TOKEN}=${outcome.data.accessToken}`,
          `${COOKIE_ACCESS_EXP}=${String(nowSecs + outcome.data.expiresIn)}`,
          `${COOKIE_SESSION_ACTIVE}=1`,
        ])
        .join('; ');

      const forwardedHeaders = new Headers(req.headers);
      forwardedHeaders.set('cookie', updatedCookies);

      const res = NextResponse.next({ request: { headers: forwardedHeaders } });
      applyRefreshCookies(res, outcome.data);
      return res;
    }

    if (outcome.hardLogout) {
      // 401/403 from refresh: either genuinely revoked, or we lost a concurrent
      // rotation race. If the existing access token is still in its window,
      // serve with it; otherwise both tokens are dead — hard logout.
      const accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
      if (accessToken) {
        const expCookie = req.cookies.get(COOKIE_ACCESS_EXP)?.value;
        const expSecs = expCookie ? parseInt(expCookie, 10) : 0;
        const nowSecs = Math.floor(Date.now() / 1000);
        if (!isNaN(expSecs) && expSecs > nowSecs) {
          return NextResponse.next();
        }
      }
      return hardLogout(req, pathname);
    }

    // Transient API error — serve anyway; set the guard so concurrent requests
    // skip redundant refresh attempts.
    const res = NextResponse.next();
    res.cookies.set(COOKIE_REFRESHING, '1', { path: '/', maxAge: 8, httpOnly: false });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|eot)$).*)',
  ],
};
