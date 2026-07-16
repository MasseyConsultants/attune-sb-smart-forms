# =============================================================================
# attune-sb-smart-forms — API production image (NestJS)
# Author: Robert Massey | Created: 2026-07-15
#
# Multi-stage pnpm monorepo build. The runtime carries system Chromium for
# Puppeteer (DOCX→PDF conversion), the prisma CLI for `migrate deploy`, and a
# precompiled seed (dist-seed/) so no TypeScript tooling ships to production.
# Build from the REPO ROOT:  docker build -f docker/api.Dockerfile .
# =============================================================================

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    # Chromium comes from apt in the runtime stage — never download it via npm.
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN corepack enable

# --- Build stage: full workspace install + compile ---
FROM base AS build
WORKDIR /app
# openssl: prisma engine requirement on slim images
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Manifests first so the dependency layer caches across source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY api/package.json api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/form-engine/package.json packages/form-engine/
COPY packages/eslint-config/package.json packages/eslint-config/
# --ignore-scripts skips husky/turbo postinstalls; prisma generate runs explicitly.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages ./packages
COPY api ./api

RUN pnpm --filter attune-sb-api exec prisma generate \
    && pnpm --filter @attune-sb/shared-types build \
    && pnpm --filter @attune-sb/form-engine build \
    && pnpm --filter attune-sb-api build
# Precompile the seed so production runs plain node (no ts-node in the image).
# --rootDir pins the layout: dist-seed/prisma/seed.js regardless of imports.
RUN cd api && pnpm exec tsc -p tsconfig.seed.json --outDir dist-seed --rootDir .

# Self-contained production bundle: api files + prod deps + workspace packages.
RUN pnpm --filter attune-sb-api deploy --legacy --prod /prod/api \
    && cd /prod/api && ./node_modules/.bin/prisma generate

# --- Runtime stage ---
FROM base AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium fonts-liberation fonts-dejavu-core \
       tini openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=build --chown=node:node /prod/api ./
COPY --chmod=755 docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
# Blob storage default (STORAGE_LOCAL_DIR) — a named volume mounts here.
RUN mkdir -p /app/storage && chown node:node /app/storage

USER node
EXPOSE 3101
# tini reaps Chromium child processes; SIGTERM flows to node for Nest shutdown hooks.
ENTRYPOINT ["tini", "--", "api-entrypoint.sh"]
