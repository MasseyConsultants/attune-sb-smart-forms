// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflows BFF
// Purpose: Proxies workflow state-machine actions + the runs list. The
// whitelist keeps this route from becoming an open proxy into the API.

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

const POST_ACTIONS = new Set(['publish', 'unpublish']);

type Params = { params: Promise<{ id: string; action: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id, action } = await params;
  if (!POST_ACTIONS.has(action)) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown action' } },
      { status: 404 },
    );
  }
  return proxyAuthenticated(
    req,
    `/workflows/${encodeURIComponent(id)}/${encodeURIComponent(action)}`,
    'POST',
  );
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id, action } = await params;
  if (action !== 'runs') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown action' } },
      { status: 404 },
    );
  }
  const query = req.nextUrl.searchParams.toString();
  return proxyAuthenticated(
    req,
    `/workflows/${encodeURIComponent(id)}/runs${query ? `?${query}` : ''}`,
  );
}
