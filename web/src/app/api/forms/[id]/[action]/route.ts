// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms BFF
// Purpose: Proxies form state-machine actions. The whitelist keeps this route
// from becoming an open proxy into the API.

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

const ALLOWED_ACTIONS = new Set([
  'publish',
  'unpublish',
  'republish',
  'archive',
  'duplicate',
  'slug',
  'versions',
]);

type Params = { params: Promise<{ id: string; action: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id, action } = await params;
  if (!ALLOWED_ACTIONS.has(action) || action === 'versions') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown action' } },
      { status: 404 },
    );
  }
  return proxyAuthenticated(
    req,
    `/forms/${encodeURIComponent(id)}/${encodeURIComponent(action)}`,
    'POST',
  );
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id, action } = await params;
  if (action !== 'versions') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown action' } },
      { status: 404 },
    );
  }
  return proxyAuthenticated(req, `/forms/${encodeURIComponent(id)}/versions`);
}
