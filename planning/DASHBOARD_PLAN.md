# SMB Dashboard Design Plan

> Author: Robert Massey | Created: 2026-07-16
> Status: **Phases A+B complete** (v1 customer home). Phase C = v1.1 form analytics.
> Backlog: SB-027

## 1. Why this exists

The workspace home (`/dashboard`) is still a Sprint-0 shell: trial clock, org
card, and a stale "what's next" placeholder. Flagship systems (forms, SmartMapper,
workflows, billing, submissions) are live. The home page should now become the
**decision surface** for small-business users — not a BI dump, and not a second
ops console.

Platform Ops (`/admin/ops`) already covers _our_ operator needs. This plan is
about **customer-facing dashboards** only.

## 2. Research synthesis (2026 SaaS + competitor patterns)

### What high-retention SaaS homes do

| Pattern                         | Implication for us                                       |
| ------------------------------- | -------------------------------------------------------- |
| Decision-first, not data-first  | Every widget answers "what should I do next?"            |
| 5–7 primary metrics max         | KPI strip stays small; depth lives on drill-downs        |
| Role-shaped views               | OWNER ≠ BUILDER ≠ VIEWER (same shell, different modules) |
| Actionable empty states         | Day-0 users see guided CTAs, not empty charts            |
| Contextual actions next to data | "Review" / "Approve" / "Upgrade" inline                  |
| Progressive disclosure          | Home → form/workflow detail analytics later              |
| Load under ~2s                  | Aggregate API + skeletons; no N+1 list fan-out           |

### Competitor home patterns (forms/docs space)

| Product                   | Home emphasis                                               | Steal / skip                                                                      |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Formstack**             | Quick create + **billing/usage widgets** + user mgmt        | Steal: plan meters on home for OWNER/ADMIN. Skip: customizable widget soup at v1. |
| **Typeform**              | 7-day insight cards (completion, automations) + dig-deeper  | Steal: period comparison ("vs prior 7 days"). Skip: AI ask-box at v1.             |
| **Jotform Insights**      | Views, submissions, completion, time-on-form, device/source | Steal later (v1.1): views/completion need instrumentation. Skip for v1 home.      |
| **Generic SMB ops tools** | "Needs attention" queues (approvals, failures)              | Steal: attention rail — our differentiator vs form-only tools.                    |

### Product-specific insight

Our buyers pay for **three jobs**: collect data, fill their PDF, automate delivery.
The home page must reflect that triad — not look like a pure form builder or a
pure analytics product.

North-star for the customer: _"Did work get done this week, and is anything
blocked?"_

## 3. Personas & jobs-to-be-done

| Persona      | Roles          | Primary job on home                                                                      | Time budget             |
| ------------ | -------------- | ---------------------------------------------------------------------------------------- | ----------------------- |
| **Owner**    | OWNER          | Am I getting value? Hitting limits? Anything stuck? Convert trial / upgrade when needed. | 30–60s daily            |
| **Admin**    | ADMIN          | Team health + operational backlog (approvals, failed runs, quarantine).                  | 1–2 min                 |
| **Builder**  | BUILDER        | What to build/fix next; recent form & workflow activity.                                 | 30s → jump into builder |
| **Viewer**   | VIEWER         | What's new in submissions; open items to review.                                         | 30–60s                  |
| **Platform** | PLATFORM_ADMIN | Already served by `/admin` + `/admin/ops` — not this plan.                               | —                       |

Lifecycle overlays (not separate dashboards):

- **Trialing** — countdown + "aha path" checklist (publish form → map PDF → first fill).
- **Near limit (≥80%)** — soft-limit CTA (existing `UpgradeCta`).
- **Read-only / purge window** — retention banner (existing `ReadOnlyBanner`); home becomes export + restore focused.
- **Empty org (day 0)** — onboarding checklist, not KPI cards.

## 4. Dashboard inventory (what we will ship)

We use **one route** (`/dashboard`) with a **role + lifecycle composition layer**.
No per-role URLs at v1. Optional later: saved layouts (backlog).

### 4.1 Module catalog

| ID  | Module                     | Audience                | Purpose                                                     | Primary actions                         |
| --- | -------------------------- | ----------------------- | ----------------------------------------------------------- | --------------------------------------- |
| M1  | **Attention rail**         | All (scoped)            | Surface work that needs a human                             | Open submission / approval / failed run |
| M2  | **Pulse KPIs**             | All                     | 4–6 numbers with period delta                               | Click → filtered list                   |
| M3  | **Activity sparkline**     | All                     | Submissions (and optionally doc fills) over last 14/30 days | Range toggle                            |
| M4  | **Usage meters**           | OWNER, ADMIN            | Plan health vs `PLAN_ENTITLEMENTS`                          | Upgrade / billing                       |
| M5  | **Onboarding checklist**   | Day-0 / incomplete aha  | Drive to value moment                                       | Create form / upload PDF / publish      |
| M6  | **Quick create**           | OWNER, ADMIN, BUILDER   | Jump into create flows                                      | New form / workflow / from library      |
| M7  | **Top forms**              | All                     | Which forms are driving volume                              | Open form / submissions                 |
| M8  | **Workflow health**        | OWNER, ADMIN, BUILDER   | Recent runs: success / failed / waiting                     | Open run                                |
| M9  | **Trial / lifecycle card** | OWNER (others: compact) | Trial days, plan, purge date                                | Billing / export                        |
| M10 | **Team snapshot**          | OWNER, ADMIN            | Seats used / pending invites                                | Team page                               |

### 4.2 Composition by role

| Module             | OWNER  |  ADMIN  |    BUILDER    |             VIEWER              |
| ------------------ | :----: | :-----: | :-----------: | :-----------------------------: |
| M1 Attention       |   ✓    |    ✓    | ✓ (own scope) | ✓ (approvals/subs they can see) |
| M2 Pulse KPIs      |   ✓    |    ✓    |       ✓       |           ✓ (subset)            |
| M3 Sparkline       |   ✓    |    ✓    |       ✓       |                ✓                |
| M4 Usage meters    |   ✓    |    ✓    |       —       |                —                |
| M5 Onboarding      |   ✓    |    ✓    |       ✓       |                —                |
| M6 Quick create    |   ✓    |    ✓    |       ✓       |                —                |
| M7 Top forms       |   ✓    |    ✓    |       ✓       |                ✓                |
| M8 Workflow health |   ✓    |    ✓    |       ✓       |                —                |
| M9 Lifecycle       | ✓ full | compact |    compact    |             compact             |
| M10 Team           |   ✓    |    ✓    |       —       |                —                |

VIEWER pulse subset: submissions (period), pending approvals (if any), documents
generated (read-only). No meter ratios, no team, no create.

### 4.3 Pulse KPI definitions (v1)

Default window: **last 7 days**, delta vs **prior 7 days**.

| KPI              | Definition                                                           | Drill-down                       |
| ---------------- | -------------------------------------------------------------------- | -------------------------------- |
| Submissions      | Non-deleted, non-quarantined count in window                         | `/submissions?from=&to=`         |
| Documents filled | Document-fill usage events / fill records in window                  | Templates or submissions w/ docs |
| Workflow runs    | Runs started in window                                               | Workflows list / runs            |
| Needs attention  | Approvals waiting + failed runs + OVER_LIMIT quarantine count        | Inline list / deep links         |
| Published forms  | Active published form count (gauge vs plan for OWNER/ADMIN)          | `/forms`                         |
| Storage          | Used vs plan (OWNER/ADMIN only; can live in M4 instead of KPI strip) | `/billing`                       |

**Explicitly out of v1 home (need new instrumentation):** form views, completion
rate, time-on-form, device/UTM breakdowns. Track as v1.1 analytics epic.

## 5. Attention rail (highest product leverage)

Ordered by urgency:

1. **Pending approvals** assigned to this user / org (Growth+ workflows)
2. **Failed workflow runs** (last 7 days, unrecovered)
3. **Quarantined submissions** (`OVER_LIMIT`) — OWNER/ADMIN only + upgrade path
4. **Soft-limit meters** (≥80%) — already partially handled by `UpgradeCta`
5. **Draft forms never published** / **templates with zero mappings** (onboarding nudge, lower priority)

Cap list at **5 items** with "View all" links. Empty state: short success copy
("You're caught up") + quick create — never a blank gray box.

## 6. Layout (information architecture)

```
┌─────────────────────────────────────────────────────────────┐
│ [Lifecycle / Welcome / Upgrade banners — existing]          │
├─────────────────────────────────────────────────────────────┤
│ Greeting + org name     │  M6 Quick create (role-gated)     │
├─────────────────────────────────────────────────────────────┤
│ M5 Onboarding checklist (only if incomplete)                │
├─────────────────────────────────────────────────────────────┤
│ M2 Pulse KPIs (4–6)                                         │
├──────────────────────────────┬──────────────────────────────┤
│ M1 Attention rail            │ M3 Activity sparkline        │
├──────────────────────────────┼──────────────────────────────┤
│ M7 Top forms                 │ M8 Workflow health           │
├──────────────────────────────┴──────────────────────────────┤
│ M4 Usage meters (OWNER/ADMIN)  │  M9 + M10 side cards       │
└─────────────────────────────────────────────────────────────┘
```

Mobile: single column — banners → checklist → KPIs → attention → sparkline →
lists → meters. Quick create becomes a sticky/fab or top button row.

Visual rules (align with product design system, not marketing-hero rules):

- Reuse existing `Card`, `MeterBar`, `UpgradeCta`, brand tokens from `brand.ts`.
- Prefer sparse KPI tiles over dense card grids; no decorative "insight sticker"
  overlays.
- Charts: simple SVG/CSS sparkline or a lightweight chart lib **only if** an ADR
  is added (prefer zero new deps first — CSS bars / polyline).

## 7. Data & API requirements

### New aggregate endpoint (recommended)

`GET /api/v1/dashboard/summary?windowDays=7`

Returns a typed `DashboardSummary` in `@attune-sb/shared-types`:

```ts
interface DashboardSummary {
  readonly windowDays: number;
  readonly generatedAt: string;
  readonly pulse: {
    readonly submissions: PeriodMetric;
    readonly documentFills: PeriodMetric;
    readonly workflowRuns: PeriodMetric;
    readonly needsAttention: number;
    readonly publishedForms: number;
    readonly publishedFormsLimit: number | null; // null if not shown for role
  };
  readonly series: {
    readonly submissionsByDay: ReadonlyArray<{ date: string; count: number }>;
    readonly documentFillsByDay?: ReadonlyArray<{ date: string; count: number }>;
  };
  readonly attention: ReadonlyArray<AttentionItem>;
  readonly topForms: ReadonlyArray<{
    formId: string;
    name: string;
    submissionCount: number;
    status: string;
  }>;
  readonly recentWorkflowRuns: ReadonlyArray<{
    runId: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startedAt: string;
  }>;
  readonly onboarding: {
    readonly hasForm: boolean;
    readonly hasPublishedForm: boolean;
    readonly hasTemplate: boolean;
    readonly hasMappedTemplate: boolean;
    readonly hasSubmission: boolean;
    readonly hasDocumentFill: boolean;
    readonly hasWorkflow: boolean;
  };
  readonly usage: UsageSummary | null; // OWNER/ADMIN only
  readonly team: {
    readonly seatsUsed: number;
    readonly seatsLimit: number;
    readonly pendingInvites: number;
  } | null;
}
```

Rules:

- Tenant filter at service layer (`organizationId`).
- Role shaping in service (strip `usage` / `team` for BUILDER/VIEWER).
- Single round-trip for home SSR; Redis cache 30–60s per org optional (v1 can be
  Postgres aggregates if indexed).
- Never call Stripe on this path.

### Existing building blocks to reuse

- `GET /billing/usage` → meters (M4)
- `GET /organizations/me` → lifecycle / trial (M9)
- Submissions `countByForm`, org list + `quarantinedCount`
- Workflow runs list
- Approvals module (pending tokens)
- Notifications bell (keep in shell; don't duplicate full feed on home)

## 8. Phased delivery

### Phase A — Foundation ✅ Shipped 2026-07-16

Ship a real home without new chart libraries:

1. `DashboardSummary` API + shared-types contract + tests ✅
2. Replace stub `/dashboard` with role-composed layout ✅
3. Modules: M5, M6, M2 (counts), M1 (approvals + failed runs + quarantine), M4, M9 ✅
4. Empty + trial + read-only states ✅
5. Web tests for composition (role matrix smoke) ✅

**Exit criteria:** Day-0 user completes aha path from home; OWNER sees meters;
VIEWER sees no billing/create; attention items deep-link correctly.

### Phase B — Pulse & trends ✅ Shipped 2026-07-16

1. Period deltas + 7/14/30-day SVG sparkline (M3) ✅
2. Top forms (M7) + workflow health strip (M8) ✅
3. Team snapshot (M10) ✅
4. Query performance: day aggregates via SQL `DATE_TRUNC`; no Redis cache yet
   (add if p95 warrants — existing indexes on org+status cover the hot paths)

### Phase C — Form analytics (v1.1, separate epic)

1. Public form view + start + complete events (privacy-safe)
2. Per-form Insights page (completion, device) — competitor parity with Jotform
3. Optional: home KPI for completion rate once data exists

### Explicit non-goals (v1)

- Drag-and-drop customizable dashboards
- Cross-org / multi-workspace switcher analytics
- Real-time websocket KPI streaming
- AI narrative summaries
- Duplicating Platform Ops charts for customers

## 9. Entitlement & security notes

- Home is available on all plans (including trial); modules gated by **role**,
  not plan — except attention items that only exist on Growth+ (approvals).
- Quarantine counts are OWNER/ADMIN only (upgrade signal).
- VIEWER must not see other members' PII beyond submission fields they already
  can access on `/submissions`.
- Read-only lifecycle: hide/disable M6 create; emphasize export (billing page
  already has export-all).

## 10. Success metrics (product)

| Signal                                         | Target                                    |
| ---------------------------------------------- | ----------------------------------------- |
| % of sessions that click a home CTA within 60s | ≥40% after Phase A                        |
| Trial orgs completing aha checklist via home   | Lift vs baseline (measure post-ship)      |
| Support tickets "where do I see X?"            | Down after Phase A                        |
| Home p95 SSR/API                               | <500ms summary endpoint locally; <1s prod |

## 11. Open questions (resolve before / during tweak)

1. **Default window:** 7 days (recommended) vs billing-period-to-date for pulse?
2. **Builder scope:** org-wide metrics or only forms/workflows they created?
3. **Approvals on Free/Solo:** hide module entirely vs "upgrade to unlock" teaser?
4. **Chart dependency:** stay dependency-free for Phase A/B, or ADR a small lib?
5. **Scheduling:** Phase A as S11 polish vs post-launch P7 — recommend **S11** so
   launch home isn't a stub.
6. **Industry presets:** later personalization (contractor vs clinic) — backlog only?

## 12. Recommended decisions (defaults if no pushback)

1. One composed `/dashboard`, role + lifecycle modules.
2. Phase A in launch hardening (S11) — replace the stub before marketing launch.
3. 7-day pulse window; billing meters stay on anchor period (already correct).
4. BUILDER sees org-wide operational metrics (SMB teams are tiny; simpler).
5. No new chart library in Phase A; CSS/SVG sparkline in Phase B.
6. Approvals module hidden when plan lacks approvals node (no teaser clutter).

---

## Appendix A — Shipped snapshot (2026-07-16)

- Route: `web/src/app/(dashboard)/dashboard/page.tsx` → `DashboardHome`
- API: `GET /api/v1/dashboard/summary?windowDays=7|14|30`
- Shell nav: Dashboard / Build / Data / Workspace
- Ops dashboard: `/admin/ops` (platform only) — separate
- Remaining (Phase C / v1.1): form view + completion instrumentation + Insights page
