# attune-sb-smart-forms — Sprint 1

> Author: Robert Massey | Created: 2026-07-12
> Phase: P1 Paywall Core (first half; S2 completes the phase)

**Sprint 1 Goal:** The entitlement layer and Stripe billing exist and are
enforced. Every metered action goes through `EntitlementsService`; Stripe
Checkout/Portal/webhooks maintain the local `Subscription` row; the app never
calls Stripe on a request path.

## Tasks

1. **Entitlements module** (`api/src/modules/entitlements/`)
   - `EntitlementsService.check(orgId, entitlement)` for boolean gates,
     reading plan from the local Subscription row + `EntitlementOverride`
   - `EntitlementsService.consume(orgId, meter, amount)` for metered limits:
     atomic `UsageCounter` increment (Postgres) with Redis cache in front,
     idempotent `UsageEvent` ledger row per consumption
   - Period keying off the org's billing anchor date (not calendar month)
   - `EntitlementExceededException` carrying
     `{ entitlement, limit, current, resetsAt, upgradeUrl }` →
     402-style envelope with `error.code = 'LIMIT_EXCEEDED'`
   - `@RequireEntitlement()` decorator + `EntitlementsGuard` wired into the
     global guard order (JWT → Roles → Entitlements → OrgThrottler)
   - Soft-limit signal at 80% (event emitted; banner/email consumed in S2)
   - Usage summary endpoint: `GET /api/v1/billing/usage`
2. **Stripe billing module** (`api/src/modules/billing/`)
   - Products/prices resolved from env keys (`STRIPE_PRICE_*`); trial path
     fully functional with NO Stripe keys configured
   - `POST /billing/checkout` → Checkout Session (trial→paid conversion)
   - `POST /billing/portal` → Billing Portal session (card, cancel, upgrade)
   - `POST /webhooks/stripe` (`@Public()`, raw-body signature verification,
     idempotent by event id): `checkout.session.completed`,
     `customer.subscription.updated/deleted`, `invoice.payment_failed/paid`
     → update local Subscription row only
   - `GET /billing/subscription` summary for the web app
3. **Trial abuse hardening**: one trial per email domain heuristic +
   fingerprint check on signup (tombstone survives purge per lifecycle spec)
4. **Web entitlement hooks**: `useEntitlement()` / `useUsage()` +
   BFF routes for `/billing/*`; minimal upgrade CTA component (full plan
   pages land in S2)
5. **Tests (exhaustive — this is the paywall)**: every plan × every meter ×
   under/at-soft/at-hard boundary; anchor-date period rollover; override
   precedence; webhook fixtures + idempotency replays; guard integration
   tests. Pay down S0 auth-service test debt alongside.

## Explicitly out of scope (S2)

Org lifecycle state machine, read-only mode, DataLifecycleService purge sweep,
trial-expiry reminder emails, plan/billing pages + usage meter UI, dunning UX.

## Acceptance

- A trial org hitting a hard cap gets `LIMIT_EXCEEDED` with limit/usage/
  upgrade URL; under 80% consumes silently; at 80% the soft-limit event fires
- `UsageEvent` rows are written idempotently (replaying a consumption key
  does not double-count)
- Stripe webhook replay (same event id twice) is a no-op the second time
- With no Stripe keys set, signup/trial/consume all work; checkout endpoints
  return a clear `BILLING_NOT_CONFIGURED` error
- Counters reset on the org's billing anchor day, not the 1st
- Entitlement layer test matrix green in CI; no plan names/limits hardcoded
  outside `@attune-sb/shared-types`
