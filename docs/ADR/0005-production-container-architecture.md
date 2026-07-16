# ADR-0005: Production container architecture (VPS pathway)

> Author: Robert Massey | Date: 2026-07-15 | Status: Accepted

## Context

S10 ships the first production deploy, targeting a single Hostinger VPS
(AlmaLinux 10) with an eventual Azure migration. The API needs Chromium at
runtime (Puppeteer: DOCX→PDF), Prisma migrations must run on release, and the
seed is TypeScript executed with ts-node in development.

## Decisions

1. **System Chromium in the api image** (`chromium` from Debian bookworm,
   `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`, `PUPPETEER_SKIP_DOWNLOAD`).
   Puppeteer's own download would duplicate ~170 MB per install and pin a
   browser apt can't patch; the distro package gets security updates with
   image rebuilds. `tini` is PID 1 so orphaned Chromium processes are reaped.
2. **`prisma` moved from devDependencies to dependencies** (api). The runtime
   container executes `prisma migrate deploy` on boot; the CLI must survive
   `pnpm deploy --prod`. Version stays lockstep with `@prisma/client` (^5.10).
3. **Seed precompiled to JS** (`tsc -p tsconfig.seed.json --outDir dist-seed`)
   in the image build — no ts-node/typescript in production. The seed itself is
   production-aware: demo orgs (well-known passwords) are dev-only; the
   platform admin requires `PLATFORM_ADMIN_PASSWORD` from env in production.
4. **Web image is domain-agnostic**: `NEXT_PUBLIC_API_URL=/api/v1` (relative)
   baked at build; the reverse proxy path-routes one domain. Changing domains
   or moving to Azure never rebuilds images.
5. **Migrations/seed run in the api entrypoint** (single-host reality: one
   replica, atomic release). Toggleable via `RUN_MIGRATIONS`/`RUN_SEED` for the
   multi-replica Azure future where they become a release job.

## New/changed dependencies

- `prisma` (existing version) relocated to prod dependencies — see (2).
- No new npm packages. Image-level: `chromium`, `tini`, `fonts-liberation`
  (Debian packages, api runtime image only).

## Consequences

- API image is larger (~+300 MB for Chromium + fonts) — acceptable on a
  single VPS; revisit with a split worker image if Azure cost pressure appears.
- Boot-time migrations mean a bad migration blocks the rollout — the deploy
  workflow health-check catches it and the previous images remain on the host
  for instant rollback.
