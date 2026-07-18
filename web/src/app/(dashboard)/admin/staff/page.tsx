// Author: Robert Massey | Created: 2026-07-18 | Module: Web / Admin
// Purpose: Platform staff management — invite/grant/revoke PLATFORM_ADMIN (SB-030).

import type { Metadata } from 'next';

import type { UserProfile } from '@attune-sb/shared-types';
import { ShieldAlert } from 'lucide-react';

import { apiGet } from '@/lib/api-server';

import { PlatformStaffView } from './platform-staff-view';

export const metadata: Metadata = { title: 'Platform Staff' };

export default async function PlatformStaffPage(): Promise<React.ReactElement> {
  const me = await apiGet<UserProfile>('/users/me');
  if (me?.role !== 'PLATFORM_ADMIN') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Platform admin only</p>
        <p className="text-xs text-muted-foreground">
          Only platform admins can manage Attune staff access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform staff</h1>
        <p className="text-sm text-muted-foreground">
          Invite colleagues as platform admins so they can help with ops and customer support.
        </p>
      </div>
      <PlatformStaffView currentUserId={me.id} />
    </div>
  );
}
