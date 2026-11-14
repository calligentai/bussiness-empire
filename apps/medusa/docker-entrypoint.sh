#!/bin/sh
set -eu
cd /app
npx medusa db:migrate
npx medusa exec ./src/scripts/seed.ts
if [ -n "${MEDUSA_ADMIN_EMAIL:-}" ] && [ -n "${MEDUSA_ADMIN_PASSWORD:-}" ]; then
  npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" || true
fi
exec npx medusa start
