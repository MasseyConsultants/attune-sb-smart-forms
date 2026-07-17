// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard
// Purpose: Attention rail — pending approvals, failed runs, quarantine, soft limits.

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Gauge, Inbox, XCircle } from 'lucide-react';
import type { AttentionItem, AttentionKind } from '@attune-sb/shared-types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const KIND_ICON: Record<AttentionKind, React.ReactNode> = {
  approval_pending: <ClipboardCheck className="h-4 w-4 text-amber-600" />,
  workflow_failed: <XCircle className="h-4 w-4 text-red-600" />,
  quarantined: <Inbox className="h-4 w-4 text-amber-600" />,
  soft_limit: <Gauge className="h-4 w-4 text-amber-600" />,
};

interface AttentionRailProps {
  readonly items: ReadonlyArray<AttentionItem>;
}

export function AttentionRail({ items }: AttentionRailProps): React.ReactElement {
  return (
    <Card id="attention">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Needs attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-start gap-3 rounded-md bg-muted/40 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-foreground">You&apos;re caught up</p>
              <p className="text-xs text-muted-foreground">
                No pending approvals, failed runs, or limit warnings.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <span className="mt-0.5 shrink-0">{KIND_ICON[item.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{item.title}</span>
                    {item.subtitle && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
