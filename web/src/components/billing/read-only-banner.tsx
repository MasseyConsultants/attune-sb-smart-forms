// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Persistent banner shown across the dashboard when the org is read-only
// (expired trial or canceled subscription). Data stays viewable/exportable through
// the retention window; resubscribing restores everything instantly.

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { OrgLifecycleState } from '@attune-sb/shared-types';

interface ReadOnlyBannerProps {
  readonly lifecycleState: OrgLifecycleState;
  readonly purgeScheduledAt?: string | null;
}

function bannerCopy(state: OrgLifecycleState): { title: string; body: string } | null {
  switch (state) {
    case OrgLifecycleState.ACTIVE:
      return null;
    case OrgLifecycleState.EXPIRED_TRIAL:
      return {
        title: 'Your free trial has ended',
        body: 'Your workspace is read-only. Viewing and exporting still work — upgrade to a paid plan to restore full access.',
      };
    case OrgLifecycleState.CANCELED:
      return {
        title: 'Your subscription has ended',
        body: 'Your workspace is read-only. Resubscribe to restore full access — everything comes back instantly.',
      };
    case OrgLifecycleState.PURGE_PENDING:
    case OrgLifecycleState.PURGED:
      return {
        title: 'This workspace is scheduled for deletion',
        body: 'Resubscribe now to keep your data, or export it before the retention window closes.',
      };
    default: {
      const exhaustive: never = state;
      throw new Error(`Unhandled lifecycle state: ${String(exhaustive)}`);
    }
  }
}

export function ReadOnlyBanner({
  lifecycleState,
  purgeScheduledAt,
}: ReadOnlyBannerProps): React.ReactElement | null {
  const copy = bannerCopy(lifecycleState);
  if (!copy) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-3"
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">{copy.title}</p>
          <p className="text-sm text-muted-foreground">
            {copy.body}
            {purgeScheduledAt && (
              <> Data will be deleted on {new Date(purgeScheduledAt).toLocaleDateString()}.</>
            )}
          </p>
        </div>
      </div>
      <Link
        href="/billing"
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        View plans
      </Link>
    </div>
  );
}
