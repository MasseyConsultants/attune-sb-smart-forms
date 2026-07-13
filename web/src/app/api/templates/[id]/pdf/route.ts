// Author: Robert Massey | Created: 2026-07-13 | Module: Web / BFF
// Purpose: Streams the template PDF for the canvas renderer — binary
// passthrough, not the JSON envelope proxy.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(`${getApiUrl()}/document-templates/${id}/pdf`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template PDF unavailable' } },
        { status: upstream.status },
      );
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: 'API unreachable' } },
      { status: 502 },
    );
  }
}
