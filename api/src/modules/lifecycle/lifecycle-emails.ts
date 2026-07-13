// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle / Emails
// Purpose: Branded reminder email bodies for the retention timeline. Copy states
// exactly what will be deleted and when, and links one-click export + resubscribe.

import {
  brandEmailButton,
  brandEmailShell,
  escapeHtml,
} from '@/modules/notifications/email-brand-shell';

export interface ReminderEmailParams {
  readonly orgName: string;
  readonly path: 'trial' | 'canceled';
  readonly purgeDate: Date;
  readonly appUrl: string;
  /** Days since the org went read-only */
  readonly dayOffset: number;
}

export function buildReminderEmail(params: ReminderEmailParams): {
  subject: string;
  html: string;
} {
  const purgeDateStr = params.purgeDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const isFinalWarning = daysUntil(params.purgeDate) <= 7;

  const subject = isFinalWarning
    ? `Final warning: ${params.orgName} data will be deleted on ${purgeDateStr}`
    : params.path === 'trial'
      ? `Your Attune Smart Forms trial has ended — data retained until ${purgeDateStr}`
      : `Your Attune Smart Forms subscription has ended — data retained until ${purgeDateStr}`;

  const intro =
    params.path === 'trial'
      ? 'Your free trial has ended and your workspace is now read-only.'
      : 'Your subscription has ended and your workspace is now read-only.';

  const html = brandEmailShell({
    title: isFinalWarning ? 'Scheduled data deletion' : 'Your workspace is read-only',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">${intro}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        You can still sign in, view everything, and export all your data.
        On <strong>${escapeHtml(purgeDateStr)}</strong>, all forms, submissions,
        documents, and uploads in <strong>${escapeHtml(params.orgName)}</strong>
        will be permanently deleted.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#334155;">
        Resubscribe any time before then and everything is restored instantly.
      </p>
      ${brandEmailButton(`${params.appUrl}/billing`, 'Resubscribe & restore access')}
      <p style="margin:24px 0 0;font-size:13px;color:#64748B;">
        Or <a href="${params.appUrl}/dashboard" style="color:#EA580C;">export your data</a> first — export stays available until deletion.
      </p>`,
  });

  return { subject, html };
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
