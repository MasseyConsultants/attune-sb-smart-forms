# attune-sb-smart-forms — Sprint 2

> Author: Robert Massey | Created: 2026-07-12
> Phase: P1 Paywall Core (completes the phase)

**Sprint 2 Goal:** The org lifecycle is a real state machine with enforced
read-only mode, purge sweeps, and reminder emails — and the billing UX is
complete enough that a trial org can understand its limits and convert.

## Tasks

1. **Org lifecycle state machine** (`api/src/modules/lifecycle/`)
   - Transitions per `docs/PRICING_AND_ENTITLEMENTS.md` § Data Lifecycle:
     `ACTIVE → EXPIRED_TRIAL / CANCELED → PURGE_PENDING → PURGED`
   - Trial expiry: `trialEndsAt` passed → org read-only immediately (public
     forms unpublished, builders locked; view + export still work);
     `readOnlyAt` + `purgeScheduledAt` (+30d) set
   - Canceled path: full access until period end, then read-only +60d window
   - PAST_DUE dunning: grace windows elapse → auto-cancel into canceled path
   - `ReadOnlyGuard`: blocks mutating requests for read-only orgs with a clear
     `ORG_READ_ONLY` error (GET/export always allowed)
   - Resubscribe inside the window restores everything instantly
2. **DataLifecycleService purge sweep** (BullMQ daily job)
   - Two-phase purge: blobs first + soft-delete rows; hard DB delete 7 days
     later. Idempotent; never inline in a request
   - Survivors: billing records, OrgTombstone, TrialFingerprint
   - `legalHoldAt` blocks purge unconditionally; every decision logged to
     `PurgeAuditLog`
   - User-requested deletion path (verified request → purge within 30 days)
   - Exhaustive tests: every lifecycle path, legal hold, restore drill,
     double-run idempotency
3. **Reminder emails** (branded shell, console stub in dev): trial expiry
   (at expiry, day 7, 23, 28), soft-limit 80% warning (hooks into the S1
   latch), PAST_DUE dunning notices
4. **Billing/plan pages + usage meters UI**
   - Full plan comparison page (all tiers, feature matrix from
     PLAN_ENTITLEMENTS — never hardcoded)
   - Usage meters on the dashboard (UpgradeCta wired to real ratios)
   - Read-only + trial-expired banners; export-all entry point
   - Downgrade UX: choose which forms stay live when over the new cap
5. **Per-plan API throttling**: OrgThrottlerGuard reads `apiRateLimitPerMin`
   from the org's cached plan snapshot
6. **First web component tests** (`.test.tsx`): UpgradeCta, meter bar,
   billing actions

## Explicitly out of scope (S3)

Form engine port, forms API, builder UI — P2 starts in S3.

## Acceptance

- Simulated trial expiry flips the org read-only same-day; mutating API calls
  return `ORG_READ_ONLY`; exports still work; purge is scheduled +30d
- Purge sweep double-run produces no duplicate tombstones or audit rows;
  legal-hold org is skipped with an audit entry
- Resubscribing a read-only canceled org restores full access instantly
- Plan page renders all tiers from PLAN_ENTITLEMENTS; dashboard meters match
  `/billing/usage`; 80% ratio shows the soft banner
- Reminder emails render the brand shell and fire on the correct schedule
- Lifecycle + purge test matrix green in CI; web coverage > 0%

---

## Retro (closed 2026-07-13)

**Delivered.** Tasks 1–3, 5, 6 complete; task 4 complete except two items that
require forms to exist (deferred to S4 — see below). 130 API tests across 8
suites + 18 web component tests across 4 suites.

**Verified live**

- Trial expiry sweep flipped a backdated org to `EXPIRED_TRIAL` same-day:
  read-only set, purge scheduled +30d, T+0 reminder email sent
- Mutating call on the read-only org returned `ORG_READ_ONLY`; GETs still work
- SSR check: dashboard shows the read-only banner with the purge date;
  `/billing` renders all three plan cards from PLAN_ENTITLEMENTS

**What went well**

- Latching reminders in `org.settings.lifecycleRemindersSent` (state key +
  day offset) made the sweep naturally idempotent — double-runs send nothing.
- The `@AllowReadOnly()` opt-out decorator kept the ReadOnlyGuard default-deny:
  auth and billing routes opt out explicitly, everything else is protected by
  default.
- `next/jest` + testing-library setup was painless; component tests run in the
  same `pnpm test` pipeline as the API.

**What bit us**

- The password policy correctly rejected a live-test signup whose password
  contained the test user's name — test fixtures need policy-safe passwords.
- Duplicate type name: `OrganizationSummary` already existed in auth.ts, so
  the full org contract became `OrganizationProfile` in orgs.ts.

**Deferred / notes**

- Downgrade UX ("choose which forms stay live over the new cap") and the
  export-all entry point need forms/submissions to exist — moved to S4
  (SB-014, SB-015).
- Live Stripe dunning email fires on webhook fixtures in tests; real-key
  verification remains a manual step alongside checkout.
