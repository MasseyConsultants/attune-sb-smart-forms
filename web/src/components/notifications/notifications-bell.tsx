// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Notifications
// Purpose: Topbar bell — unread badge, dropdown feed, mark-read on click and
// mark-all. Polls through the useNotifications hook (30s interval).

'use client';

import { useEffect, useRef, useState } from 'react';

import type { NotificationItem, NotificationType } from '@attune-sb/shared-types';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleDollarSign,
  Clock,
  Gauge,
  Info,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  usage_warning: <Gauge className="h-4 w-4 text-amber-500" />,
  approval_decided: <UserCheck className="h-4 w-4 text-green-600" />,
  workflow_failed: <AlertTriangle className="h-4 w-4 text-red-500" />,
  trial_reminder: <Clock className="h-4 w-4 text-amber-500" />,
  billing: <CircleDollarSign className="h-4 w-4 text-muted-foreground" />,
  system: <Info className="h-4 w-4 text-muted-foreground" />,
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsBell(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const unread = notifications.data?.unreadCount ?? 0;
  const rows = notifications.data?.notifications ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary,#F97316)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground">
                Nothing yet — usage warnings, approvals, and workflow alerts land here.
              </p>
            ) : (
              rows.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onOpen={() => {
                    if (!item.readAt) {
                      markRead.mutate(item.id);
                    }
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: () => void;
}): React.ReactElement {
  const content = (
    <div
      className={cn(
        'flex gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50',
        !item.readAt && 'bg-orange-50/50',
      )}
    >
      <span className="mt-0.5 shrink-0">{TYPE_ICONS[item.type] ?? TYPE_ICONS.system}</span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs', !item.readAt ? 'font-semibold' : 'font-medium')}>
          {item.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.body}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(item.createdAt)}</p>
      </div>
      {!item.readAt && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-primary,#F97316)]" />
      )}
    </div>
  );

  if (item.link) {
    return (
      <Link href={item.link} onClick={onOpen} className="block">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onOpen} className="block w-full">
      {content}
    </button>
  );
}
