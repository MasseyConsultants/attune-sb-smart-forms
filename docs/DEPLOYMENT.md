# Deployment

> Author: Robert Massey | Created: 2026-07-15
> Two pathways, one design: the **VPS pathway** (live today) and the **Azure
> pathway** (later, for scale). Everything runs in the same two containers
> either way — the pathways differ only in where Postgres/Redis/blobs live
> and what sits in front of the containers.

## Architecture (both pathways)

```
                    ┌─ HTTPS (443) ─────────────────────────────┐
  Internet ───────▶ │  Reverse proxy  (host nginx / Azure ingress)│
                    └───────┬───────────────────────┬────────────┘
                       /api/v1/*                everything else
                            │                        │
                    ┌───────▼───────┐        ┌───────▼───────┐
                    │  api (Nest)   │◀───────│  web (Next)   │  INTERNAL_API_URL
                    │  :3101        │        │  :3100        │
                    └──┬────┬───┬───┘        └───────────────┘
                       │    │   └── blob storage (volume now, S3-driver later: SB-017)
                  Postgres  Redis
```

- **One domain, path-routed.** The web image bakes `NEXT_PUBLIC_API_URL=/api/v1`
  (relative), so browser calls hit the same origin and the images are
  domain-agnostic. Server-side calls use `INTERNAL_API_URL` over the Docker
  network. Changing the subdomain = edit `DOMAIN` in the server `.env`, update
  DNS, re-run `vps-setup.sh`. No rebuild.
- The Next BFF routes live at `/api/*` (no `/v1`); the Nest API owns `/api/v1/*`.
  The nginx `location /api/v1/` must never be widened to `/api/`.
- The api entrypoint runs `prisma migrate deploy` + the idempotent seed on every
  boot (plans, platform admin, library templates — demo orgs are dev-only).
  Disable with `RUN_MIGRATIONS=false` / `RUN_SEED=false` when a future
  multi-replica setup moves them to a release job.

## Pathway 1 — Hostinger VPS (current production)

**Server:** `srv1286562.hstgr.cloud` — AlmaLinux 10, 4 vCPU, 16 GB RAM, 4 GB
swap, 200 GB disk. Docker 29, host nginx owns 80/443, firewalld + fail2ban.
App lives in `/opt/attune-sb`.

### First-time setup

1. DNS: `A` record for `sfsb.attuneitus.com` → VPS IP.
2. Copy files and create the env:

   ```bash
   scp docker/docker-compose.prod.yml docker/env.production.example \
       docker/nginx/attune-sb.conf.template scripts/vps-setup.sh \
       root@srv1286562.hstgr.cloud:/opt/attune-sb/
   ssh root@srv1286562.hstgr.cloud
   cd /opt/attune-sb && cp env.production.example .env && vi .env   # fill in everything
   ```

3. `bash vps-setup.sh` — installs certbot, sets the SELinux boolean, issues the
   cert, renders + activates the nginx site, pulls and starts the stack.
4. GitHub repo setup: secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (the
   existing `github-actions-deploy` key).

### Deploying a release

**Fully automated** (owner decision 2026-07-15, build/test phase): every push
to `main` runs CI, and a green CI run triggers Deploy automatically — images
are built, pushed to GHCR (commit SHA + `latest`), rolled onto the VPS over
SSH, and health-checked at `/api/v1/health`. Green tests are the only gate.
Before onboarding real customers, re-add the `production` environment approval
gate to the deploy job (see the note in `deploy.yml`).

**Manual/rollback:** Actions → Deploy → Run workflow. Set `image_tag` to a
previously deployed SHA to roll back (see `/opt/attune-sb/deploy-history.log`).

### Backups (data that must survive the box)

| What           | Where                             | How                                                                  |
| -------------- | --------------------------------- | -------------------------------------------------------------------- |
| Postgres       | `postgres_data` volume            | nightly `docker compose exec -T postgres pg_dump -U attune attune_sb | gzip` |
| Customer blobs | `api_storage` volume              | nightly tar of the volume                                            |
| Server config  | `/opt/attune-sb/.env`, nginx conf | copy on change                                                       |

Ship both nightly artifacts off-box (object storage or download). Redis is
cache/queues only — losing it is safe. A restore drill is part of S10 DoD.

### Stripe + email go-live checklist

- Stripe live keys + six live price IDs in `.env`; webhook endpoint
  `https://<DOMAIN>/api/v1/webhooks/stripe` (capture its signing secret).
- Until keys are set the app runs trial-only and checkout fails fast with
  `BILLING_NOT_CONFIGURED` — pinned behavior, safe to launch without.
- Resend: verify the sending domain (SPF/DKIM) for `noreply@attuneitus.com`.

## Pathway 2 — Azure (when scale demands it)

The same GHCR images run unchanged. What moves:

| Piece                | VPS today            | Azure later                                                  |
| -------------------- | -------------------- | ------------------------------------------------------------ |
| api + web containers | docker compose       | Container Apps (or App Service/VM)                           |
| Reverse proxy + TLS  | host nginx + certbot | Container Apps ingress / Front Door                          |
| Postgres             | container + volume   | Azure Database for PostgreSQL (`DATABASE_URL`)               |
| Redis                | container + volume   | Azure Cache for Redis (`REDIS_*`)                            |
| Blobs                | `api_storage` volume | S3-compatible store — **requires SB-017**                    |
| Migrations/seed      | entrypoint on boot   | release job; set `RUN_MIGRATIONS/RUN_SEED=false` on replicas |

**Hard prerequisite before multi-instance:** SB-017 (S3-compatible blob driver
with presigned uploads). `BlobStorageService` is already S3-shaped, so it's a
driver swap, not a refactor. Everything else is env-var re-pointing.

**Migration day, roughly:** provision managed Postgres/Redis → restore the
latest `pg_dump` → sync blobs into the object store → deploy containers with
the new env → cut DNS over → keep the VPS as a warm fallback until confident.
