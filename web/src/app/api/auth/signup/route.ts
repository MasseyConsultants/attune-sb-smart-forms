// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Proxies self-serve signup to the NestJS API and establishes the session
// immediately — new owners land in their trial workspace without a separate login.

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';
import { setSessionCookies } from '../set-session-cookies';

interface SignupApiResponse {
  readonly success: boolean;
  readonly data: {
    readonly userId: string;
    readonly email: string;
    readonly organizationId: string;
    readonly trialEndsAt: string;
    readonly tokens: {
      readonly accessToken: string;
      readonly refreshToken: string;
      readonly expiresIn: number;
    };
  };
  readonly error?: { readonly code: string; readonly message: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  let apiRes: Response;
  let envelope: SignupApiResponse;
  try {
    apiRes = await fetch(`${getApiUrl()}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    envelope = (await apiRes.json()) as SignupApiResponse;
  } catch (err) {
    console.error('[signup] upstream API unreachable or returned non-JSON:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Signup service is unavailable. Please try again.',
        },
      },
      { status: 503 },
    );
  }

  if (!apiRes.ok || !envelope.success) {
    return NextResponse.json(
      {
        success: false,
        error: envelope.error ?? { code: 'SIGNUP_FAILED', message: 'Signup failed' },
      },
      { status: apiRes.status },
    );
  }

  const { tokens, userId, email, organizationId, trialEndsAt } = envelope.data;

  const cookieStore = await cookies();
  setSessionCookies(cookieStore, tokens);

  return NextResponse.json(
    // New signups are always the org OWNER
    { success: true, data: { userId, email, role: 'OWNER', organizationId, trialEndsAt } },
    { status: 201 },
  );
}
