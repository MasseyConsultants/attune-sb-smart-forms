// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions BFF
// Purpose: Binary passthrough for CSV/XLSX exports — the shared JSON proxy
// can't carry file bodies, so this streams the upstream response verbatim
// (content type + attachment disposition included).

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const format = req.nextUrl.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  try {
    const upstream = await fetch(
      `${getApiUrl()}/forms/${encodeURIComponent(id)}/submissions/export?format=${format}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
    );
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
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
        'Content-Disposition':
          upstream.headers.get('Content-Disposition') ?? `attachment; filename="export.${format}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: 'API unreachable' } },
      { status: 502 },
    );
  }
}
