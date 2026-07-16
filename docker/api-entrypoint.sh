#!/bin/sh
# Author: Robert Massey | Created: 2026-07-15 | Module: Docker / API entrypoint
# Release-on-boot: apply migrations and the idempotent seed, then start the API.
# Both steps are toggleable so a multi-replica future (Azure) can run them as a
# dedicated release job instead (set RUN_MIGRATIONS=false / RUN_SEED=false).
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] prisma migrate deploy"
  ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "[entrypoint] seeding (idempotent: plans, platform admin, library)"
  node dist-seed/prisma/seed.js
fi

echo "[entrypoint] starting API"
exec node dist/main
