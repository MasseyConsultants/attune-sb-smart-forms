// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Team BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/invitations/${id}/resend`, 'POST');
}
