# attune-sb-smart-forms — Pricing & Entitlements (technical spec)

> **Seed document for the NEW SMB repository.** Copy to
> `docs/PRICING_AND_ENTITLEMENTS.md` in `attune-sb-smart-forms`. Staged in the
> enterprise repo under `docs/smb-edition/`.
> Author: Robert Massey | Created: 2026-07-11
> Tier/price table lives in `planning/MASTER_PLAN.md` §3.

## Entitlement Architecture

```
Stripe (billing events only)
   │  verified, idempotent webhooks
   ▼
Subscription (local table — plan, status, trialEndsAt, billingAnchor, seats)
   ▼
EntitlementsService  ◄── PLAN_ENTITLEMENTS (typed constants in @attune-sb/shared-types)
   │                          + EntitlementOverride table (per-org exceptions,
   │                            temporary grants, grandfathered limits)
   ├── boolean gates  → @RequireEntitlement() guard / useEntitlement() hook
   └── metered limits → UsageCounter (Postgres, atomic) + Redis cache
                          ▲
                        UsageEvent ledger (idempotent, append-only —
                        source for billing reconciliation & analytics)
```

### Data model additions (Prisma)

```prisma
model Plan {              // seeded rows mirror PLAN_ENTITLEMENTS for reporting joins
  id            String   @id            // 'solo' | 'growth' | 'business'
  stripePriceIdMonthly String
  stripePriceIdAnnual  String
  // limits are NOT stored here at runtime — code constants are authority;
  // this table exists for admin reporting and Stripe price mapping
}

model Subscription {
  id                 String   @id @default(uuid())
  organizationId     String   @unique
  planId             String
  status             SubscriptionStatus  // TRIALING, ACTIVE, PAST_DUE, CANCELED, PAUSED
  stripeCustomerId   String
  stripeSubscriptionId String?
  trialEndsAt        DateTime?
  billingAnchorDay   Int       // usage counters reset on this day
  seats              Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UsageCounter {          // one row per org × meter × period
  id             String  @id @default(uuid())
  organizationId String
  meter          Meter   // SUBMISSIONS, DOC_FILLS, WORKFLOW_RUNS, EMAILS, AI_CREDITS, STORAGE_BYTES
  periodStart    DateTime
  periodEnd      DateTime
  used           BigInt
  @@unique([organizationId, meter, periodStart])
}

model UsageEvent {            // append-only, idempotent ledger
  id             String  @id @default(uuid())
  organizationId String
  meter          Meter
  quantity       BigInt
  idempotencyKey String  @unique
  refType        String? // 'submission' | 'workflowExecution' | ...
  refId          String?
  createdAt      DateTime @default(now())
}

model EntitlementOverride {   // sales exceptions, grandfathering, temp grants
  id             String  @id @default(uuid())
  organizationId String
  entitlement    String
  value          Json
  expiresAt      DateTime?
  reason         String
}
```

### Enforcement flow (metered action, e.g. document fill)

1. `EntitlementsService.consume(orgId, Meter.DOC_FILLS, 1, idempotencyKey)`
2. Read counter (Redis cache → Postgres fallback); compare vs plan limit + overrides
3. Under limit → atomic `UPDATE ... SET used = used + 1` + insert UsageEvent → proceed
4. ≥80% → proceed + enqueue soft-limit notification (once per period per meter)
5. At limit → throw `EntitlementExceededException` → 402-style envelope with
   `{ limit, used, resetsAt, upgradeUrl }` → web renders upgrade modal
6. Exception: PUBLIC submission intake never throws — accept, store as
   `OVER_LIMIT`, notify owner, count toward next period on upgrade

### Stripe integration rules

- Checkout Session for purchase; Customer Portal for self-serve plan changes,
  payment method, cancellation. We do not build card forms.
- Webhooks handled: `checkout.session.completed`, `customer.subscription.updated/
deleted`, `invoice.paid`, `invoice.payment_failed` — all idempotent (event ID
  dedupe table), signature-verified on raw body.
- Dunning: PAST_DUE = 7-day grace with full access + banners; then downgrade to
  read-only (data visible/exportable, no new submissions to private forms,
  public forms show "temporarily unavailable" after a further 14 days). If still
  unpaid 30 days after the failed invoice, auto-cancel → CANCELED lifecycle below.
- Cancellation: via Customer Portal, effective end of paid period. Then the
  CANCELED lifecycle below takes over. Export always available until purge.

### Throttling ties to plan

- `OrgThrottlerGuard` resolves req/min from plan tier
- Queue priority (BullMQ): Business > Growth > Solo for workflow/doc-gen jobs
- Per-plan max upload size + storage checks in presigned-URL issuance

## Data Lifecycle & Purge

**Why:** abandoned trials and canceled subscriptions must not accumulate blob
storage (uploaded PDFs, generated documents, attachments) and database rows
indefinitely. Storage is a plan meter and a real cost — the lifecycle reclaims it
predictably, while never surprising a customer who intends to come back.

### Org lifecycle state machine

`Organization.lifecycleState`:

```
ACTIVE ──trial expires unconverted──► EXPIRED_TRIAL (read-only, 30-day window)
ACTIVE ──cancel / dunning exhausted──► CANCELED (read-only, 60-day window)
EXPIRED_TRIAL | CANCELED ──subscribe/resubscribe──► ACTIVE (instant full restore)
EXPIRED_TRIAL | CANCELED ──window elapses──► PURGE_PENDING (blobs deleted,
                                              rows soft-deleted)
PURGE_PENDING ──7 days──► PURGED (hard delete; tombstone only)
PURGE_PENDING ──support restore (DB rows only; blobs are gone)──► ACTIVE
```

### Read-only means

- Public forms unpublished (fill pages return "no longer available")
- Workflows paused; scheduled/delayed executions canceled
- Builders, uploads, and all metered actions blocked
- Login, viewing data, and FULL EXPORT (submissions CSV/JSON, form schemas,
  uploaded templates, generated documents as a zip) still work — export is the
  last thing we ever take away

### Timelines & communications

| Event                        | Trial (unconverted)  | Paid (canceled)       |
| ---------------------------- | -------------------- | --------------------- |
| Access ends                  | at `trialEndsAt`     | end of paid period    |
| Retention window (read-only) | 30 days              | 60 days               |
| Reminder emails              | T+0, T+7, T+23, T+28 | T+0, T+14, T+45, T+53 |
| Blob purge + soft delete     | day 30               | day 60                |
| Hard DB delete               | day 37               | day 67                |

Reminder emails state exactly what will be deleted and when, link to one-click
export and one-click resubscribe. The final two mails are explicit purge warnings.

### Purge mechanics

- Daily BullMQ sweep (`DataLifecycleService`), idempotent, batch-limited;
  never runs inline in a request
- Phase 1 (window elapsed): delete all org blobs (uploads, templates, filled
  documents, attachments) — the expensive resource goes first; soft-delete org
  rows; state → PURGE_PENDING; write `PurgeAuditLog` entry with per-entity counts
- Phase 2 (+7 days): hard-delete org rows (cascade order documented in the
  purge service); state → PURGED
- Legal hold: `Organization.legalHoldAt` blocks both phases unconditionally
- User-requested deletion (GDPR/CCPA-style): verified request sets
  `purgeRequestedAt` → sweep processes it on the next run, skipping windows

### What survives a purge

- Stripe customer + invoice/billing records (legal/accounting requirement)
- A tombstone row: org id, org name, SHA-256 of owner email, plan at exit,
  lifecycle path (trial vs canceled), purge timestamps, entity counts —
  no form, submission, or document content
- Trial-abuse fingerprint (email-domain + payment fingerprint hashes) so a
  purged trial org cannot re-trial for free
- `PurgeAuditLog` entries (they reference the tombstone, not PII)

### Schema additions

```prisma
// on Organization:
//   lifecycleState  OrgLifecycleState @default(ACTIVE)
//   readOnlyAt      DateTime?   // when the retention window started
//   purgeScheduledAt DateTime?  // precomputed by the sweep for observability
//   purgeRequestedAt DateTime?  // user-initiated deletion request
//   legalHoldAt     DateTime?

model PurgeAuditLog {
  id             String   @id @default(uuid())
  organizationId String   // survives as reference to tombstone
  phase          PurgePhase // BLOBS_DELETED, HARD_DELETED, RESTORED, LEGAL_HOLD_SKIP
  entityCounts   Json     // { forms: n, submissions: n, blobsBytes: n, ... }
  triggeredBy    String   // 'lifecycle-sweep' | 'user-request' | 'support:[userId]'
  createdAt      DateTime @default(now())
}
```

### Testing requirements (same rigor as entitlements)

- Sweep is idempotent: running twice never double-deletes or skips
- Resubscribe at every state: day 29 of trial window, day 59 of canceled
  window, during PURGE_PENDING (rows restorable, blobs gone — verified UX copy)
- Legal hold and purge-request paths
- Clock-boundary cases (timezone, DST, billing anchor vs lifecycle dates)
- PurgeAuditLog written for every transition; tombstone contains no content PII
