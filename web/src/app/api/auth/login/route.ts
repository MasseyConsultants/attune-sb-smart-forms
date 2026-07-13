// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Proxies login credentials to the NestJS API server-side, then converts
// the returned JWT pair into httpOnly cookies. Ported from enterprise (SMB LoginDto
// uses email, not identifier).

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';
import { setSessionCookies } from '../set-session-cookies';

interface LoginApiResponse {
  readonly success: boolean;
  readonly data: {
    readonly userId: string;
    readonly email: string;
    readonly role: string;
    readonly organizationId: string;
    readonly mustChangePassword: boolean;
    readonly tokens: {
      readonly accessToken: string;
      readonly refreshToken: string;
      readonly expiresIn: number;
    };
  };
  readonly error?: { readonly code: string; readonly message: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  let apiRes: Response;
  let envelope: LoginApiResponse;
  try {
    apiRes = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    envelope = (await apiRes.json()) as LoginApiResponse;
  } catch (err) {
    console.error('[login] upstream API unreachable or returned non-JSON:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Authentication service is unavailable. Please try again.',
        },
      },
      { status: 503 },
    );
  }

  if (!apiRes.ok || !envelope.success) {
    return NextResponse.json(
      {
        success: false,
        error: envelope.error ?? { code: 'LOGIN_FAILED', message: 'Login failed' },
      },
      { status: apiRes.status },
    );
  }

  const { tokens, userId, email, role, organizationId } = envelope.data;

  const cookieStore = await cookies();
  setSessionCookies(cookieStore, tokens);

  // Return identity only — tokens stay server-side in cookies
  return NextResponse.json(
    { success: true, data: { userId, email, role, organizationId } },
    { status: 200 },
  );
}
