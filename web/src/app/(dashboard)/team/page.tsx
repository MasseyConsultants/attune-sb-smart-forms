// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Team
// Purpose: SB-018 team management. Server component gates on ADMIN+ (the API
// enforces @Roles(ADMIN) independently); members see a read-only notice.

import type { Metadata } from 'next';

import type { UserProfile } from '@attune-sb/shared-types';
import { Users } from 'lucide-react';

import { apiGet } from '@/lib/api-server';

import { TeamView } from './team-view';

export const metadata: Metadata = { title: 'Team' };

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'OWNER', 'ADMIN'];

export default async function TeamPage(): Promise<React.ReactElement> {
  const me = await apiGet<UserProfile>('/users/me');
  if (!me || !MANAGER_ROLES.includes(me.role)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
        <Users className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Admins only</p>
        <p className="text-xs text-muted-foreground">
          Ask an organization admin or the owner to manage team members and invitations.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates, manage roles, and keep an eye on your plan&apos;s seats.
        </p>
      </div>
      <TeamView currentUserId={me.id} />
    </div>
  );
}
