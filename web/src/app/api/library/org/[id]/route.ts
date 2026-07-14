// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Library BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/library/org/${id}`, 'DELETE');
}
