# Run from Source (Development)

Use this for day-to-day development: each service runs with `node --watch` and the web app runs on the Vite dev server with hot reload.

## Prerequisites

- Node.js 20+
- PostgreSQL 17 or 18 running locally, **or** Docker (to run only Postgres)
- Git

## 1. Clone and install

```bash
git clone <YOUR_REPO_URL> nhpaowa_app
cd nhpaowa_app
npm install
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
```

The defaults in `.env.example` work for local development:

```env
DATABASE_URL=postgresql://nhpaowa:nhpaowa@localhost:5432/nhpaowa?schema=public
IDENTITY_PORT=4000
INVENTORY_PORT=4001
BUS_PORT=4002
AUTH_STRICT=false
```

## 2. Start PostgreSQL

::: code-group

```bash [Docker]
npm run db:up        # starts only the postgres container
```

```sql [Native PostgreSQL]
-- run once as the postgres superuser
CREATE USER nhpaowa WITH PASSWORD 'nhpaowa';
CREATE DATABASE nhpaowa OWNER nhpaowa;
\c nhpaowa
CREATE SCHEMA IF NOT EXISTS bus_tracking AUTHORIZATION nhpaowa;
```

:::

## 3. Create schemas and seed demo data

```bash
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run db:seed

npm run db:bus:push
npm run db:bus:seed
```

::: danger Keep the two Prisma schemas separate
The bus service owns the `bus_tracking` schema only. Never run the bus schema push against `public` (or the inventory push against `bus_tracking`) — Prisma will offer to drop the other service's tables.
:::

## 4. Run everything

Open four terminals in the repo root:

```bash
npm run dev:identity    # http://localhost:4000/health
npm run dev:inventory   # http://localhost:4001/health
npm run dev:bus         # http://localhost:4002/health
npm run dev:web         # http://localhost:5173
```

The Vite dev server proxies `/api/auth` → `:4000`, `/api/bus` → `:4002`, and `/api` + `/uploads` → `:4001`, so the browser only talks to `:5173`. It also listens on your LAN IP, so you can open `http://<your-pc-ip>:5173` from a phone on the same Wi-Fi.

### Restart everything (Windows PowerShell)

```powershell
4000,4001,4002,5173 | ForEach-Object {
  Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
$root = (Get-Location).Path
foreach ($s in 'dev:identity','dev:inventory','dev:bus','dev:web') {
  Start-Process powershell -ArgumentList '-NoExit','-Command',"cd '$root'; npm run $s"
}
```

## 5. Tests

```bash
npm run test -w @nhpaowa/inventory-service
node --env-file=.env services/inventory-service/scripts/e2e-smoke.mjs
```

## Mobile app (Expo)

```bash
npm run dev:mobile
```

Point the device at the API with `EXPO_PUBLIC_API_BASE_URL` (Android emulator default: `http://10.0.2.2:4001/api/inventory`). Screens: Item Lookup, Stock In, Stock Out, Alerts.
