# Configuration

All configuration lives in a single `.env` file in the repository root. The three services load it with `node --env-file=../../.env`, Prisma reads `DATABASE_URL` from it, and Vite reads the `VITE_*` values when building the web app.

Start from the template:

```bash
cp .env.example .env
```

## Server settings

| Variable | Default | Used by | Description |
|----------|---------|---------|-------------|
| `NODE_ENV` | `development` | all services | Set to `production` on servers |
| `HOSTING_MODE` | `docker` | Vercel config script, future adapters | `docker` \| `vercel-spa` \| `vercel-fullstack` — see [Vercel Hosting](/installation/vercel-hosting) |
| `DATABASE_URL` | local Docker URL | inventory, identity, bus, Prisma | Runtime Postgres URL. On Supabase use the **Transaction pooler** (`pgbouncer=true`). Bus uses schema `bus_tracking`. |
| `DATABASE_URL_UNPOOLED` | same as `DATABASE_URL` locally | Prisma `directUrl` | Direct/session URL for `db push` / migrate. **Required** in Prisma schema — set equal to `DATABASE_URL` for Docker. |
| `SUPABASE_URL` | _(unset)_ | inventory uploads (mode B) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | _(unset)_ | inventory uploads (mode B) | Service role key (server only) |
| `SUPABASE_STORAGE_BUCKET` | `uploads` | inventory uploads (mode B) | Storage bucket name |
| `CRON_SECRET` | _(unset)_ | `/api/cron` | Bearer token for Vercel Cron in mode B |
| `ASSOCIATION_ID` | `00000000-0000-4000-8000-000000000001` | all services, seed | Tenant ID stamped on every row. Keep the default unless you run several associations in one database |
| `JWT_SECRET` | `nhpaowa-dev-secret-change-me` | all services | Signs and verifies login tokens. **Must** be a long random value in production and identical across services |
| `AUTH_STRICT` | `false` | all services | When `true`, every API call needs a valid token. See the warning below |
| `IDENTITY_PORT` | `4000` | identity | Listen port |
| `INVENTORY_PORT` | `4001` | inventory | Listen port |
| `BUS_PORT` | `4002` | bus | Listen port |
| `PO_APPROVAL_THRESHOLD` | `10000.00` | inventory | Initial purchase-order approval threshold in ₹. After first run, Secretary edits it in **Settings** |
| `API_PROXY_ORIGIN` | _(unset)_ | `npm run vercel:config` | Mode A: single HTTPS origin that fronts all APIs (rewrites `/api/*` and `/uploads/*`) |
| `IDENTITY_UPSTREAM` | _(unset)_ | `npm run vercel:config` | Mode A: override for identity (falls back to `API_PROXY_ORIGIN`) |
| `INVENTORY_UPSTREAM` | _(unset)_ | `npm run vercel:config` | Mode A: override for inventory/association/uploads |
| `BUS_UPSTREAM` | _(unset)_ | `npm run vercel:config` | Mode A: override for bus |

::: danger Always set AUTH_STRICT=true in production
With `AUTH_STRICT=false`, any request **without** a token is accepted as a Secretary — or as whatever role the caller puts in the `X-Dev-Role` header, including Superadmin. This exists only for local API testing.
:::

Login tokens are valid for **7 days**. Changing `JWT_SECRET` signs everyone out.

## Web app settings

`VITE_*` variables are compiled into the web build. Rebuild (`npm run build -w @nhpaowa/web`) after changing them.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api/inventory` | Inventory API base |
| `VITE_INVENTORY_BASE_URL` | `/api/inventory` | Inventory API base used by the public flat-update pages |
| `VITE_ASSOCIATION_BASE_URL` | `/api/association` | Flats, NOC, moves, notices, board, attendance |
| `VITE_IDENTITY_BASE_URL` | `/api/auth` | Identity API base |
| `VITE_BUS_BASE_URL` | `/api/bus` | School bus API base |
| `VITE_UPLOAD_ORIGIN` | derived from `VITE_API_BASE_URL` | Origin that serves `/uploads/*` (photos, attachments) |
| `VITE_DEV_ROLE` | `SECRETARY` | Role sent as `X-Dev-Role` when not logged in (development only) |

**Which values to use:**

- **Behind a reverse proxy or the Docker web container** (recommended): leave them relative (`/api/...`). The browser calls the same origin and the proxy routes each path — see [Reverse Proxy](/installation/reverse-proxy).
- **Vercel `vercel-spa` with API rewrites**: use relative `/api/...` and set `API_PROXY_ORIGIN` (or per-service upstreams), then `npm run vercel:config` — see [Vercel Hosting](/installation/vercel-hosting).
- **Static server with no proxy** (for example the Windows `serve` setup): use absolute URLs such as `http://192.168.1.50:4001/api/inventory`, and set **all** of the base URLs above, because any that stay relative will hit the static server and fail.
- **Vite dev server**: the defaults work; `vite.config.js` proxies them.

## Docker Compose overrides

Compose reads the same `.env` for variable substitution. These are the values the containers pick up:

| Variable | Default in Compose |
|----------|--------------------|
| `JWT_SECRET` | `nhpaowa-dev-secret-change-me` |
| `AUTH_STRICT` | `true` |
| `ASSOCIATION_ID` | `00000000-0000-4000-8000-000000000001` |
| `PO_APPROVAL_THRESHOLD` | `10000.00` |
| `SEED_ON_START` | `true` — the migrate job seeds demo data. Set `false` once you hold real data |

`DATABASE_URL` is fixed inside Compose to the `postgres` container.

## In-app settings

Some behaviour is configured in the UI rather than `.env`:

| Where | Who | What |
|-------|-----|------|
| **Settings** | Superadmin, Secretary | PO approval threshold, auto purchase requisition on low stock, association preferences |
| **Users** | Superadmin | Users, roles, and left-menu features per operations role — see [Users & Menu Features](/administration/users) |
| **Board** | Superadmin | Office bearers shown on the PDF letterhead and the President's signature |
| **Bus batches** | Secretary, Security Head, Estate Manager | Bay capacity and slot timings for the bus gate |

<img class="screenshot" src="/screenshots/settings.png" alt="Settings page" />

## Production checklist

- [ ] `JWT_SECRET` is a long random value (for example `openssl rand -hex 32`)
- [ ] `AUTH_STRICT=true`
- [ ] `NODE_ENV=production`
- [ ] Database password is not `nhpaowa`
- [ ] Demo accounts are deactivated or their passwords changed
- [ ] The **Quick demo login** buttons on the sign-in page are removed from `apps/web/src/modules/inventory/pages/LoginPage.jsx` (they are shown in every build)
- [ ] APIs are reachable only through the reverse proxy, over HTTPS
- [ ] Database and `uploads` folder are backed up
- [ ] If using Vercel: `HOSTING_MODE` is set correctly (`vercel-spa` today; do not use `vercel-fullstack` until adapters exist) — see [Vercel Hosting](/installation/vercel-hosting)
