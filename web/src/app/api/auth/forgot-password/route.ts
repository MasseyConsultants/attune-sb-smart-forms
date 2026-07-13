// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Auth BFF
// Purpose: Proxies forgot-password requests. Always returns success to the browser
// (the API already anti-enumerates; this preserves that property).

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  try {
    await fetch(`${getApiUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email }),
    });
  } catch (err) {
    console.error('[forgot-password] upstream API unreachable:', err);
  }

  // Uniform response regardless of outcome — no user enumeration.
  return NextResponse.json({ success: true }, { status: 200 });
}
