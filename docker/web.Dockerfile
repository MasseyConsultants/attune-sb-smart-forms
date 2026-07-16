# =============================================================================
# attune-sb-smart-forms — Web production image (Next.js 15 standalone)
# Author: Robert Massey | Created: 2026-07-15
#
# The public API URL is baked in as a RELATIVE path (/api/v1): the reverse
# proxy serves web and api on one domain, so the image is domain-agnostic —
# changing subdomains (or moving to Azure) never requires a rebuild.
# Build from the REPO ROOT:  docker build -f docker/web.Dockerfile .
# =============================================================================

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable

# --- Build stage ---
FROM base AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY web/package.json web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/form-engine/package.json packages/form-engine/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages ./packages
COPY web ./web

# Inlined into the client bundle at build time (browser-side calls only;
# server-side calls use INTERNAL_API_URL at runtime).
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NODE_ENV=production

RUN pnpm --filter @attune-sb/shared-types build \
    && pnpm --filter @attune-sb/form-engine build \
    && pnpm --filter attune-sb-web build

# --- Runtime stage ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3100 \
    HOSTNAME=0.0.0.0

# Standalone output keeps the monorepo layout: server lives at web/server.js.
COPY --from=build --chown=node:node /app/web/.next/standalone ./
COPY --from=build --chown=node:node /app/web/.next/static ./web/.next/static
COPY --from=build --chown=node:node /app/web/public ./web/public

USER node
EXPOSE 3100
CMD ["node", "web/server.js"]
