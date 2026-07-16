// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops
// Purpose: SB-025 Platform Ops console — observability & troubleshooting for
// platform staff. Server-side role check; the API enforces PLATFORM_ADMIN
// independently, this just avoids rendering a shell that would only 403.

import type { Metadata } from 'next';

import type { UserProfile } from '@attune-sb/shared-types';
import { ShieldAlert } from 'lucide-react';

import { apiGet } from '@/lib/api-server';

import { OpsConsole } from './ops-console';

export const metadata: Metadata = { title: 'Platform Ops' };

export default async function AdminOpsPage(): Promise<React.ReactElement> {
  const me = await apiGet<UserProfile>('/users/me');
  if (me?.role !== 'PLATFORM_ADMIN') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Platform admin only</p>
        <p className="text-xs text-muted-foreground">
          This console is reserved for Attune platform staff.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform Ops</h1>
        <p className="text-sm text-muted-foreground">
          System health, traffic, error &amp; security ledger, queues, webhooks, and usage hotspots.
        </p>
      </div>
      <OpsConsole />
    </div>
  );
}
