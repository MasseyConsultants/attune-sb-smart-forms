// Author: Robert Massey | Created: 2026-07-13 | Module: Web / BFF
// Purpose: Templates list + multipart upload proxy. The upload forwards the
// browser's FormData stream to the API untouched — the API is the validation
// boundary (MIME, size, plan gates).

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';
import { getApiUrl } from '@/lib/get-api-url';

export function GET(req: NextRequest): Promise<NextResponse> {
  return proxyAuthenticated(req, '/document-templates', 'GET');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  try {
    const formData = await req.formData();
    const upstream = await fetch(`${getApiUrl()}/document-templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
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
