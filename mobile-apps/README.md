# Mobile apps (SMB)

> Author: Robert Massey | Created: 2026-07-16
> Plan: `planning/MOBILE_PLAN.md` · ADR: `docs/ADR/0007-native-mobile-expo.md`

## Layout

| Package                    | Path         | Role                                               |
| -------------------------- | ------------ | -------------------------------------------------- |
| `@attune-sb/mobile-shared` | `shared/`    | Tokens, authenticated API client, brand constants  |
| `attune-sb-field-app`      | `field-app/` | Single Expo app (phone + tablet) for SMB customers |

No vendor/PIN app — that surface is an enterprise-only cut.

## Local development

```bash
# from repo root
pnpm install
pnpm --filter attune-sb-field-app start
```

Set `EXPO_PUBLIC_API_URL` in `field-app/.env.local` (see `.env.example`).

## EAS

Profiles live in `field-app/eas.json`. Create an Expo project, paste the
`projectId` into `field-app/app.config.js` `extra.eas.projectId`, then:

```bash
cd mobile-apps/field-app
eas build --profile preview --platform android
```

CI: `.github/workflows/mobile-eas.yml` (manual `workflow_dispatch`).
