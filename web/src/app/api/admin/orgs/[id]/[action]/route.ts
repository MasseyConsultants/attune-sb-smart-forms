// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin BFF
// POST actions on one org: legal-hold, overrides, restore (lifecycle).

import { NextRequest, NextResponse } from 'next/server';

import { proxyAuthenticated } from '@/lib/bff-proxy';

const ACTIONS: Record<string, (id: string) => string> = {
  'legal-hold': (id) => `/admin/orgs/${id}/legal-hold`,
  overrides: (id) => `/admin/orgs/${id}/overrides`,
  restore: (id) => `/admin/lifecycle/orgs/${id}/restore`,
  'purge-request': (id) => `/admin/lifecycle/orgs/${id}/purge-request`,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
): Promise<NextResponse> {
  const { id, action } = await params;
  const toPath = ACTIONS[action];
  if (!toPath) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown admin action' } },
      { status: 404 },
    );
  }
  return proxyAuthenticated(req, toPath(id), 'POST');
}
