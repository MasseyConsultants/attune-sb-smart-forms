// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements / Period
// Purpose: Billing-anchor period math. Monthly usage counters reset on the org's
// billing anchor day (the day of month the subscription started), NOT the 1st.
// All math is UTC. Anchor days 29–31 clamp to the last day of shorter months
// (Stripe does the same, so local periods stay aligned with invoice periods).

export interface UsagePeriod {
  readonly start: Date;
  readonly end: Date;
}

// Non-periodic meters (STORAGE_BYTES) share one everlasting period row.
export const NON_PERIODIC_START = new Date(Date.UTC(1970, 0, 1));
export const NON_PERIODIC_END = new Date(Date.UTC(9999, 0, 1));

function daysInMonthUtc(year: number, monthIndex: number): number {
  // Day 0 of the next month = last day of this month.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function anchorDateUtc(year: number, monthIndex: number, anchorDay: number): Date {
  const clamped = Math.min(anchorDay, daysInMonthUtc(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, clamped));
}

/**
 * The usage period containing `now` for an org anchored on `anchorDay` (1–31).
 * Period = [most recent anchor date <= now, next anchor date).
 */
export function currentUsagePeriod(anchorDay: number, now: Date = new Date()): UsagePeriod {
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new Error(`Invalid billing anchor day: ${anchorDay}`);
  }

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const thisMonthAnchor = anchorDateUtc(year, month, anchorDay);

  if (now.getTime() >= thisMonthAnchor.getTime()) {
    return { start: thisMonthAnchor, end: anchorDateUtc(year, month + 1, anchorDay) };
  }
  return { start: anchorDateUtc(year, month - 1, anchorDay), end: thisMonthAnchor };
}
