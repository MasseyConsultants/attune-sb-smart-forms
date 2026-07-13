# attune-sb-smart-forms — Market Data Snapshot

> Researched July 2026. Re-validate before launch — competitor pricing changes.
> Optional copy to `docs/MARKET_RESEARCH.md` in the new repo.
> Author: Robert Massey | Created: 2026-07-11

## Competitor pricing (self-serve tiers)

- **Jotform:** Free (5 forms/100 subs) · Bronze $39 (25/1,000) · Silver $49
  (50/2,500) · Gold $129 (100/10,000) — single-user until Enterprise; meters:
  forms, subs, views, storage, payment subs, signed docs, fields/form.
- **Cognito Forms:** Free (unlimited forms/100 entries) · Pro $19 (2,000 entries,
  2 users) · Team $39 (10k, 5 users) · Enterprise $129 (unlimited, 20 users).
- **Typeform:** Basic $29–39 (100 responses) · Plus $79 (1,000) · Business $129 (10k).
- **Formstack:** Forms $99/mo ($83 annual; 25 forms, 1,000 subs/form, 1 builder) ·
  Suite $299/mo ($250 annual; +Documents+Sign, 100 forms, 3 builders).
  Documents standalone historically ~$50–100/user/mo for 100–2,000 docs/mo.
- **GoCanvas:** $29/$39/$49 per user/mo, 3-user minimum, annual billing; unlimited
  forms/submissions; meters on seats + feature gates instead.

## Entitlement architecture — industry consensus

- Stripe = billing input, never access authority
- Local subscription state updated via idempotent, signature-verified webhooks
- Plan→capability map lives in application code (typed constants)
- Usage ledger (append-only events) + counter summary table for sub-ms checks
- Support overrides, grace periods, trials, and grandfathering explicitly —
  never infer them from raw billing state
