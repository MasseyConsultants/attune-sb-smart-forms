# ADR 0007 — Native mobile via Expo (amends ADR-004)

> Author: Robert Massey | Created: 2026-07-16 | Status: Accepted

## Context

Master-plan **ADR-004** deferred native mobile past v1: responsive public form
pages (`/f/[slug]`) cover the fill-side; the enterprise Expo apps remain the
offline-first field-ops answer. Backlog **SB-007** targeted post-PMF.

Owner decision 2026-07-16: begin SMB mobile development now (scaffold + store
foundation) in parallel with S10 production deploy, using the same Expo
patterns proven in `attune-smart-forms`.

## Decision

1. **Amend ADR-004:** native mobile is allowed for the SMB edition starting with
   Phase 0 scaffold. Public web fill remains supported; mobile does not replace it.
2. **One field app** (`mobile-apps/field-app`) — no vendor/PIN app (SMB product cut).
3. **Shared package** `@attune-sb/mobile-shared` for tokens, authenticated API
   client, brand constants; later sync/workflow engine.
4. **Expo SDK 54 + Expo Router + EAS** — match enterprise for CI and store pipeline.
5. **Distinct store IDs** from enterprise (`com.attune.sb.smartforms`) — new Play
   listing and new App Store app.
6. **Push (SB-009)** stays deferred until Firebase/APNs are configured; builds
   must succeed without `google-services.json`.

## Consequences

- Monorepo gains `mobile-apps/*` workspace packages; CI lint/typecheck expands.
- Form fill on mobile requires a later RN renderer port (SMB form-engine is
  web-only today); Phase 0 does not block web launch.
- Store policy hardening (permission blocking, runtimeVersion discipline) is
  baked in from day one using enterprise lessons.

## Alternatives considered

- **Web-only PWA:** rejected for camera/GPS/store discovery goals.
- **Two apps (employee + vendor):** rejected — no vendor PIN surface in SMB.
- **React Native CLI without Expo:** rejected — loses EAS OTA/submit pipeline
  already proven on enterprise.
