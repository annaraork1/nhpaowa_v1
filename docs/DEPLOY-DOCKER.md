# Deploy with Docker Compose

This document describes how NHPAOWA runs as a **full stack on Docker**: Postgres, three Express services, and an nginx front that serves the Vite SPA and reverse-proxies APIs.

Related: [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) · [INSTALL-WINDOWS.md](./INSTALL-WINDOWS.md) · [INSTALL-LINUX.md](./INSTALL-LINUX.md) · [site/installation/docker.md](../site/installation/docker.md)

---

## Architecture

Everything runs as containers on one host (or Docker Desktop). **nginx** is the single public origin; browsers call relative `/api/*` and `/uploads/*`.

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Browser / PWA]
  end

  subgraph docker [Docker Compose profile full]
    Nginx[nginx web :80]
    Identity[identity-service :4000]
    Inventory[inventory-service :4001]
    Bus[bus-service :4002]
    Migrate[migrate job once]
    PG[(postgres :5432)]
    VolPG[(volume nhpaowa_pgdata)]
    VolUp[(volume nhpaowa_uploads)]
  end

  Browser -->|"http://host/"| Nginx
  Nginx -->|"/"| Static[SPA files in image]
  Nginx -->|"/api/auth/"| Identity
  Nginx -->|"/api/inventory/ /api/association/"| Inventory
  Nginx -->|"/api/bus/"| Bus
  Nginx -->|"/uploads/"| Inventory
  Identity --> PG
  Inventory --> PG
  Bus --> PG
  Inventory --> VolUp
  PG --> VolPG
  Migrate --> PG
  Identity -.->|depends_on| Migrate
  Inventory -.->|depends_on| Migrate
  Bus -.->|depends_on| Migrate
```

### Path map (nginx)

From [`docker/nginx.conf`](../docker/nginx.conf):

| Path | Upstream |
|------|----------|
| `/` | Static SPA (`try_files` → `index.html`) |
| `/api/auth/` | `identity:4000` |
| `/api/inventory/` | `inventory:4001` |
| `/api/association/` | `inventory:4001` |
| `/api/bus/` | `bus:4002` |
| `/uploads/` | `inventory:4001` (local disk volume) |

### Process model vs Vercel

| Concern | Docker | Vercel |
|---------|--------|--------|
| API runtime | Long-lived `node …/index.js` (`listen`) | Serverless Functions per request |
| Uploads | Disk volume `nhpaowa_uploads` | Supabase Storage |
| Jobs | In-process `setInterval` on inventory + bus | Vercel Cron (daily on Hobby) |
| Database | Compose Postgres (or external URL) | Supabase Postgres |
| `HOSTING_MODE` | `docker` (default) | `vercel-fullstack` |

---

## Deploy flow

```mermaid
sequenceDiagram
  participant Ops as Operator
  participant DC as Docker Compose
  participant PG as postgres
  participant Mig as migrate
  participant Svc as identity inventory bus
  participant Web as web nginx

  Ops->>Ops: cp .env.example .env (JWT_SECRET, AUTH_STRICT)
  Ops->>DC: npm run docker:up
  Note over DC: docker compose --profile full up -d --build
  DC->>PG: Start + init-schemas.sql
  PG-->>DC: healthy
  DC->>Mig: prisma push + optional seed
  Mig-->>DC: exit 0
  DC->>Svc: Start Express services
  DC->>Web: Build SPA image + nginx
  Ops->>Web: Open http://localhost:8080/ or host IP:8080
```

Host port mapping: **`8080 → container 80`** (`web` service in `docker-compose.yml`).

### Commands

From repo root (Docker Desktop / Engine required):

```bash
# Full stack (Postgres + migrate + APIs + nginx web)
npm run docker:up

# Logs
npm run docker:logs

# Stop
npm run docker:down

# Postgres only (native Node APIs on the host)
npm run db:up
```

Equivalent Compose:

```bash
docker compose --profile full up -d --build
docker compose --profile full down
```

---

## Configuration

### Compose services (`docker-compose.yml`)

| Service | Profile | Role |
|---------|---------|------|
| `postgres` | default | PostgreSQL 18; mounts `docker/init-schemas.sql` |
| `migrate` | `full` | One-shot: schema push + seed when `SEED_ON_START=true` |
| `identity` | `full` | Auth API `:4000` |
| `inventory` | `full` | Inventory + association + uploads `:4001` |
| `bus` | `full` | School bus API `:4002` |
| `web` | `full` | Built SPA + nginx; host **`:8080`** → container `:80` |

Images:

- Node services: [`docker/Dockerfile.node`](../docker/Dockerfile.node)
- Web: [`docker/Dockerfile.web`](../docker/Dockerfile.web) + [`docker/nginx.conf`](../docker/nginx.conf)

### Environment

Root [`.env`](../.env.example) (and Compose substitution):

| Variable | Notes |
|----------|-------|
| `HOSTING_MODE` | `docker` |
| `JWT_SECRET` | Must be strong in production; same value for all API containers |
| `AUTH_STRICT` | `true` in production (Compose default for services) |
| `ASSOCIATION_ID` | Tenant UUID |
| `PO_APPROVAL_THRESHOLD` | Initial PO threshold |
| `SEED_ON_START` | `true` seeds demo data on migrate; set `false` after real data |
| `DATABASE_URL` | Inside Compose, services use the `postgres` hostname (Compose overrides) |

For **native** Node against Compose Postgres only:

```env
DATABASE_URL=postgresql://nhpaowa:nhpaowa@localhost:5432/nhpaowa?schema=public
DATABASE_URL_UNPOOLED=postgresql://nhpaowa:nhpaowa@localhost:5432/nhpaowa?schema=public
HOSTING_MODE=docker
```

Web container uses relative API paths (same origin through nginx). Local Vite without Docker uses absolute `VITE_*` in `.env.example`.

### Schemas

[`docker/init-schemas.sql`](../docker/init-schemas.sql) creates helper schemas on first Postgres volume init. Application tables:

- **public** — inventory, association, users (identity)
- **bus_tracking** — school bus (Prisma multi-schema)

---

## Data & uploads

```mermaid
flowchart LR
  Inv[inventory-service]
  Disk["/app/.../uploads volume"]
  PG[(Postgres)]
  Inv -->|multer diskStorage| Disk
  Inv --> PG
  Browser -->|GET /uploads/... via nginx| Inv
```

- Uploads persist in Docker volume **`nhpaowa_uploads`**.
- Database persists in **`nhpaowa_pgdata`**.
- Back up both volumes for disaster recovery.

---

## Production hardening

- [ ] Change Postgres password (not `nhpaowa`) and update service `DATABASE_URL`s  
- [ ] Set long random `JWT_SECRET`; `AUTH_STRICT=true`  
- [ ] `SEED_ON_START=false` once real data exists; disable/change demo users  
- [ ] Put TLS in front (host nginx, Caddy, or cloud LB) → proxy to host `:8080`  
- [ ] Restrict published ports; do not expose Postgres/`4000–4002` publicly if nginx is enough  
- [ ] Schedule volume backups  

Optional: point Compose `DATABASE_URL` at a managed Postgres (Supabase/RDS) while keeping APIs in Docker — keep `HOSTING_MODE=docker` and disk or object storage as you prefer.

---

## Quick checklist

- [ ] Docker Engine running  
- [ ] `.env` with production `JWT_SECRET` / `AUTH_STRICT`  
- [ ] `npm run docker:up` healthy  
- [ ] Open `http://localhost:8080/` (or host IP:8080)  
- [ ] Login works (seeded users if `SEED_ON_START=true`)  
- [ ] `/api/auth/login`, `/api/inventory/…`, `/api/bus/…` via same origin  

---

## Comparison snapshot

| | Docker Compose | Vercel + Supabase |
|--|----------------|-------------------|
| Best for | On-prem, LAN, full control, frequent bus jobs | Public HTTPS SaaS, low ops |
| Always-on processes | Yes | No (Functions + daily Cron) |
| File storage | Local volume | Supabase Storage |
| Config entry | `docker-compose.yml` + `.env` | `vercel.json` + Vercel env |

See [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) for the cloud path.
