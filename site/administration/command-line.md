# Command Line

All commands run from the repository root unless noted. The repo is an npm workspaces monorepo (`apps/*`, `services/*`, `packages/*`).

## Run

| Command | What it does |
|---------|--------------|
| `npm run dev:identity` | Identity service with auto-restart on `:4000` |
| `npm run dev:inventory` | Inventory + association service with auto-restart on `:4001` |
| `npm run dev:bus` | School bus service with auto-restart on `:4002` |
| `npm run dev:web` | Vite dev server on `:5173` (also on your LAN IP) |
| `npm run dev:mobile` | Expo mobile app |
| `npm run start -w @nhpaowa/identity-service` | Identity service without watch mode (production) |
| `npm run start -w @nhpaowa/inventory-service` | Inventory service without watch mode |
| `npm run start -w @nhpaowa/bus-service` | Bus service without watch mode |

## Build and test

| Command | What it does |
|---------|--------------|
| `npm run build -w @nhpaowa/web` | Production web build into `apps/web/dist` |
| `npm run build` | Build every workspace that has a build script |
| `npm run test` | Run all workspace tests |
| `npm run test -w @nhpaowa/inventory-service` | Inventory service tests (Jest + Supertest) |
| `node --env-file=.env services/inventory-service/scripts/e2e-smoke.mjs` | End-to-end smoke test against running services |

## Database

| Command | What it does |
|---------|--------------|
| `npx prisma db push --schema=services/inventory-service/prisma/schema.prisma` | Create or update inventory + association tables (`public` schema) |
| `npm run db:seed` | Seed demo users, towers and flats, inventory, notices, board |
| `npm run db:bus:push` | Create or update school bus tables (`bus_tracking` schema) |
| `npm run db:bus:seed` | Seed demo schools, buses, batches, and slots |
| `npm run db:reset -- --yes` | **Destructive.** Wipes the database, re-applies the schema, re-seeds, and clears uploads. Does nothing without `--yes` |
| `node --env-file=.env scripts/regen-notice-pdfs.mjs` | Regenerate PDFs for all published notices (for example after changing the letterhead) |

::: warning
`db push` can drop columns when the schema changes. Read Prisma's prompt before accepting data loss, and back up first.
:::

## Docker

| Command | What it does |
|---------|--------------|
| `npm run db:up` | Start only the PostgreSQL container |
| `npm run db:down` | Stop containers |
| `npm run docker:up` | Build and start the full stack (`--profile full`) |
| `npm run docker:down` | Stop the full stack (data is kept) |
| `npm run docker:logs` | Follow logs for all containers |

## Documentation site

From the `site/` folder:

| Command | What it does |
|---------|--------------|
| `npm install` | Install VitePress and the screenshot tool |
| `npm run docs:dev` | Live-reloading docs on http://localhost:5173 (stop the app's web server first, or VitePress picks the next free port) |
| `npm run docs:build` | Static site into `site/.vitepress/dist` |
| `npm run docs:preview` | Preview the built site |
| `npm run screenshots` | Re-capture every screenshot from a running, seeded app — see [Developing](/contributing/developing#updating-screenshots) |
