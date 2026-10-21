#!/bin/sh
set -e

echo "[migrate] Applying Prisma schema (inventory)..."
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma

echo "[migrate] Applying Prisma schema (bus_tracking)..."
npx prisma db push --schema=services/bus-service/prisma/schema.prisma
npx prisma generate --schema=services/bus-service/prisma/schema.prisma

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[migrate] Seeding database..."
  node services/inventory-service/prisma/seed.js
  node services/bus-service/prisma/seed.js
  echo "[migrate] Seed complete."
else
  echo "[migrate] Skipping seed (set SEED_ON_START=true to enable)."
fi

echo "[migrate] Done."
