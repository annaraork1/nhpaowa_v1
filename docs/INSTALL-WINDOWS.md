# NHPAOWA Platform — Windows Installation Guide

Complete install guide for a **clean Windows machine** with nothing pre-installed. Covers software setup, database, app bootstrap, and running the frontend and backend as Windows services.

---

## Stack overview


| Component     | Technology                  | Default port          |
| ------------- | --------------------------- | --------------------- |
| Identity API  | Node.js + Express           | `4000`                |
| Inventory API | Node.js + Express + Prisma  | `4001`                |
| Web frontend  | React + Vite (static build) | `5173` (or IIS/nginx) |
| Database      | PostgreSQL 17 or 18         | `5432`                |


Minimum: **Node.js 20+**, **Git**, **PostgreSQL 17 or 18** (or Docker Desktop).

> **Prefer containers for everything?** Skip the native Node/Postgres/NSSM steps and use [§13 Full stack with Docker only](#13-full-stack-with-docker-only-frontend--backend).

---

## 1. Install required software

### 1.1 Git

1. Download: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer.
3. Accept defaults (or choose “Git from the command line and also from 3rd-party software”).
4. Finish the installer.

Verify in **PowerShell**:

```powershell
git --version
```

### 1.2 Node.js 20 LTS

1. Download: [https://nodejs.org](https://nodejs.org) (choose **20.x LTS**).
2. Run the installer.
3. Ensure **“Add to PATH”** is checked.
4. Finish and **open a new PowerShell** window.

Verify:

```powershell
node -v    # expect v20.x or higher
npm -v
```

### 1.3 PostgreSQL **or** Docker Desktop

Pick **one** database approach.

#### Option A — Docker Desktop (recommended for simplest Postgres)

1. Download: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Install and reboot if prompted.
3. Start Docker Desktop and wait until it shows **Running**.
4. Verify:

```powershell
docker --version
docker compose version
```

#### Option B — Native PostgreSQL 17 or 18

1. Download: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Install PostgreSQL **17** or **18** (either is supported).
3. Remember the password you set for the `postgres` superuser.
4. Keep default port **5432**.
5. Optionally install **pgAdmin** for a GUI.

Verify (if `psql` is on PATH):

```powershell
psql --version
```

### 1.4 NSSM (Windows Service Manager)

Used to run Node processes as real Windows services that start on boot.

1. Download: [https://nssm.cc/download](https://nssm.cc/download)
2. Extract the zip (e.g. `C:\Tools\nssm`).
3. Use the matching binary:
  - 64-bit Windows → `win64\nssm.exe`
4. Optionally add that folder to PATH, or call `nssm.exe` with the full path.

Verify:

```powershell
C:\Tools\nssm\win64\nssm.exe version
```

---

## 2. Get the application code

Choose an install path. This guide uses `C:\apps\nhpaowa_app`.

```powershell
New-Item -ItemType Directory -Force -Path C:\apps
cd C:\apps
git clone <YOUR_REPO_URL> nhpaowa_app
cd C:\apps\nhpaowa_app
```

Replace `<YOUR_REPO_URL>` with your Git remote URL.

If you already have the project as a zip/folder, copy it to `C:\apps\nhpaowa_app` instead of cloning.

---

## 3. Configure environment variables

```powershell
cd C:\apps\nhpaowa_app
Copy-Item .env.example .env
notepad .env
```

### Recommended `.env` for local / server install

```env
NODE_ENV=production
ASSOCIATION_ID=00000000-0000-4000-8000-000000000001
JWT_SECRET=change-this-to-a-long-random-secret
AUTH_STRICT=true
DATABASE_URL=postgresql://nhpaowa:nhpaowa@localhost:5432/nhpaowa?schema=public
IDENTITY_PORT=4000
INVENTORY_PORT=4001
BUS_PORT=4002
PO_APPROVAL_THRESHOLD=10000.00
VITE_API_BASE_URL=http://localhost:4001/api/inventory
VITE_INVENTORY_BASE_URL=http://localhost:4001/api/inventory
VITE_ASSOCIATION_BASE_URL=http://localhost:4001/api/association
VITE_IDENTITY_BASE_URL=http://localhost:4000/api/auth
VITE_BUS_BASE_URL=http://localhost:4002/api/bus
```

### Notes

- If other PCs will open the UI, replace `localhost` in `VITE_*` with the server LAN IP or hostname (e.g. `http://192.168.1.50:4001/api/inventory`).
- Any change to `VITE_*` requires rebuilding the web app (step 5).
- `JWT_SECRET` must be unique and private in production.
- Keep `DATABASE_URL` aligned with how you create Postgres (next section).

---

## 4. Start / create the database

### 4.1 Option A — Docker Compose (from the repo)

Uses the repo image `postgres:18-alpine` (PostgreSQL 18). PostgreSQL 17 is also fine for native installs.

```powershell
cd C:\apps\nhpaowa_app
npm run db:up
```

This starts container `nhpaowa-postgres` with:


| Setting  | Value     |
| -------- | --------- |
| User     | `nhpaowa` |
| Password | `nhpaowa` |
| Database | `nhpaowa` |
| Port     | `5432`    |


Check:

```powershell
docker ps
```

You should see `nhpaowa-postgres` running and healthy.

Stop later (optional):

```powershell
npm run db:down
```

### 4.2 Option B — Native PostgreSQL

Open **SQL Shell (psql)** or pgAdmin and run as superuser:

```sql
CREATE USER nhpaowa WITH PASSWORD 'nhpaowa';
CREATE DATABASE nhpaowa OWNER nhpaowa;
```

If you use different credentials, update `DATABASE_URL` in `.env`.

---

## 5. Install dependencies, schema, seed, and build frontend

```powershell
cd C:\apps\nhpaowa_app

# Install all workspace packages (web + services + shared)
npm install

# Create / sync database tables from Prisma schema
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma

# Load demo users and sample data
npm run db:seed

# Production build of the React web app → apps\web\dist
npm run build -w @nhpaowa/web
```

### Expected results

- `npm install` completes without fatal errors.
- `prisma db push` reports the schema is in sync.
- `db:seed` finishes successfully.
- Folder `C:\apps\nhpaowa_app\apps\web\dist` exists and contains `index.html`.

### Seeded logins (default)


| Email                          | Role           |
| ------------------------------ | -------------- |
| `superadmin@nhpaowa.local`     | Superadmin     |
| `secretary@nhpaowa.local`      | Secretary      |
| `treasurer@nhpaowa.local`      | Treasurer      |
| `staff@nhpaowa.local`          | Staff          |
| `security.head@nhpaowa.local`  | Security Head  |
| `estate.manager@nhpaowa.local` | Estate Manager |
| `security.staff@nhpaowa.local` | Security Staff |
| `resident@nhpaowa.local`       | Resident       |
| `vendor@shree.local`           | Vendor         |


Password for all: `password123`

---

## 6. Quick manual test (before services)

Open **three** PowerShell windows from `C:\apps\nhpaowa_app`:

```powershell
npm run start -w @nhpaowa/identity-service
```

```powershell
npm run start -w @nhpaowa/inventory-service
```

```powershell
npx --yes serve -s apps/web/dist -l 5173
```

Then open:

- Identity health: [http://localhost:4000/health](http://localhost:4000/health)  
- Inventory health: [http://localhost:4001/health](http://localhost:4001/health)  
- Web UI: [http://localhost:5173](http://localhost:5173)

Sign in with `superadmin@nhpaowa.local` / `password123`.

When confirmed, stop those processes (`Ctrl+C`) and continue to install services.

---

## 7. Run backend and frontend as Windows services (NSSM)

### 7.1 Prepare folders and find Node

```powershell
New-Item -ItemType Directory -Force -Path C:\apps\nhpaowa_app\logs
where.exe node
```

Note the Node path (commonly `C:\Program Files\nodejs\node.exe`).

Also locate `serve` after global install:

```powershell
npm install -g serve
where.exe serve
```

### 7.2 Identity service

Run **PowerShell as Administrator**:

```powershell
$nssm = "C:\Tools\nssm\win64\nssm.exe"
$node = "C:\Program Files\nodejs\node.exe"
$app  = "C:\apps\nhpaowa_app"

& $nssm install nhpaowa-identity $node "--env-file=$app\.env $app\services\identity-service\src\index.js"
& $nssm set nhpaowa-identity AppDirectory $app
& $nssm set nhpaowa-identity AppStdout "$app\logs\identity.out.log"
& $nssm set nhpaowa-identity AppStderr "$app\logs\identity.err.log"
& $nssm set nhpaowa-identity AppRotateFiles 1
& $nssm set nhpaowa-identity Start SERVICE_AUTO_START
& $nssm start nhpaowa-identity
```

### 7.3 Inventory service

```powershell
$nssm = "C:\Tools\nssm\win64\nssm.exe"
$node = "C:\Program Files\nodejs\node.exe"
$app  = "C:\apps\nhpaowa_app"

& $nssm install nhpaowa-inventory $node "--env-file=$app\.env $app\services\inventory-service\src\index.js"
& $nssm set nhpaowa-inventory AppDirectory $app
& $nssm set nhpaowa-inventory AppStdout "$app\logs\inventory.out.log"
& $nssm set nhpaowa-inventory AppStderr "$app\logs\inventory.err.log"
& $nssm set nhpaowa-inventory AppRotateFiles 1
& $nssm set nhpaowa-inventory Start SERVICE_AUTO_START
& $nssm start nhpaowa-inventory
```

### 7.4 Web frontend service

```powershell
$nssm = "C:\Tools\nssm\win64\nssm.exe"
$app  = "C:\apps\nhpaowa_app"

# serve.cmd is installed with the global `serve` package
& $nssm install nhpaowa-web "C:\Program Files\nodejs\serve.cmd" "-s $app\apps\web\dist -l 5173"
& $nssm set nhpaowa-web AppDirectory $app
& $nssm set nhpaowa-web AppStdout "$app\logs\web.out.log"
& $nssm set nhpaowa-web AppStderr "$app\logs\web.err.log"
& $nssm set nhpaowa-web AppRotateFiles 1
& $nssm set nhpaowa-web Start SERVICE_AUTO_START
& $nssm start nhpaowa-web
```

If `serve.cmd` is not found, use the full path from `where.exe serve`.

### 7.5 Service management commands

```powershell
$nssm = "C:\Tools\nssm\win64\nssm.exe"

& $nssm status nhpaowa-identity
& $nssm status nhpaowa-inventory
& $nssm status nhpaowa-web

& $nssm restart nhpaowa-identity
& $nssm restart nhpaowa-inventory
& $nssm restart nhpaowa-web

& $nssm stop nhpaowa-web
```

You can also manage them in **services.msc** (`nhpaowa-identity`, `nhpaowa-inventory`, `nhpaowa-web`).

---

## 8. Firewall (optional but needed for LAN access)

Allow inbound ports if other machines must reach this server:

```powershell
New-NetFirewallRule -DisplayName "NHPAOWA Web 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "NHPAOWA Identity 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
New-NetFirewallRule -DisplayName "NHPAOWA Inventory 4001" -Direction Inbound -Protocol TCP -LocalPort 4001 -Action Allow
```

Update `VITE_*` URLs to the server IP, rebuild web, restart `nhpaowa-web`.

---

## 9. Updating the application later

```powershell
cd C:\apps\nhpaowa_app
git pull
npm install
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run build -w @nhpaowa/web

$nssm = "C:\Tools\nssm\win64\nssm.exe"
& $nssm restart nhpaowa-identity
& $nssm restart nhpaowa-inventory
& $nssm restart nhpaowa-web
```

Only run `npm run db:seed` again if you intentionally want to re-seed demo data.

---

## 10. Development mode (not as services)

For day-to-day coding on Windows (hot reload):

```powershell
cd C:\apps\nhpaowa_app
npm run db:up          # if using Docker
npm install

# three terminals
npm run dev:identity   # http://localhost:4000
npm run dev:inventory  # http://localhost:4001
npm run dev:web        # http://localhost:5173
```

---

## 11. Post-install checklist

- [ ] `node -v` shows **v20+**
- [ ] Postgres is running (Docker container or Windows service)
- [ ] `.env` exists and `DATABASE_URL` / `JWT_SECRET` / `VITE_*` are correct
- [ ] `npm install`, `prisma db push`, and `db:seed` succeeded
- [ ] `apps\web\dist` exists after build
- [ ] [http://localhost:4000/health](http://localhost:4000/health) responds
- [ ] [http://localhost:4001/health](http://localhost:4001/health) responds
- [ ] [http://localhost:5173](http://localhost:5173) loads the login page
- [ ] Login works with a seeded user
- [ ] Services are **Automatic** start and survive reboot

---

## 12. Troubleshooting


| Problem                       | What to check                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Service starts then stops     | Read `C:\apps\nhpaowa_app\logs\*.err.log`                                        |
| `DATABASE_URL` errors         | Postgres running? User/password/db name match `.env`?                            |
| Web loads but API fails       | Ports 4000/4001 listening? `VITE_*` URLs correct and rebuilt?                    |
| `serve` service fails         | Confirm path to `serve.cmd`; reinstall with `npm install -g serve`               |
| Prisma / native module issues | Re-run `npm install` and `npx prisma generate` from repo root                    |
| Port already in use           | `netstat -ano | findstr :4000` (or 4001 / 5173) and stop the conflicting process |


---

## 13. Full stack with Docker only (frontend + backend)

Use this path when you want **everything in Docker**: PostgreSQL, identity API, inventory API, and the web UI. You do **not** need to install Node.js or native PostgreSQL for this option.

### 13.1 Install Docker Desktop (Windows)

1. Download Docker Desktop: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Run the installer. Enable **WSL 2** when prompted (required on modern Windows).
3. Reboot if asked.
4. Start **Docker Desktop** and wait until the status is **Running**.
5. Open a **new** PowerShell window and verify:

```powershell
docker --version
docker compose version
```

### 13.2 Get the code

```powershell
New-Item -ItemType Directory -Force -Path C:\apps
cd C:\apps
git clone <YOUR_REPO_URL> nhpaowa_app
cd C:\apps\nhpaowa_app
```

(Git is still required to clone. If you only have a zip, extract it to `C:\apps\nhpaowa_app`.)

### 13.3 Optional environment overrides

Compose already sets safe defaults for Docker networking. To customize secrets, create a `.env` file in the repo root (Compose reads it automatically):

```powershell
Copy-Item .env.example .env
notepad .env
```

Useful overrides:

```env
JWT_SECRET=change-this-to-a-long-random-secret
AUTH_STRICT=true
SEED_ON_START=true
ASSOCIATION_ID=00000000-0000-4000-8000-000000000001
```

Notes:

- Inside containers, `DATABASE_URL` is set to `postgres:5432` automatically (do not point at `localhost` for the containers).
- The web image is built with same-origin API paths (`/api/inventory`, `/api/auth`) and nginx proxies them to the backend containers.
- Set `SEED_ON_START=false` on later startups if you do not want the migrate job to re-run seed logic (schema push still runs once per migrate container start).

### 13.4 Build and start the full stack

From the repo root:

```powershell
cd C:\apps\nhpaowa_app
npm run docker:up
```

Equivalent Compose command (no Node/npm required on the host):

```powershell
docker compose --profile full up -d --build
```

This starts:


| Container           | Role                                      | Host port         |
| ------------------- | ----------------------------------------- | ----------------- |
| `nhpaowa-postgres`  | PostgreSQL 18                             | `5432`            |
| `nhpaowa-migrate`   | One-shot Prisma `db push` + optional seed | (exits when done) |
| `nhpaowa-identity`  | Identity API                              | `4000`            |
| `nhpaowa-inventory` | Inventory API                             | `4001`            |
| `nhpaowa-web`       | Frontend (nginx)                          | `8080`            |


First build can take several minutes while images download and npm installs inside Docker.

### 13.5 Verify

```powershell
docker compose --profile full ps
curl http://localhost:4000/health
curl http://localhost:4001/health
```

Open the UI: **[http://localhost:8080](http://localhost:8080)**

Login (when seeded): `superadmin@nhpaowa.local` / `password123`

### 13.6 Useful Docker commands (Windows)

```powershell
# Follow logs
npm run docker:logs
# or
docker compose --profile full logs -f

# Restart after code changes (rebuild)
docker compose --profile full up -d --build

# Stop full stack (keeps database volume)
npm run docker:down
# or
docker compose --profile full down

# Stop and delete database + uploads volumes (destructive)
docker compose --profile full down -v
```

### 13.7 Firewall for LAN access

```powershell
New-NetFirewallRule -DisplayName "NHPAOWA Docker Web 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Other machines: `http://YOUR_WINDOWS_HOST_IP:8080`

### 13.8 Docker-only checklist

- [ ] Docker Desktop is running
- [ ] `docker compose --profile full up -d --build` completed
- [ ] `nhpaowa-identity` and `nhpaowa-inventory` show healthy / running
- [ ] [http://localhost:8080](http://localhost:8080) loads login
- [ ] APIs respond on `:4000/health` and `:4001/health`
- [ ] Containers restart after reboot (Docker Desktop set to start with Windows)

### 13.9 Docker troubleshooting


| Problem                                    | What to check                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Build fails on `npm ci`                    | Ensure you are in the repo root; retry after `docker compose --profile full build --no-cache` |
| Migrate container exits non-zero           | `docker logs nhpaowa-migrate`                                                                 |
| Web UI but API errors                      | `docker logs nhpaowa-identity` / `nhpaowa-inventory`; confirm both are healthy                |
| Port conflict on 8080 / 5432 / 4000 / 4001 | Stop the other process or change the left-hand port mapping in `docker-compose.yml`           |
| Port conflict on 4002 (bus)                | Stop the other process or set `BUS_PORT`                                                      |
| Old data after rebuild                     | Volumes persist; use `docker compose --profile full down -v` only if you intend to wipe data  |


---

## 14. Progressive Web App (install on phone)

The web app is a PWA: installable on Android/iOS with the same login session stored on the device.

### Install on Android (Chrome)

1. Open the site over **HTTPS** (production Netlify URL), or a trusted tunnel to local.
2. Tap the browser menu → **Install app** / **Add to Home screen**, or use the in-app **Install NHPAOWA** banner.
3. Open the home-screen icon and sign in with your association email.

### Install on iPhone / iPad (Safari)

1. Open the site in Safari.
2. Tap **Share** → **Add to Home Screen**.
3. Open the NHPAOWA icon and sign in.

### Local phone testing

```powershell
npm run dev:web
```

Vite binds to the LAN (`host: true`). On the same Wi‑Fi, open `http://<your-pc-ip>:5173` in the phone browser to use login. **Install** prompts usually need HTTPS — use a production deploy or `npm run build -w @nhpaowa/web` + HTTPS preview/tunnel for install testing.

Login uses relative `/api/auth` so the installed app talks to the same host as the UI (via Vite proxy locally, or Netlify redirects in production).

---

## 15. School bus management (`027`)

School bus gate logging is a **separate service** (`@nhpaowa/bus-service`) with its own Postgres schema `**bus_tracking`**. It must not share inventory’s Prisma `db push` against `public` — that would try to drop flats/inventory tables.

### 15.1 One-time schema + seed

With Postgres running and `.env` `DATABASE_URL` set:

```powershell
npm run db:bus:push
npm run db:bus:seed
```

Seed creates sample schools, buses, AM/PM batches, and staggered slots for demo.

### 15.2 Run locally (fourth service)

Keep identity (`:4000`), inventory (`:4001`), and web (`:5173`) running, then:

```powershell
npm run dev:bus
```


| Check      | URL / place                                                    |
| ---------- | -------------------------------------------------------------- |
| Health     | [http://localhost:4002/health](http://localhost:4002/health)   |
| API base   | [http://localhost:4002/api/bus](http://localhost:4002/api/bus) |
| Vite proxy | `/api/bus` → `:4002` (see `apps/web/vite.config.js`)           |


Optional env (also in `.env.example`):

```
BUS_PORT=4002
VITE_BUS_BASE_URL=/api/bus
```

### 15.3 Who uses what in the UI


| Role                                                    | Screens                                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security Staff**                                      | **Bus gate** (PICKUP: IN then children+OUT; DROP-OFF: children+IN then OUT); **Bus reports** (view / download only). No Schools & buses or Bus batches. |
| Security Head / Estate Manager / Secretary / Superadmin | Bus gate, **Schools & buses**, **Bus batches** (slot mapping), Bus reports                                                                              |
| Treasurer / Committee                                   | Bus reports (view); no gate punch / no registry by default                                                                                              |
| Resident                                                | **Today’s buses** only (schedule + status; no child counts or driver phones)                                                                            |


Permissions: resource `schoolBus` (gate + reports) vs `schoolBusAdmin` (registry + slots). Demo gate login: `security.staff@nhpaowa.local` / `password123` — **re-login** after RBAC deploy so menu/JWT refresh.

### 15.4 Features (v1)

- Registry of schools and recurring buses (vehicle registration, driver/conductor contacts)
- Schools & buses: CSV template, import, export, and registry PDF download
- Direction-specific batches with bay capacity (default 3) and staggered slots
- Append-only gate trips (mandatory PICKUP/DROP-OFF before IN; auto timestamps; **one child count** — PICKUP at OUT, DROP-OFF at IN)
- Live bay occupancy + “hold at approach” when full
- Alerts into the shared notification bell (long wait, off-slot, unmatched OUT, AM/PM mismatch, capacity)
- **On-screen daily report** (pick a date → all buses with pickup/drop-off child counts) plus CSV/PDF
- Committee CSV: reconciliation, wait times, congestion

Out of scope for v1: GPS, per-child RFID, driver app (see `specs/027-school-bus-management/`).

### 15.5 Docker / full profile

`docker compose --profile full` migrate step pushes both inventory and bus schemas and seeds both when `SEED_ON_START=true`. The `bus` container listens on **4002**.

### 15.6 Troubleshooting


| Problem                                           | What to check                                                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma db push` on bus wants to drop flats/items | You pointed bus Prisma at the whole `public` schema. Use only `schemas = ["bus_tracking"]` (current `services/bus-service/prisma/schema.prisma`) and `npm run db:bus:push`. |
| `Forbidden: view schoolBus` for Security Staff    | Log out and log in again so the JWT picks up the `schoolBus` menu feature.                                                                                                  |
| Gate / reports 404 from the web app               | Confirm `npm run dev:bus` is up and Vite proxy includes `/api/bus` → `4002`.                                                                                                |
| Port 4002 in use                                  | Stop the other process or set `BUS_PORT`.                                                                                                                                   |


---

## 16. Flat data collection drive (`028`) — ~1705 units without web login

Residents who will not create accounts can still submit **P1** (occupancy + contacts) via a **login-free** form using their **tower number** (e.g. `21031` / `T21031`).

### 16.1 P0 seed (do this first)

1. Flats → **CSV template** (or see `015-flat-household-csv`).
2. Fill **tower + flat** rows from builder/society Excel (phones optional for the public form).
3. **Import CSV** so every unit exists in the register.
4. Optional paper sheets: `[docs/forms/flat-household-paper-form.md](./forms/flat-household-paper-form.md)`.

### 16.2 Resident form & all 5 channels


| #   | Channel                      | Where                                                                                               |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Login-free tower-number form | `/flat-update` (also on **login screen**)                                                           |
| 2   | WhatsApp / notice share      | `/flat-update/share` — copy link + WhatsApp share (no Business API)                                 |
| 3   | Paper + captains             | `/flat-update/paper` — multi-flat A4 (4/6/8/10/12 cards or 12+ table); office imports via Flats CSV |
| 4   | Clubhouse kiosk              | `/flat-update?kiosk=1` — large UI                                                                   |
| 5   | Staff CSV / approve          | Sign in → **Flat owners** (CSV) + **Flat self-updates**                                             |


- Prefill: `/flat-update?flat=21031` (or `?towerNumber=T21031`).
- Flow: enter **tower number** → fill occupancy/contacts → submit → **PENDING** (staff approve).
- Staff: **Flat self-updates** → Approve / Reject. Approve sets `collectionPhase=P1_VERIFIED`.
- **Per-flat links CSV** for notice boards (from Flat self-updates).

### 16.3 Schema

After pull: `npx prisma db push --schema=services/inventory-service/prisma/schema.prisma` (adds `collection_phase`, `flat_update_sessions`, `flat_self_updates`).

---

## Related

- Linux install guide: `[docs/INSTALL-LINUX.md](./INSTALL-LINUX.md)`
- Project overview: `[README.md](../README.md)`
- Env template: `[.env.example](../.env.example)`

