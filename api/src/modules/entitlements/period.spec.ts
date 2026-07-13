// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements / Tests
// Billing-anchor period math. Getting this wrong double-bills or double-grants
// usage, so every clamping and rollover branch is pinned here.

import { currentUsagePeriod } from './period';

function utc(y: number, m: number, d: number, h = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h));
}

describe('currentUsagePeriod', () => {
  it('starts the period on the anchor day when now is past it', () => {
    const period = currentUsagePeriod(10, utc(2026, 7, 15));
    expect(period.start).toEqual(utc(2026, 7, 10));
    expect(period.end).toEqual(utc(2026, 8, 10));
  });

  it('uses the previous month anchor when now is before this month anchor', () => {
    const period = currentUsagePeriod(20, utc(2026, 7, 15));
    expect(period.start).toEqual(utc(2026, 6, 20));
    expect(period.end).toEqual(utc(2026, 7, 20));
  });

  it('treats the anchor instant itself as the period start (inclusive)', () => {
    const period = currentUsagePeriod(15, utc(2026, 7, 15));
    expect(period.start).toEqual(utc(2026, 7, 15));
    expect(period.end).toEqual(utc(2026, 8, 15));
  });

  it('clamps anchor 31 to the end of February', () => {
    const period = currentUsagePeriod(31, utc(2026, 2, 20));
    expect(period.start).toEqual(utc(2026, 1, 31));
    expect(period.end).toEqual(utc(2026, 2, 28));
  });

  it('clamps to Feb 29 in a leap year', () => {
    const period = currentUsagePeriod(31, utc(2028, 3, 1));
    expect(period.start).toEqual(utc(2028, 2, 29));
    expect(period.end).toEqual(utc(2028, 3, 31));
  });

  it('recovers the full anchor day after a clamped month', () => {
    // Anchor 31: February clamps to the 28th, March restores the 31st.
    const period = currentUsagePeriod(31, utc(2026, 3, 15));
    expect(period.start).toEqual(utc(2026, 2, 28));
    expect(period.end).toEqual(utc(2026, 3, 31));
  });

  it('crosses the year boundary (anchor in December, now in January)', () => {
    const period = currentUsagePeriod(25, utc(2027, 1, 10));
    expect(period.start).toEqual(utc(2026, 12, 25));
    expect(period.end).toEqual(utc(2027, 1, 25));
  });

  it('rejects anchor days outside 1–31', () => {
    expect(() => currentUsagePeriod(0)).toThrow('Invalid billing anchor day');
    expect(() => currentUsagePeriod(32)).toThrow('Invalid billing anchor day');
    expect(() => currentUsagePeriod(2.5)).toThrow('Invalid billing anchor day');
  });
});
