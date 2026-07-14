// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Admin Console

import type { Metadata } from 'next';

import type { UserProfile } from '@attune-sb/shared-types';
import { ShieldAlert } from 'lucide-react';

import { apiGet } from '@/lib/api-server';

import { AdminOrgDetailView } from './admin-org-detail';

export const metadata: Metadata = { title: 'Org Detail — Platform Admin' };

export default async function AdminOrgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const me = await apiGet<UserProfile>('/users/me');
  if (me?.role !== 'PLATFORM_ADMIN') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-dashed p-16 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Platform admin only</p>
      </div>
    );
  }
  return <AdminOrgDetailView orgId={id} />;
}
