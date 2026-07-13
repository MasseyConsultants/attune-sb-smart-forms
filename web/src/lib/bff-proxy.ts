// Author: Robert Massey | Created: 2026-07-12 | Module: Web / BFF Proxy
// Purpose: Shared helper for authenticated BFF route handlers — reads the
// httpOnly access-token cookie and proxies to the NestJS API with a Bearer
// header, passing the upstream envelope and status straight through.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from './get-api-url';

export async function proxyAuthenticated(
  req: NextRequest,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
): Promise<NextResponse> {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  };
  if (method !== 'GET' && method !== 'DELETE') {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(`${getApiUrl()}${path}`, init);
    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const body: unknown = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: 'API unreachable' } },
      { status: 502 },
    );
  }
}
