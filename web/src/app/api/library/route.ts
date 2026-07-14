// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library BFF
// The curated gallery browse is public upstream — no auth cookie required.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.toString();
  try {
    const upstream = await fetch(`${getApiUrl()}/library${query ? `?${query}` : ''}`, {
      cache: 'no-store',
    });
    const body: unknown = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: 'API unreachable' } },
      { status: 502 },
    );
  }
}
