// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Dashboard Layout
// Purpose: Authenticated app shell — themed sidebar + topbar. Sprint 0 version is
// deliberately lean: nav entries for future sections render as disabled placeholders
// until their sprints land (forms S3, documents S5, workflows S7, billing S2).

import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, FileText, FileStack, Workflow, CreditCard, Users } from 'lucide-react';
import type { OrganizationProfile } from '@attune-sb/shared-types';

import { BRAND } from '@/lib/brand';
import { apiGet } from '@/lib/api-server';
import { ReadOnlyBanner } from '@/components/billing/read-only-banner';
import { LogoutButton } from './logout-button';

interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly enabled: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    enabled: true,
  },
  { label: 'Forms', href: '/forms', icon: <FileText className="h-4 w-4" />, enabled: true },
  {
    label: 'Templates',
    href: '/templates',
    icon: <FileStack className="h-4 w-4" />,
    enabled: true,
  },
  {
    label: 'Workflows',
    href: '/workflows',
    icon: <Workflow className="h-4 w-4" />,
    enabled: true,
  },
  { label: 'Team', href: '/team', icon: <Users className="h-4 w-4" />, enabled: false },
  {
    label: 'Billing',
    href: '/billing',
    icon: <CreditCard className="h-4 w-4" />,
    enabled: true,
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const org = await apiGet<OrganizationProfile>('/organizations/me');

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sidebar-grid hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Image
            src={BRAND.logoSidebar}
            alt={BRAND.appName}
            width={160}
            height={32}
            className="object-contain"
            style={{ height: 'auto' }}
            unoptimized
            priority
          />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) =>
            item.enabled ? (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium opacity-40"
                title="Coming soon"
              >
                {item.icon}
                {item.label}
              </span>
            ),
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar-accent flex h-16 items-center justify-between border-b border-topbar-border bg-topbar px-6">
          <div className="md:hidden">
            <Image
              src={BRAND.logoDark}
              alt={BRAND.appName}
              width={140}
              height={28}
              className="object-contain"
              style={{ height: 'auto' }}
              unoptimized
            />
          </div>
          <div className="hidden md:block" />
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>
        {org && (
          <ReadOnlyBanner
            lifecycleState={org.lifecycleState}
            purgeScheduledAt={org.purgeScheduledAt}
          />
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
