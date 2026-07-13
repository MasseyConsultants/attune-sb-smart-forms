// Author: Robert Massey | Created: 2026-07-13 | Module: Web / BFF

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/document-templates/${id}`, 'GET');
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/document-templates/${id}`, 'PATCH');
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthenticated(req, `/document-templates/${id}`, 'DELETE');
}
