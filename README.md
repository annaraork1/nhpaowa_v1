# NHPAOWA Platform

Association-owned platform monorepo. Modules include **Inventory**, **Association ops** (flats, NOC, attendance, moves), and **School bus gate** (`bus-service`).

## Stack

- Node.js 20+ + Express (JS)
- PostgreSQL + Prisma (`public` for inventory/identity; `bus_tracking` for school buses)
- React + Vite + Tailwind (web shell + PWA)
- Expo (mobile)
- Identity (`:4000`) · Inventory (`:4001`) · Bus (`:4002`) + JWT via `packages/shared-auth`
- Vercel fullstack deploy (`vercel.json` + `api/*`) — production: https://nhpaowa-v1.vercel.app  
  Guide: [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md)
- Docker Compose full stack — guide: [`docs/DEPLOY-DOCKER.md`](docs/DEPLOY-DOCKER.md)
- GitHub: https://github.com/annaraork1/nhpaowa_v1 (connected to Vercel for git deploys)
- Netlify config (`netlify.toml`) still available for SPA-only hosting

## Local setup

### Database

**Preferred:** Docker Compose (when Docker Desktop is installed):

```bash
npm run db:up
```

**Local Postgres** (default for this machine):

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nhpaowa?schema=public
```

Create the database once if it does not exist:

```sql
CREATE DATABASE nhpaowa;
```

### App

```bash
npm install
cp .env.example .env   # if needed
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run db:seed
npm run db:bus:push
npm run db:bus:seed

# four terminals
npm run dev:identity    # http://localhost:4000/health
npm run dev:inventory   # http://localhost:4001/health
npm run dev:bus         # http://localhost:4002/health
npm run dev:web         # http://localhost:5173
```

**Login (seeded):**  
| Email | Role |
|-------|------|
| superadmin@nhpaowa.local | Superadmin (Users admin) |
| secretary@nhpaowa.local | full view/edit/delete + settings |
| treasurer@nhpaowa.local | view + PO approve / limited write |
| staff@nhpaowa.local | stock in/out (no master delete) |
| security.staff@nhpaowa.local | attendance + school bus gate |
| resident@nhpaowa.local | resident portal + today’s buses |
| vendor@shree.local | vendor portal |

Password for all: `password123`

School bus UI: **Bus gate** / **Schools & buses** (ops) · **Today’s buses** (resident). Full Windows install notes: [`docs/INSTALL-WINDOWS.md`](docs/INSTALL-WINDOWS.md) §15. Spec: [`specs/027-school-bus-management/`](specs/027-school-bus-management/).

**Create users:** Sign in as Superadmin → **Users** in the sidebar. Only Superadmin can add users and assign roles.

Web shell **requires login**. Role drives Create / Edit / Delete via shared permission matrix (`specs/002-role-based-auth/`).

Dev stub (`X-Dev-Role`) still works on the API when `AUTH_STRICT=false` and no JWT is sent.

### Features

- Master data, PO lifecycle + approval + emergency path
- Multi-warehouse stock + WarehouseStock
- Barcode lookup / Code128 labels
- Purchase requisitions + auto-PR on low stock (Settings)
- Vendor portal (supplier-scoped POs)
- Reports CSV + PDF
- AMC, alerts, dashboard, global search, item photos
- Identity service (login / JWT / register)

### PO approval

- Threshold stored in association settings (default ₹10,000; editable in Settings by Secretary).
- Submit under/equal threshold → auto-`APPROVED`.
- Submit above threshold → `PENDING_APPROVAL` → Secretary or Treasurer can Approve.
- Emergency PO → auto-`APPROVED` with `pendingPostApproval` until Secretary/Treasurer post-approves.
- Full receive → PO status `CLOSED` automatically.

## Scripts

```bash
npm run test -w @nhpaowa/inventory-service
node --env-file=.env services/inventory-service/scripts/e2e-smoke.mjs
```

## Mobile (Phase 5)

```bash
npm install
npm run dev:mobile
```

Point the device/emulator at the API with `EXPO_PUBLIC_API_BASE_URL` if needed  
(Android emulator default: `http://10.0.2.2:4001/api/inventory`).

Screens: Item Lookup, Stock In, Stock Out, Alerts.

## Spec Kit

Feature docs: `specs/001-inventory-management/`  
Constitution: `.specify/memory/constitution.md`

## Netlify

`netlify.toml` builds `@nhpaowa/web`. Proxy `/api/inventory` (and `/api/auth`) to hosted services when you wire production.
