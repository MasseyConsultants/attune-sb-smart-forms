# attune-sb-smart-forms — Sprint 10

> Author: Robert Massey | Created: 2026-07-15
> Phase: P6 Launch Hardening

**Sprint 10 Goal:** The product runs in production. A repeatable, container-based
deployment ships to the Hostinger VPS (srv1286562, AlmaLinux 10 — reclaimed from
the enterprise test deploy on 2026-07-15) behind the host nginx with TLS, driven
by a GitHub Actions pipeline with a manual deploy gate. The deployment is
designed so the later Azure move is an env-var + blob-driver change, not a
re-architecture.

## Deployment target (decided 2026-07-15)

- **Host:** Hostinger VPS `srv1286562.hstgr.cloud` — 4 vCPU EPYC, 16 GB RAM,
  4 GB swap, 200 GB disk, AlmaLinux 10, Docker 29, host nginx owns 80/443,
  firewalld + fail2ban active. Box was wiped clean of the enterprise test
  stack and Budibase; old configs archived at `/root/attune-smart-forms.old`
  and `/root/nginx-archive` for reference.
- **Domain:** `sfsb.attuneitus.com` — held as a variable everywhere
  (`DOMAIN` in the VPS `.env`, `envsubst` in the nginx template). Single
  domain, path-routed: `/api/v1/*` → api container, everything else → web
  container. The web image uses a relative `NEXT_PUBLIC_API_URL=/api/v1`
  so changing the domain never requires an image rebuild.
- **Azure later:** same images run on Azure Container Apps / VM. Postgres and
  Redis swap to managed services via `DATABASE_URL` / `REDIS_*`. The only code
  prerequisite is SB-017 (S3-compatible blob driver) before going
  multi-instance. Documented in `docs/DEPLOYMENT.md` § Azure pathway.

## Tasks

1. **Production images** (`docker/`)
   - `api.Dockerfile` — multi-stage pnpm build (shared-types + form-engine +
     api), Debian slim runtime with system Chromium for Puppeteer
     (`PUPPETEER_EXECUTABLE_PATH`), compiled seed (`dist-seed/`), prisma CLI
     in the runtime for `migrate deploy`, entrypoint runs migrate + seed
     before boot (toggleable)
   - `web.Dockerfile` — Next.js standalone output, relative public API URL
     baked at build, non-root runtime
   - `.dockerignore`, `.gitattributes` (LF for shell scripts)
2. **Production seed safety** (`api/prisma/seed.ts`)
   - Demo/tier orgs (well-known passwords) seeded in development only
   - Platform admin in production requires `PLATFORM_ADMIN_PASSWORD` env
3. **Reverse-proxy correctness** (`api/src/main.ts`)
   - `trust proxy` so `@Ip()` and per-IP intake throttles see the real client
     address from `X-Forwarded-For` behind nginx
4. **Compose + config** (`docker/`)
   - `docker-compose.prod.yml` — postgres 16 + redis 7 (password, no public
     ports), api + web bound to `127.0.0.1` only, named volumes for pg data,
     redis data, and blob storage; healthchecks; `DOMAIN`-driven URLs
   - `env.production.example` — the full production env contract
   - `nginx/attune-sb.conf.template` — host-nginx site: TLS, HTTP→HTTPS,
     path routing, real-IP forwarding, 64 MB upload cap (50 MB plan max +
     headroom), ACME webroot
   - `scripts/vps-setup.sh` — first-time VPS bootstrap (dirs, nginx render,
     certbot)
5. **Deploy pipeline** (`.github/workflows/deploy.yml`)
   - Manual trigger (`workflow_dispatch`), builds api + web images → GHCR,
     deploy job gated on the `production` environment, SSH `compose pull &&
up -d` using the existing `github-actions-deploy` key
6. **Docs** — `docs/DEPLOYMENT.md`: VPS pathway (runbook: first deploy,
   redeploy, rollback, backups, restore drill) + Azure pathway (what changes,
   what doesn't, SB-017 prerequisite); ADR-0005 (system Chromium, prisma CLI
   in runtime deps, compiled seed, domain-agnostic web image)
7. **Remaining S10 hardening** (carried in-sprint, after first deploy):
   backup/restore drill on the VPS, Stripe live-mode config + webhook smoke,
   Resend domain verification, uptime monitor on `/api/v1/health`,
   semantic-release + CHANGELOG

## Definition of Done

- `docker compose -f docker/docker-compose.prod.yml` boots the full stack
  locally from built images (migrate + seed + health green)
- First production deploy to the VPS succeeds via the pipeline; signup → build
  form → publish → public submit works end to end over HTTPS
- Lint/typecheck/tests green; scorecard updated
