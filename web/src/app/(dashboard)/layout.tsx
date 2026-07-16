// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Dashboard Layout
// Purpose: Authenticated app shell — themed sidebar + topbar. Nav is grouped
// into labeled sections (Build / Data / Workspace, plus Platform for
// PLATFORM_ADMIN) so the menu reads as a map of the product, not a flat list.

import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  FileStack,
  Inbox,
  Workflow,
  CreditCard,
  Users,
  LibraryBig,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import type { OrganizationProfile, UserProfile } from '@attune-sb/shared-types';

import { BRAND } from '@/lib/brand';
import { apiGet } from '@/lib/api-server';
import { ReadOnlyBanner } from '@/components/billing/read-only-banner';
import { SidebarDecorations } from '@/components/brand/sidebar-decorations';
import { NotificationsBell } from '@/components/notifications/notifications-bell';
import { LogoutButton } from './logout-button';

interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ReactNode;
}

interface NavSection {
  /** Empty label = unlabeled top group (Dashboard). */
  readonly label: string;
  readonly items: ReadonlyArray<NavItem>;
}

const NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Build',
    items: [
      { label: 'Forms', href: '/forms', icon: <FileText className="h-4 w-4" /> },
      { label: 'Workflows', href: '/workflows', icon: <Workflow className="h-4 w-4" /> },
      { label: 'Templates', href: '/templates', icon: <FileStack className="h-4 w-4" /> },
      { label: 'Library', href: '/library', icon: <LibraryBig className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Data',
    items: [{ label: 'Submissions', href: '/submissions', icon: <Inbox className="h-4 w-4" /> }],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Team', href: '/team', icon: <Users className="h-4 w-4" /> },
      { label: 'Billing', href: '/billing', icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
];

const ADMIN_SECTION: NavSection = {
  label: 'Platform',
  items: [
    { label: 'Admin', href: '/admin', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Ops', href: '/admin/ops', icon: <Activity className="h-4 w-4" /> },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const [org, me] = await Promise.all([
    apiGet<OrganizationProfile>('/organizations/me'),
    apiGet<UserProfile>('/users/me'),
  ]);

  const sections: NavSection[] =
    me?.role === 'PLATFORM_ADMIN' ? [...NAV_SECTIONS, ADMIN_SECTION] : [...NAV_SECTIONS];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="relative hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <SidebarDecorations />
        <div className="relative z-10 flex h-16 items-center border-b border-sidebar-border px-5">
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
        <nav className="relative z-10 flex-1 space-y-4 overflow-y-auto p-3">
          {sections.map((section) => (
            <div key={section.label || 'top'} className="space-y-1">
              {section.label && (
                <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest opacity-50">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="relative z-10 border-t border-sidebar-border p-3">
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
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <div className="md:hidden">
              <LogoutButton />
            </div>
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
