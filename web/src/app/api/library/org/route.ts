// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.toString();
  return proxyAuthenticated(req, `/library/org${query ? `?${query}` : ''}`);
}
