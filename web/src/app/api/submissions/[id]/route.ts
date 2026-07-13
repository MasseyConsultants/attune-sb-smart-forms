// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions BFF
// Purpose: Single-submission detail + delete proxies.

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/submissions/${encodeURIComponent(id)}`);
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/submissions/${encodeURIComponent(id)}`, 'DELETE');
}
