// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; overrideId: string }> },
): Promise<NextResponse> {
  const { id, overrideId } = await params;
  return proxyAuthenticated(req, `/admin/orgs/${id}/overrides/${overrideId}`, 'DELETE');
}
