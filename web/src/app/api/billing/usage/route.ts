// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export function GET(req: NextRequest): Promise<NextResponse> {
  return proxyAuthenticated(req, '/billing/usage');
}
