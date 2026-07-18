// Author: Robert Massey | Created: 2026-07-18 | Module: Web / Admin BFF
// Purpose: Platform staff list + invite (SB-030).

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return proxyAuthenticated(req, '/admin/platform-staff');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxyAuthenticated(req, '/admin/platform-staff/invite', 'POST');
}
