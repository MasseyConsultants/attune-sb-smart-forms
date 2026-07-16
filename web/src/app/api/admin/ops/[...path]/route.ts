// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops BFF
// Purpose: Single catch-all proxy for the Platform Ops console (SB-025).
// The NestJS controller enforces PLATFORM_ADMIN; this only forwards to the
// allow-listed /admin/ops surface.

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

const GET_ENDPOINTS = new Set(['overview', 'events', 'queues', 'webhooks', 'usage-hotspots']);
// POST  queues/:queue/jobs/:jobId/retry
const RETRY_PATTERN = /^queues\/[^/]+\/jobs\/[^/]+\/retry$/;
// DELETE queues/:queue/jobs/:jobId
const DISCARD_PATTERN = /^queues\/[^/]+\/jobs\/[^/]+$/;

function notFound(): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: 'Unknown ops endpoint' } },
    { status: 404 },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const joined = path.join('/');
  if (!GET_ENDPOINTS.has(joined)) {
    return notFound();
  }
  const query = req.nextUrl.searchParams.toString();
  return proxyAuthenticated(req, `/admin/ops/${joined}${query ? `?${query}` : ''}`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const joined = path.join('/');
  if (!RETRY_PATTERN.test(joined)) {
    return notFound();
  }
  return proxyAuthenticated(req, `/admin/ops/${joined}`, 'POST');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const joined = path.join('/');
  if (!DISCARD_PATTERN.test(joined)) {
    return notFound();
  }
  return proxyAuthenticated(req, `/admin/ops/${joined}`, 'DELETE');
}
