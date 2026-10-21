# Supabase database (for Vercel)

Use Supabase as the managed Postgres for **`HOSTING_MODE=vercel-spa`** (APIs on a VPS pointing at Supabase) or **`vercel-fullstack`** (APIs on Vercel).

NHPAOWA uses **its own JWT auth** (`JWT_SECRET`). You do **not** need Supabase Auth for the app. Do **not** create an `auth` schema — Supabase already uses that name.

## Your checklist (do this in the dashboard)

### 1. Create the project

1. Go to [https://supabase.com](https://supabase.com) → **New project**.
2. Pick org, name (e.g. `nhpaowa`), database password (save it), region close to users.
3. Wait until the project is **Healthy**.

### 2. Create the bus schema

1. Dashboard → **SQL** → **New query**.
2. Paste and run the contents of `scripts/supabase-init.sql` from this repo (creates `bus_tracking` only).
3. Confirm success (no errors).

### 3. Copy connection strings

Dashboard → **Project Settings** → **Database** → **Connection string**.

You need **two** URIs:

| Env var | Which string | Port / mode |
|---------|----------------|-------------|
| `DATABASE_URL` | **Transaction** pooler (Prisma + serverless) | usually **6543**, add `?pgbouncer=true&connection_limit=1` |
| `DATABASE_URL_UNPOOLED` | **Direct** or **Session** pooler | **5432** — used by `prisma db push` / migrate |

Examples (replace ref, region, password):

```env
# Pooled — app runtime (Vercel Functions / long-running Node)
DATABASE_URL=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Direct — migrations / db push from your laptop or CI
DATABASE_URL_UNPOOLED=postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
```

If the UI shows URI mode vs SQL parameters, prefer the **URI** tab. URL-encode special characters in the password.

Optional query params: `&sslmode=require` if your client requires it (Supabase usually expects SSL).

### 4. (Optional) Storage bucket for uploads on Vercel

Needed when APIs run on Vercel (ephemeral disk). Skip if APIs stay on Docker/VPS with a volume.

1. Dashboard → **Storage** → **New bucket**.
2. Name: `uploads` (must match env below).
3. For a private association app, keep it **private** and serve via the API; for a quick trial you can make it public.
4. Copy **Project URL** and **service_role** key (Settings → API). Never expose `service_role` in the Vite/`VITE_*` frontend.

```env
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=uploads
```

### 5. Point this repo at Supabase (local machine)

In root `.env` (do not commit):

```env
HOSTING_MODE=vercel-fullstack
DATABASE_URL=...pooler...6543...?pgbouncer=true&connection_limit=1
DATABASE_URL_UNPOOLED=...db.YOUR_REF.supabase.co:5432/postgres
# plus JWT_SECRET, AUTH_STRICT=true, ASSOCIATION_ID, SUPABASE_* if using Storage
```

Then from the repo root:

```bash
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run db:seed
npm run db:bus:push
npm run db:bus:seed
```

Use **`DATABASE_URL_UNPOOLED`** for push/migrate (Prisma reads `directUrl`). If push fails with pooler errors, confirm `DATABASE_URL_UNPOOLED` is the **direct** host `db.…supabase.co`, not the transaction pooler.

### 6. Vercel project env (when deploying)

Set the same `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `AUTH_STRICT=true`, `ASSOCIATION_ID`, and Storage vars on the Vercel project. Build will run `prisma generate` + web build.

### 7. Send back (so we can verify)

When ready, tell the agent (no passwords in chat if avoidable):

- Project ref (subdomain), region
- Whether `bus_tracking` SQL succeeded
- Whether `prisma db push` for inventory + bus succeeded locally
- Whether you created the `uploads` Storage bucket

## What we do not use from Supabase (yet)

- Supabase Auth / RLS policies for app tables (app uses JWT + `AUTH_STRICT`)
- Supabase Edge Functions (APIs stay Express on Vercel or Docker)

You can still enable RLS later; until then, only the service role / server `DATABASE_URL` should touch data.
