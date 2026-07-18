// Author: Robert Massey | Created: 2026-07-18 | Module: Web / Admin BFF
// Purpose: Grant or revoke PLATFORM_ADMIN for a platform-org member.

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; action: string }> },
): Promise<NextResponse> {
  const { userId, action } = await params;
  if (action !== 'grant' && action !== 'revoke') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown staff action' } },
      { status: 404 },
    );
  }
  return proxyAuthenticated(req, `/admin/platform-staff/${userId}/${action}`, 'POST');
}
