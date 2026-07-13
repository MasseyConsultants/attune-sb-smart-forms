// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Invitations BFF
// Purpose: Validates an invite token (public — called from the accept-invite page).

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  try {
    const apiRes = await fetch(
      `${getApiUrl()}/invitations/validate?token=${encodeURIComponent(token)}`,
    );
    const envelope = (await apiRes.json()) as unknown;
    return NextResponse.json(envelope, { status: apiRes.status });
  } catch (err) {
    console.error('[invitations/validate] upstream API unreachable:', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable. Please try again.' },
      },
      { status: 503 },
    );
  }
}
