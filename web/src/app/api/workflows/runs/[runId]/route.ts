// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflows BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

type Params = { params: Promise<{ runId: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { runId } = await params;
  return proxyAuthenticated(req, `/workflows/runs/${encodeURIComponent(runId)}`);
}
