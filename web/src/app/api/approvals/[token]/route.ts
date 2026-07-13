// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Approvals BFF
// Purpose: Public (no auth cookie) proxy for the approval landing page — the
// emailed token IS the credential. GET returns context, POST records the
// decision and resumes the paused run.

import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/get-api-url';

type Params = { params: Promise<{ token: string }> };

async function proxyPublic(path: string, init: RequestInit): Promise<NextResponse> {
  try {
    const upstream = await fetch(`${getApiUrl()}${path}`, { ...init, cache: 'no-store' });
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

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { token } = await params;
  return proxyPublic(`/public/approvals/${encodeURIComponent(token)}`, { method: 'GET' });
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { token } = await params;
  return proxyPublic(`/public/approvals/${encodeURIComponent(token)}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  });
}
