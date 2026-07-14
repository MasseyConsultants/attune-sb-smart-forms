// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Submissions BFF
// Purpose: Binary passthrough for the org-wide CSV export — the shared JSON
// proxy can't carry file bodies, so this streams the upstream response.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const query = req.nextUrl.searchParams.toString();
  try {
    const upstream = await fetch(`${getApiUrl()}/submissions/export${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      const body: unknown = await upstream.json().catch(() => ({
        success: false,
        error: { code: 'EXPORT_FAILED', message: 'Export failed' },
      }));
      return NextResponse.json(body, { status: upstream.status });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/csv; charset=utf-8',
        'Content-Disposition':
          upstream.headers.get('Content-Disposition') ??
          'attachment; filename="all-submissions.csv"',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: 'API unreachable' } },
      { status: 502 },
    );
  }
}
