// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Shared cookie-writing logic for login and signup route handlers.
// Converts an API token pair into httpOnly session cookies. The browser never
// reads tokens directly — session_active is the only JS-visible signal.

import type { cookies } from 'next/headers';

import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_SESSION_ACTIVE,
  COOKIE_ACCESS_EXP,
} from './cookie-names';

const IS_PROD = process.env.NODE_ENV === 'production';

/** Maximum session lifetime from login — forces re-auth after this window. */
export const SESSION_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export function setSessionCookies(cookieStore: CookieStore, tokens: TokenPair): void {
  // access_token — httpOnly; TTL matches API access token (15 min)
  cookieStore.set(COOKIE_ACCESS_TOKEN, tokens.accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: tokens.expiresIn,
  });

  // access_token_exp — readable by middleware for proactive refresh
  cookieStore.set(COOKIE_ACCESS_EXP, String(Math.floor(Date.now() / 1000) + tokens.expiresIn), {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: tokens.expiresIn + 60,
  });

  // refresh_token — httpOnly; capped at the 12-hour session window
  cookieStore.set(COOKIE_REFRESH_TOKEN, tokens.refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  // session_active — NOT httpOnly; UI hint only, contains no sensitive data
  cookieStore.set(COOKIE_SESSION_ACTIVE, '1', {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookies(cookieStore: CookieStore): void {
  const opts = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 0,
  };
  cookieStore.set(COOKIE_ACCESS_TOKEN, '', opts);
  cookieStore.set(COOKIE_REFRESH_TOKEN, '', opts);
  cookieStore.set(COOKIE_SESSION_ACTIVE, '', { ...opts, httpOnly: false });
  cookieStore.set(COOKIE_ACCESS_EXP, '', { ...opts, httpOnly: false });
}
