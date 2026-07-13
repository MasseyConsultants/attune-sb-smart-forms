// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Proxies password reset (token + new password) to the API.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

interface ApiEnvelope {
  readonly success: boolean;
  readonly error?: { readonly code: string; readonly message: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { token?: string; newPassword?: string };
  try {
    body = (await req.json()) as { token?: string; newPassword?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  let apiRes: Response;
  let envelope: ApiEnvelope;
  try {
    apiRes = await fetch(`${getApiUrl()}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    envelope = (await apiRes.json()) as ApiEnvelope;
  } catch (err) {
    console.error('[reset-password] upstream API unreachable:', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable. Please try again.' },
      },
      { status: 503 },
    );
  }

  return NextResponse.json(envelope, { status: apiRes.status });
}
