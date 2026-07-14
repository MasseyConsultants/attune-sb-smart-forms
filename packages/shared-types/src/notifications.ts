// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/shared-types
// Purpose: In-app notification contracts (S9). Org-scoped feed with optional
// user targeting; email delivery is a separate channel (EmailService).

export const NOTIFICATION_TYPES = [
  'usage_warning',
  'approval_decided',
  'workflow_failed',
  'trial_reminder',
  'billing',
  'system',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app path (e.g. /billing, /workflows/[id]/runs) — null when not actionable. */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsList {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}
