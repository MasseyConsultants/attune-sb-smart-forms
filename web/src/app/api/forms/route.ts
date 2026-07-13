// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.search;
  return proxyAuthenticated(req, `/forms${query}`);
}

export function POST(req: NextRequest): Promise<NextResponse> {
  return proxyAuthenticated(req, '/forms', 'POST');
}
