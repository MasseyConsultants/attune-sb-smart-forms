// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin Console
// Purpose: SB-016 platform admin console — org list. Server-side role check;
// the API enforces PLATFORM_ADMIN independently, this just avoids rendering
// a console shell that would only 403.

import type { Metadata } from 'next';

import type { UserProfile } from '@attune-sb/shared-types';
import { ShieldAlert } from 'lucide-react';

import { apiGet } from '@/lib/api-server';

import { AdminOrgsList } from './admin-orgs-list';

export const metadata: Metadata = { title: 'Platform Admin' };

export default async function AdminPage(): Promise<React.ReactElement> {
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
        <h1 className="text-2xl font-semibold text-foreground">Platform Admin</h1>
        <p className="text-sm text-muted-foreground">
          Every customer organization: plan, lifecycle state, usage, and support actions.
        </p>
      </div>
      <AdminOrgsList />
    </div>
  );
}
