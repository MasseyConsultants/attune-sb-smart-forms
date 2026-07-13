// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle
// Purpose: All lifecycle timing in one place, mirroring
// docs/PRICING_AND_ENTITLEMENTS.md § Data Lifecycle & Purge exactly.

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Read-only retention window after an unconverted trial expires. */
export const TRIAL_RETENTION_DAYS = 30;

/** Read-only retention window after a paid subscription ends (they paid — be generous). */
export const CANCELED_RETENTION_DAYS = 60;

/** PURGE_PENDING → PURGED safety net (support can still restore DB rows). */
export const HARD_DELETE_DELAY_DAYS = 7;

/** Unresolved PAST_DUE auto-cancels this many days after the first failed invoice. */
export const DUNNING_AUTO_CANCEL_DAYS = 30;

/** Reminder email offsets (days after readOnlyAt) per lifecycle path. */
export const TRIAL_REMINDER_DAYS: readonly number[] = [0, 7, 23, 28];
export const CANCELED_REMINDER_DAYS: readonly number[] = [0, 14, 45, 53];

/** Sweep batch cap — bounds a single run so a backlog cannot stall the queue. */
export const SWEEP_BATCH_SIZE = 100;
