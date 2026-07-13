// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Invitations BFF
// Purpose: Accepts an invitation (token + profile + password) — public endpoint.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

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

  try {
    const apiRes = await fetch(`${getApiUrl()}/invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const envelope = (await apiRes.json()) as unknown;
    return NextResponse.json(envelope, { status: apiRes.status });
  } catch (err) {
    console.error('[invitations/accept] upstream API unreachable:', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable. Please try again.' },
      },
      { status: 503 },
    );
  }
}
