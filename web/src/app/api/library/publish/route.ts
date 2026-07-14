// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxyAuthenticated(req, '/library/publish', 'POST');
}
