// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Reusable upgrade prompt. Rendered wherever a LIMIT_EXCEEDED response
// or a soft-limit ratio (>= 80%) needs to nudge the org toward /billing.
// Full plan comparison pages land in S2 — this stays deliberately small.

'use client';

import { ArrowUpRight, Gauge } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradeCtaProps {
  /** e.g. "submissions" — names the limit that triggered the prompt */
  readonly limitLabel?: string;
  readonly used?: number;
  readonly limit?: number;
  readonly className?: string;
}

export function UpgradeCta({
  limitLabel,
  used,
  limit,
  className,
}: UpgradeCtaProps): React.ReactElement {
  const hasNumbers = typeof used === 'number' && typeof limit === 'number' && limit > 0;
  const atCap = hasNumbers && used >= limit;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border p-4',
        atCap ? 'border-destructive/40 bg-destructive/5' : 'border-primary/30 bg-primary/5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Gauge
          className={cn('mt-0.5 h-5 w-5 shrink-0', atCap ? 'text-destructive' : 'text-primary')}
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {atCap
              ? `You've reached your ${limitLabel ?? 'plan'} limit`
              : `You're approaching your ${limitLabel ?? 'plan'} limit`}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasNumbers ? `${used.toLocaleString()} of ${limit.toLocaleString()} used. ` : ''}
            Upgrade to keep everything flowing without interruption.
          </p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href="/billing">
          Upgrade
          <ArrowUpRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
