# NHPAOWA Platform — Linux Installation Guide

Complete install guide for a **clean Linux machine** (Ubuntu/Debian-style) with nothing pre-installed. Covers software setup, database, app bootstrap, systemd services for the backend, and nginx for the frontend.

---

## Stack overview

| Component | Technology | Default port |
|-----------|------------|--------------|
| Identity API | Node.js + Express | `4000` |
| Inventory API | Node.js + Express + Prisma (`public`) | `4001` |
| School bus API | Node.js + Express + Prisma (`bus_tracking`) | `4002` |
| Web frontend | React + Vite (static build via nginx) | `80` |
| Database | PostgreSQL 17 or 18 | `5432` |

Minimum: **Node.js 20+**, **Git**, **PostgreSQL 17 or 18** (or Docker), **nginx**.

> **Prefer containers for everything?** Skip the native Node/Postgres/systemd/nginx steps and use [§15 Full stack with Docker only](#15-full-stack-with-docker-only-frontend--backend).

> Commands below assume Ubuntu / Debian. On RHEL/Fedora/CentOS, use `dnf`/`yum` equivalents and adjust package names.

---

## 1. Install required software

### 1.1 System packages

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg nginx
```

Verify:

```bash
git --version
nginx -v
```

### 1.2 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v    # expect v20.x or higher
npm -v
```

### 1.3 PostgreSQL **or** Docker

Pick **one** database approach.

#### Option A — Docker (recommended for simplest Postgres)

```bash
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and log back in (or reboot) so the `docker` group applies.

Verify:

```bash
docker --version
docker compose version
```

#### Option B — Native PostgreSQL 17 or 18

Default Ubuntu packages may not be 17/18. Prefer the official PostgreSQL APT repo, then install **17** or **18**:

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
# install one of:
sudo apt install -y postgresql-18 postgresql-contrib-18
# or: sudo apt install -y postgresql-17 postgresql-contrib-17

sudo systemctl enable --now postgresql
```

Verify:

```bash
sudo systemctl status postgresql
psql --version    # expect 17.x or 18.x
```

---

## 2. Get the application code

This guide uses `/opt/nhpaowa_app`.

```bash
sudo mkdir -p /opt/nhpaowa_app
sudo chown "$USER":"$USER" /opt/nhpaowa_app
git clone <YOUR_REPO_URL> /opt/nhpaowa_app
cd /opt/nhpaowa_app
```

Replace `<YOUR_REPO_URL>` with your Git remote URL.

If you already have the project as a zip/folder, copy it into `/opt/nhpaowa_app` instead of cloning.

---

## 3. Configure environment variables

```bash
cd /opt/nhpaowa_app
cp .env.example .env
nano .env
```

### Recommended `.env` when nginx proxies APIs (same-origin)

```env
NODE_ENV=production
ASSOCIATION_ID=00000000-0000-4000-8000-000000000001
JWT_SECRET=change-this-to-a-long-random-secret
AUTH_STRICT=true
DATABASE_URL=postgresql://nhpaowa:nhpaowa@localhost:5432/nhpaowa?schema=public
IDENTITY_PORT=4000
INVENTORY_PORT=4001
PO_APPROVAL_THRESHOLD=10000.00
VITE_API_BASE_URL=/api/inventory
VITE_IDENTITY_BASE_URL=/api/auth
```

### Alternative `.env` when browsers call API ports directly

```env
VITE_API_BASE_URL=http://YOUR_SERVER_IP:4001/api/inventory
VITE_IDENTITY_BASE_URL=http://YOUR_SERVER_IP:4000/api/auth
```

### Notes

- Prefer the **nginx proxy** URLs (`/api/inventory`, `/api/auth`) so you only expose port 80.
- Any change to `VITE_*` requires rebuilding the web app (step 5).
- `JWT_SECRET` must be unique and private in production.
- Keep `DATABASE_URL` aligned with how you create Postgres (next section).

---

## 4. Start / create the database

### 4.1 Option A — Docker Compose (from the repo)

Uses the repo image `postgres:18-alpine` (PostgreSQL 18). PostgreSQL 17 is also fine for native installs.

```bash
cd /opt/nhpaowa_app
npm run db:up
```

This starts container `nhpaowa-postgres` with:

| Setting | Value |
|---------|-------|
| User | `nhpaowa` |
| Password | `nhpaowa` |
| Database | `nhpaowa` |
| Port | `5432` |

Check:

```bash
docker ps
```

You should see `nhpaowa-postgres` running and healthy.

Stop later (optional):

```bash
npm run db:down
```

Ensure Docker starts on boot if you rely on it:

```bash
sudo systemctl enable docker
```

### 4.2 Option B — Native PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER nhpaowa WITH PASSWORD 'nhpaowa';"
sudo -u postgres psql -c "CREATE DATABASE nhpaowa OWNER nhpaowa;"
```

Optional: allow local password auth if needed (edit `pg_hba.conf`, then reload Postgres). Defaults on Ubuntu usually allow local socket access for the postgres user; the Node app connects via TCP with the password in `DATABASE_URL`.

If you use different credentials, update `DATABASE_URL` in `.env`.

---

## 5. Install dependencies, schema, seed, and build frontend

```bash
cd /opt/nhpaowa_app

# Install all workspace packages (web + services + shared)
npm install

# Create / sync database tables from Prisma schema
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma

# Load demo users and sample data
npm run db:seed

# Production build of the React web app → apps/web/dist
npm run build -w @nhpaowa/web
```

### Expected results

- `npm install` completes without fatal errors.
- `prisma db push` reports the schema is in sync.
- `db:seed` finishes successfully.
- Folder `/opt/nhpaowa_app/apps/web/dist` exists and contains `index.html`.

### Seeded logins (default)

| Email | Role |
|-------|------|
| `superadmin@nhpaowa.local` | Superadmin |
| `secretary@nhpaowa.local` | Secretary |
| `treasurer@nhpaowa.local` | Treasurer |
| `staff@nhpaowa.local` | Staff |
| `resident@nhpaowa.local` | Resident |
| `vendor@shree.local` | Vendor |

Password for all: `password123`

---

## 6. Quick manual test (before systemd / nginx)

```bash
cd /opt/nhpaowa_app

# terminal 1
npm run start -w @nhpaowa/identity-service

# terminal 2
npm run start -w @nhpaowa/inventory-service
```

Check health:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4001/health
```

Optional temporary frontend preview:

```bash
npx --yes serve -s apps/web/dist -l 5173
# open http://SERVER_IP:5173
```

When confirmed, stop those processes (`Ctrl+C`) and continue.

---

## 7. Run backend as systemd services

### 7.1 Ownership for the service user

The units below run as `www-data` (common with nginx). Adjust the user if preferred.

```bash
sudo chown -R www-data:www-data /opt/nhpaowa_app
```

Ensure `www-data` can read `.env` and execute under the tree. If you keep deploying as your own user, either:

- keep ownership on your user and set `User=` in the unit files to that user, **or**
- re-apply `chown` after each deploy.

### 7.2 Identity service unit

Create `/etc/systemd/system/nhpaowa-identity.service`:

```bash
sudo tee /etc/systemd/system/nhpaowa-identity.service > /dev/null <<'EOF'
[Unit]
Description=NHPAOWA Identity Service
After=network.target postgresql.service docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/nhpaowa_app
ExecStart=/usr/bin/node --env-file=/opt/nhpaowa_app/.env /opt/nhpaowa_app/services/identity-service/src/index.js
Restart=always
RestartSec=5
User=www-data
Group=www-data
Environment=NODE_ENV=production

# Hardening (optional)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```

### 7.3 Inventory service unit

Create `/etc/systemd/system/nhpaowa-inventory.service`:

```bash
sudo tee /etc/systemd/system/nhpaowa-inventory.service > /dev/null <<'EOF'
[Unit]
Description=NHPAOWA Inventory Service
After=network.target postgresql.service docker.service nhpaowa-identity.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/nhpaowa_app
ExecStart=/usr/bin/node --env-file=/opt/nhpaowa_app/.env /opt/nhpaowa_app/services/inventory-service/src/index.js
Restart=always
RestartSec=5
User=www-data
Group=www-data
Environment=NODE_ENV=production

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```

### 7.4 Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nhpaowa-identity nhpaowa-inventory
sudo systemctl status nhpaowa-identity --no-pager
sudo systemctl status nhpaowa-inventory --no-pager
```

### 7.5 Useful service commands

```bash
sudo systemctl restart nhpaowa-identity
sudo systemctl restart nhpaowa-inventory
sudo journalctl -u nhpaowa-identity -f
sudo journalctl -u nhpaowa-inventory -f
```

Re-check health:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4001/health
```

---

## 8. Run frontend via nginx (recommended service)

nginx is already a system service. Point it at the Vite build and optionally reverse-proxy the APIs.

### 8.1 Site config

Create `/etc/nginx/sites-available/nhpaowa`:

```bash
sudo tee /etc/nginx/sites-available/nhpaowa > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /opt/nhpaowa_app/apps/web/dist;
    index index.html;

    # SPA client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy identity API
    location /api/auth/ {
        proxy_pass http://127.0.0.1:4000/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy inventory API
    location /api/inventory/ {
        proxy_pass http://127.0.0.1:4001/api/inventory/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Flats, NOC, moves, notices, board, attendance (served by inventory-service)
    location /api/association/ {
        proxy_pass http://127.0.0.1:4001/api/association/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # School bus service
    location /api/bus/ {
        proxy_pass http://127.0.0.1:4002/api/bus/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Item photos, staff photos, NOC / move attachments
    location /uploads/ {
        proxy_pass http://127.0.0.1:4001/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
```

### 8.2 Enable site and reload nginx

```bash
sudo ln -sf /etc/nginx/sites-available/nhpaowa /etc/nginx/sites-enabled/nhpaowa

# disable default site if it conflicts
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

### 8.3 Confirm frontend env matches proxy

If you used relative URLs:

```env
VITE_API_BASE_URL=/api/inventory
VITE_IDENTITY_BASE_URL=/api/auth
```

Rebuild after any `VITE_*` change:

```bash
cd /opt/nhpaowa_app
npm run build -w @nhpaowa/web
sudo systemctl reload nginx
```

Open: `http://YOUR_SERVER_IP/`

---

## 9. Firewall

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
# Only if not using nginx proxy:
# sudo ufw allow 4000/tcp
# sudo ufw allow 4001/tcp
sudo ufw enable
sudo ufw status
```

---

## 10. Updating the application later

```bash
cd /opt/nhpaowa_app

# if owned by www-data, pull as a user with rights, then fix ownership
sudo -u www-data git -C /opt/nhpaowa_app pull
# or: git pull && sudo chown -R www-data:www-data /opt/nhpaowa_app

cd /opt/nhpaowa_app
sudo -u www-data npm install
sudo -u www-data npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
sudo -u www-data npm run build -w @nhpaowa/web

sudo systemctl restart nhpaowa-identity nhpaowa-inventory
sudo systemctl reload nginx
```

Only run `npm run db:seed` again if you intentionally want to re-seed demo data.

---

## 11. Development mode (not as services)

For day-to-day coding (hot reload):

```bash
cd /opt/nhpaowa_app
npm run db:up          # if using Docker
npm install

# three terminals
npm run dev:identity   # http://localhost:4000
npm run dev:inventory  # http://localhost:4001
npm run dev:web        # http://localhost:5173
```

### School bus service (optional)

```bash
npm run db:bus:push
npm run db:bus:seed
npm run dev:bus        # http://localhost:4002/health
```

Vite proxies `/api/bus` → `:4002`. **Security Staff** use **Bus gate** (+ **Bus reports** view); Secretary/admin use **Schools & buses** / **Bus batches**; residents use **Today’s buses**. Full detail: [`INSTALL-WINDOWS.md`](./INSTALL-WINDOWS.md) §15 and [`specs/027-school-bus-management/`](../specs/027-school-bus-management/).

---

## 12. Optional: HTTPS with Let's Encrypt

After DNS points to the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.example
sudo systemctl reload nginx
```

Update `server_name` in the nginx site to your domain before running certbot.

---

## 13. Post-install checklist

- [ ] `node -v` shows **v20+**
- [ ] Postgres is running (Docker container or `postgresql` systemd unit)
- [ ] `.env` exists and `DATABASE_URL` / `JWT_SECRET` / `VITE_*` are correct
- [ ] `npm install`, `prisma db push`, and `db:seed` succeeded
- [ ] `apps/web/dist` exists after build
- [ ] `systemctl is-enabled nhpaowa-identity` and `nhpaowa-inventory` are enabled
- [ ] http://127.0.0.1:4000/health responds
- [ ] http://127.0.0.1:4001/health responds
- [ ] http://YOUR_SERVER_IP/ loads the login page
- [ ] Login works with a seeded user
- [ ] Services survive reboot

---

## 14. Troubleshooting

| Problem | What to check |
|---------|----------------|
| Unit fails immediately | `sudo journalctl -u nhpaowa-identity -n 100 --no-pager` |
| Permission denied on `.env` or files | Ownership: `sudo chown -R www-data:www-data /opt/nhpaowa_app` |
| `DATABASE_URL` errors | Postgres up? Credentials match `.env`? `docker ps` or `systemctl status postgresql` |
| Web loads but API 502 | Backend units running? `curl` health endpoints; check nginx `error.log` |
| Blank routes / refresh 404 | nginx `try_files` SPA rule present? |
| Prisma engine errors | Re-run `npm install` and `npx prisma generate` on the server architecture |
| Port already in use | `sudo ss -tlnp \| grep -E '4000\|4001\|80'` |

nginx logs:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 15. Full stack with Docker only (frontend + backend)

Use this path when you want **everything in Docker**: PostgreSQL, identity API, inventory API, and the web UI. You do **not** need to install Node.js, native PostgreSQL, or host nginx for this option.

### 15.1 Install Docker (Linux)

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and log back in (or reboot) so the `docker` group applies.

Verify:

```bash
docker --version
docker compose version
```

**Optional (official Docker Engine packages):** follow https://docs.docker.com/engine/install/ if you prefer the Docker CE packages instead of distro `docker.io`.

### 15.2 Get the code

```bash
sudo mkdir -p /opt/nhpaowa_app
sudo chown "$USER":"$USER" /opt/nhpaowa_app
git clone <YOUR_REPO_URL> /opt/nhpaowa_app
cd /opt/nhpaowa_app
```

(Git is still required to clone. If you only have a zip, extract it to `/opt/nhpaowa_app`.)

### 15.3 Optional environment overrides

Compose already sets safe defaults for Docker networking. To customize secrets, create a `.env` file in the repo root (Compose reads it automatically):

```bash
cp .env.example .env
nano .env
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

### 15.4 Build and start the full stack

From the repo root:

```bash
cd /opt/nhpaowa_app
npm run docker:up
```

Equivalent Compose command (no Node/npm required on the host):

```bash
docker compose --profile full up -d --build
```

This starts:

| Container | Role | Host port |
|-----------|------|-----------|
| `nhpaowa-postgres` | PostgreSQL 18 | `5432` |
| `nhpaowa-migrate` | One-shot Prisma `db push` + optional seed | (exits when done) |
| `nhpaowa-identity` | Identity API | `4000` |
| `nhpaowa-inventory` | Inventory API | `4001` |
| `nhpaowa-web` | Frontend (nginx) | `8080` |

First build can take several minutes while images download and npm installs inside Docker.

### 15.5 Verify

```bash
docker compose --profile full ps
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4001/health
curl -I http://127.0.0.1:8080
```

Open the UI: **http://YOUR_SERVER_IP:8080**

Login (when seeded): `superadmin@nhpaowa.local` / `password123`

### 15.6 Useful Docker commands (Linux)

```bash
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

Enable Docker on boot (already done above with `systemctl enable docker`). Containers with `restart: unless-stopped` come back after reboot while Docker is running.

### 15.7 Firewall for LAN / public access

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
# Optional direct API access:
# sudo ufw allow 4000/tcp
# sudo ufw allow 4001/tcp
sudo ufw enable
sudo ufw status
```

### 15.8 Optional: bind web on port 80

In `docker-compose.yml`, under `web.ports`, change:

```yaml
ports:
  - "80:80"
```

Then rebuild/recreate:

```bash
docker compose --profile full up -d
```

Open **http://YOUR_SERVER_IP/** and allow port 80 in the firewall instead of 8080.

### 15.9 Docker-only checklist

- [ ] Docker engine is running (`systemctl status docker`)
- [ ] User is in the `docker` group (or commands use `sudo`)
- [ ] `docker compose --profile full up -d --build` completed
- [ ] `nhpaowa-identity` and `nhpaowa-inventory` show healthy / running
- [ ] http://YOUR_SERVER_IP:8080 loads login
- [ ] APIs respond on `:4000/health` and `:4001/health`
- [ ] Stack survives reboot

### 15.10 Docker troubleshooting

| Problem | What to check |
|---------|----------------|
| Permission denied talking to Docker | Log out/in after `usermod -aG docker`, or prefix with `sudo` |
| Build fails on `npm ci` | Retry `docker compose --profile full build --no-cache` from repo root |
| Migrate container exits non-zero | `docker logs nhpaowa-migrate` |
| Web UI but API errors | `docker logs nhpaowa-identity` / `nhpaowa-inventory`; confirm both are healthy |
| Port conflict on 8080 / 5432 / 4000 / 4001 | `sudo ss -tlnp \| grep -E '8080\|5432\|4000\|4001'` and free the port or remap in Compose |
| Old data after rebuild | Volumes persist; use `docker compose --profile full down -v` only if you intend to wipe data |

---

## Related

- Windows install guide: [`docs/INSTALL-WINDOWS.md`](./INSTALL-WINDOWS.md)
- Project overview: [`README.md`](../README.md)
- Env template: [`.env.example`](../.env.example)
