// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Forms BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/forms/${encodeURIComponent(id)}`);
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/forms/${encodeURIComponent(id)}`, 'PATCH');
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/forms/${encodeURIComponent(id)}`, 'DELETE');
}
