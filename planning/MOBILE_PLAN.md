# attune-sb-smart-forms — Mobile Plan

> Author: Robert Massey | Created: 2026-07-16
> Fast-tracks backlog **SB-007**. Amends master-plan ADR-004 via
> `docs/ADR/0007-native-mobile-expo.md`. Runs in parallel with S10 VPS launch.

## 1. Product shape

| Decision    | Choice                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| Apps        | **One** Expo field app (`mobile-apps/field-app`) — no vendor/PIN app    |
| Shared code | `@attune-sb/mobile-shared` under `mobile-apps/shared`                   |
| Contracts   | Existing `@attune-sb/shared-types`                                      |
| Form UI     | SMB `@attune-sb/form-engine` is web-only today; M2 ports an RN renderer |
| Stack       | Expo SDK 54 + Expo Router + EAS Build/Submit (same as enterprise)       |
| Devices     | Phone + tablet (iOS `supportsTablet: true`; Android large screens)      |

**Store identity (defaults until owner confirms):**

- Android applicationId: `com.attune.sb.smartforms` — **new** Play listing (do not reuse enterprise `com.attune.smartforms.employee`)
- iOS bundleId: `com.attune.sb.smartforms` — new App Store app
- Display name: Attune Smart Forms
- Privacy policy URL: `https://sfsb.attuneitus.com/privacy`

## 2. Phases

### Phase 0 — Scaffold (this delivery)

- Monorepo folder structure, shared package stubs, field-app Expo shell
- Branded icons/splash from enterprise employee assets (orange Attune identity)
- Play-policy baseline in `app.config.js` + `withStripMediaPermissions`
- CI lint/typecheck for mobile packages; manual EAS workflow stub
- No real auth, form fill, offline sync, or push

### M1 — Auth

- Login against SMB `/api/v1/auth/*` with SecureStore tokens + refresh rotation
- Org context, role-aware home, read-only / lifecycle banners
- Deep link scheme `attune-sb`

### M2 — Forms

- Published forms list + fill (RN form-engine renderer)
- Submit to API; submission metering awareness (OVER_LIMIT quarantine still server-side)
- Camera / location permissions only when field types require them (honest usage strings)

### M3 — Approvals & notifications

- Approval deep links
- Push (SB-009) when Firebase `google-services.json` + APNs are configured

### M4 — Store submission

- Play: internal → closed → production; Data safety form; feature graphic
- App Store: App Store Connect record, privacy nutrition labels, tablet + phone screenshots
- Explicit `runtimeVersion` bump on every store binary; no mismatched production OTAs

## 3. Monorepo layout

```
mobile-apps/
  README.md
  shared/          # @attune-sb/mobile-shared
  field-app/       # Expo app (phone + tablet)
```

Wired via `pnpm-workspace.yaml` → `mobile-apps/*`.

## 4. Store & policy checklist (enterprise lessons)

1. **Honest permissions only** — do not declare camera/location/mic until the feature ships.
2. **Block Play-restricted permissions** — `READ_MEDIA_*`, external storage, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW` via `blockedPermissions` + config plugin.
3. **`runtimeVersion` discipline** — bump on every store submission and any native/dependency change; never ship a production OTA against an incompatible binary (Jul 2026 Play rejection root cause on enterprise).
4. **No secrets in git** — `google-services.json`, Play service-account JSON, Apple keys are EAS secrets / local gitignored files.
5. **Encryption export** — `ITSAppUsesNonExemptEncryption: false` until non-exempt crypto is added.
6. **Privacy** — live privacy + terms URLs required before review; signup consent already exists on web.

## 5. CI/CD

| Pipeline                           | Role                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `.github/workflows/ci.yml`         | Lint + typecheck + test for `@attune-sb/mobile-shared` and field-app |
| `.github/workflows/mobile-eas.yml` | Manual `workflow_dispatch` EAS preview/production builds             |
| `deploy.yml`                       | Unchanged (web/api VPS only)                                         |

## 6. Owner inputs needed before first EAS build

1. Confirm package/bundle IDs (`com.attune.sb.smartforms`).
2. New Expo EAS `projectId` (placeholder in `app.config.js` until provided).
3. Apple Developer Team ID + App Store Connect app when ready for iOS.
4. Play Console service-account JSON for EAS submit (gitignored).

## 7. Out of scope for SMB v1 mobile

- Vendor / PIN app
- Warehouse / team-by-warehouse
- Enterprise SSO/OIDC
- Offline-first MobileWorkflowEngine parity (evaluate after M2)
