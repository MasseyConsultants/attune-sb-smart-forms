# SMB Edition (`attune-sb-smart-forms`) — Repo Seed

> **These documents belong to the NEW small-business product, not the enterprise
> edition.** They live here only as the staging area until the new repository
> exists. Nothing in this folder describes or changes `attune-smart-forms`.
>
> **Author:** Robert Massey | **Created:** 2026-07-11 | **Tracked as:** BACKLOG-114
> **Market research:** July 2026 (Jotform, Cognito Forms, Typeform, Formstack, GoCanvas)

## What is this?

The founding context for the AI engineering agent that will build
**attune-sb-smart-forms** — a self-serve, subscription-based (Solo $19 / Growth
$49 / Business $99) forms + documents + workflow SaaS for small businesses,
derived from this enterprise codebase.

## `repo-seed/` — copy its CONTENTS into the new repo root

The `repo-seed/` folder mirrors the new repository's layout exactly. Every file
is already in its final location, including the `.cursorrules` (with the dot)
and the logo assets:

```
repo-seed/
├── .cursorrules                        # agent standing orders (Cursor auto-loads)
├── planning/
│   ├── MASTER_PLAN.md                  # vision, pricing tiers, phases, carry-over manifest
│   ├── SPRINT_00.md                    # first sprint task list
│   └── BACKLOG.md                      # pre-seeded deferred items (SB-001…SB-013)
├── docs/
│   ├── PRICING_AND_ENTITLEMENTS.md     # paywall, metering, purge lifecycle spec
│   └── MARKET_RESEARCH.md              # July 2026 competitor snapshot
├── scorecard/
│   └── PROJECT_SCORECARD.md            # living status (Phase P0, Sprint 0)
└── web/
    └── public/                         # brand logo assets (copied from enterprise)
        ├── attune-logo.svg             # white wordmark — orange hero / dark panels
        ├── attune-logo-dark.svg        # dark wordmark — light backgrounds
        ├── attune-logo-sidebar.svg     # light wordmark variant
        ├── attune-logo.png             # raster fallback
        ├── attune-it-logo.png          # compact logo — forgot/reset pages
        ├── attune-icon.png             # favicon / touch icon
        └── ait-logo.png                # AIT mark — email branding default
```

## Setup steps

1. Create the new project and copy the seed in (PowerShell):

```powershell
cd "a:\Attune IT LLC\WebProjects"
mkdir attune-sb-smart-forms
Copy-Item -Recurse -Force "attune-smart-forms\docs\smb-edition\repo-seed\*" "attune-sb-smart-forms\"
Copy-Item "attune-smart-forms\docs\smb-edition\repo-seed\.cursorrules" "attune-sb-smart-forms\"
cd attune-sb-smart-forms
git init
```

(The second `Copy-Item` is needed because `*` does not match the hidden-style
dotfile. Verify with `Get-ChildItem -Force` that `.cursorrules` is present.)

2. Open the new folder in Cursor; add this enterprise repo as a second
   workspace folder (File → Add Folder to Workspace) so the agent can port code.
3. Prereqs: Node ≥ 20, pnpm 8.15, Docker Desktop (PostgreSQL 16 + Redis 7).
   Stripe test account not needed until Phase 1.
4. Kick off the agent with:

```
Read .cursorrules, planning/MASTER_PLAN.md, docs/PRICING_AND_ENTITLEMENTS.md,
and planning/SPRINT_00.md in full before doing anything.

We are beginning Sprint 0. Execute the Sprint 0 task list exactly as written —
do not build ahead into later phases.

The enterprise codebase to port from is at:
a:\Attune IT LLC\WebProjects\attune-smart-forms
Consult its packages/form-engine, packages/shared-types,
api/src/modules/common, and the branding sources listed in MASTER_PLAN.md §6a
when porting the items named in the Carry-over Manifest (§6). Fix the known
shared-types drift and the duplicated brand constants at the border as
documented. Do not import the debt listed in §6. Logo assets are already in
web/public/.

Work task by task. After each task: run lint/typecheck/tests, update
scorecard/PROJECT_SCORECARD.md, and commit with a Conventional Commit message.
Stop and ask me before making any decision the plan leaves open.
```

## Working cadence after Sprint 0

1. One sprint per push — agent writes the retro + drafts the next sprint file;
   you review it before saying "begin".
2. Verify each sprint's acceptance line yourself before accepting "done".
3. New ideas go through the new repo's `planning/BACKLOG.md`, never straight
   into the current sprint.
4. At Phase 1: Stripe test keys in `.env` (never committed), Stripe CLI
   webhook forwarding for local testing.

## Related enterprise documents (links valid in THIS repo only)

- [BACKLOG.md — BACKLOG-114 tracks this spin-off](../../planning/BACKLOG.md)
- [Enterprise MASTER_PLAN.md](../../planning/MASTER_PLAN.md)
- [Enterprise PROJECT_SCORECARD.md](../../scorecard/PROJECT_SCORECARD.md)
- [INFRASTRUCTURE_SCALING_PLAN.md — hosting/cost model to adapt](../INFRASTRUCTURE_SCALING_PLAN.md)
- [ADR directory](../ADR/)
- Branding sources (MASTER_PLAN §6a): [globals.css](../../admin-portal/src/app/globals.css),
  [theme-provider.tsx](../../admin-portal/src/providers/theme-provider.tsx),
  [login page (hero + vector shapes)](<../../admin-portal/src/app/(auth)/login/page.tsx>),
  [tailwind.config.ts](../../admin-portal/tailwind.config.ts)
- Flagship system sources: [form-engine](../../packages/form-engine/),
  [shared-types](../../packages/shared-types/),
  [document-templates (SmartMapper)](../../api/src/modules/document-templates/),
  [workflows (orchestrator + adapters)](../../api/src/modules/workflows/)
