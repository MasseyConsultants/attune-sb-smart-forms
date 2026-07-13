// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing
// Purpose: Usage meter bar — green under 80%, amber at soft limit, red at cap.
// Shared by the billing page and dashboard usage cards.

import { Meter, SOFT_LIMIT_RATIO } from '@attune-sb/shared-types';

export const METER_LABELS: Record<Meter, string> = {
  [Meter.SUBMISSIONS]: 'Form submissions',
  [Meter.DOC_FILLS]: 'Document fills',
  [Meter.WORKFLOW_RUNS]: 'Workflow runs',
  [Meter.EMAILS]: 'Emails sent',
  [Meter.AI_CREDITS]: 'AI credits',
  [Meter.STORAGE_BYTES]: 'Storage',
};

export function formatMeterValue(meter: Meter, value: number): string {
  if (meter === Meter.STORAGE_BYTES) {
    const mb = value / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  }
  return value.toLocaleString();
}

interface MeterBarProps {
  readonly meter: Meter;
  readonly used: number;
  readonly limit: number;
  readonly ratio: number;
}

export function MeterBar({ meter, used, limit, ratio }: MeterBarProps): React.ReactElement {
  const pct = Math.min(100, Math.round(ratio * 100));
  const barColor =
    ratio >= 1 ? 'bg-destructive' : ratio >= SOFT_LIMIT_RATIO ? 'bg-amber-500' : 'bg-primary';

  return (
    <div data-testid={`meter-${meter}`}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{METER_LABELS[meter]}</span>
        <span className="text-muted-foreground">
          {formatMeterValue(meter, used)} / {formatMeterValue(meter, limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={METER_LABELS[meter]}
        />
      </div>
    </div>
  );
}
