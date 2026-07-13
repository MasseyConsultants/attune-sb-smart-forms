// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Submissions BFF
// Purpose: Proxies the org-scoped submissions list for a form. Static segment
// wins over the sibling [action] route, so this never collides with it.

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(
    req,
    `/forms/${encodeURIComponent(id)}/submissions${req.nextUrl.search}`,
  );
}
