# Developing

## Repository layout

The repository is an npm-workspaces monorepo.

```txt
nhpaowa_app/
├── apps/
│   ├── web/                  React 18 + Vite + Tailwind web app (PWA)
│   └── mobile/               Expo app for storeroom staff
├── services/
│   ├── identity-service/     Sign-in, users, role menu features (port 4000)
│   ├── inventory-service/    Inventory + association module (port 4001)
│   └── bus-service/          School bus gate (port 4002, schema bus_tracking)
├── packages/
│   ├── shared-auth/          Roles, permission matrix, JWT middleware
│   ├── shared-ui/            Tower/apartment catalogue, member roles, association calendar
│   └── shared-notifications/ Alert types and the notification emitter
├── docker/                   Dockerfiles, nginx config, migrate script
├── docs/                     Plain-markdown install guides
├── specs/                    Feature specifications (001–028)
├── scripts/                  Data reset and maintenance scripts
└── site/                     This documentation site (VitePress)
```

## Local setup

Follow [Run from Source](/installation/from-source). In short:

```bash
npm install
cp .env.example .env          # set DATABASE_URL, JWT_SECRET
npm run db:migrate && npm run db:seed
npm run db:bus:push && npm run db:bus:seed

npm run dev:identity          # each in its own terminal
npm run dev:inventory
npm run dev:bus
npm run dev:web               # http://localhost:5173
```

The services run with `node --watch`, and Vite hot-reloads the web app.

## Where things go

| You're changing… | Edit |
|------------------|------|
| Who can see or do what | `packages/shared-auth/src/permissions.js` — both the API and the menu read it |
| A screen | `apps/web/src/modules/<module>/pages/` |
| Navigation | `apps/web/src/App.jsx` |
| API calls from the web app | `apps/web/src/modules/<module>/api/` |
| Inventory or association endpoints | `services/inventory-service/src/routes/` |
| Database tables (main) | `services/inventory-service/prisma/schema.prisma`, then a migration |
| Bus tables | `services/bus-service/prisma/schema.prisma`, then `npm run db:bus:push` |
| Alert types | `packages/shared-notifications` |

::: warning Two Prisma schemas, one database
The inventory schema owns the `public` Postgres schema and the bus service owns `bus_tracking`. Never point one Prisma schema at the other's tables — `prisma db push` would try to drop them.
:::

## Feature specifications

Each feature starts as a spec under `specs/NNN-short-name/` using [Spec Kit](https://github.com/github/spec-kit): `spec.md` (what and why), `plan.md` (how), and `tasks.md` (ordered work). The Cursor skills in `.cursor/skills/` (`speckit-specify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`) drive that flow.

When you add a feature, add a spec first and link it from the PR. The [Feature List](/help/features) is derived from these specs.

## Conventions

- **ES modules** everywhere (`import`/`export`), Node 20+.
- **Validation** with `zod` at the top of every route; return `400` with `{ error }` on failure.
- **Permissions** with `requirePermission(resource, action)` on every route, never role-name checks inside handlers.
- **Soft deletes** — set `deletedAt`, and filter `deletedAt: null` in queries.
- **Immutable logs** — stock transactions, attendance punches, and bus gate trips are never edited; mistakes get correction records.
- **Association scoping** — every query filters by `req.user.associationId`.
- **UI** — Tailwind classes, the existing `PageHeader`/`EmptyState` components, and card layouts on narrow screens.

## Tests

```bash
npm test                                   # all workspaces that define tests
npm test -w @nhpaowa/inventory-service     # Jest API tests
```

The inventory-service tests run against the database in `DATABASE_URL`, so point it at a scratch database, not one with real data.

## Updating screenshots

Every screenshot on this site comes from the running app, captured by `site/scripts/capture-screenshots.mjs` with your installed Chrome via `playwright-core` (no browser download).

1. Start the three services and the web app, and seed the demo accounts (password `password123`).
2. Run:

   ```bash
   cd site
   npm install --no-workspaces
   npm run screenshots
   ```

3. Images are written to `site/public/screenshots/`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_URL` | `http://localhost:5173` | Web app to capture |
| `AUTH_URL` | `http://127.0.0.1:4000/api/auth` | Identity service used to sign in each role |
| `CHROME_PATH` | Auto-detected | Path to Chrome or Edge |
| `ONLY` | All | Comma-separated shot names, e.g. `ONLY=flats,noc` |

Capture against a freshly seeded database so the pictures don't show test records or real residents' details.

## Working on this site

```bash
cd site
npm install --no-workspaces
npm run docs:dev        # http://localhost:5173 (use another port if the app is running)
npm run docs:build      # fails on dead links
```

Pages are Markdown under `site/`; the sidebar is in `site/.vitepress/config.mjs`.
