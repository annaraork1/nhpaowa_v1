# Run with Docker

The Docker setup runs the entire platform — PostgreSQL, the identity, inventory, and bus APIs, and the web app behind nginx — with no Node.js or PostgreSQL installed on the host.

## Containers

| Container | Role | Host port |
|-----------|------|-----------|
| `nhpaowa-postgres` | PostgreSQL 18 | `5432` |
| `nhpaowa-migrate` | One-shot job: applies inventory and bus schemas, optionally seeds demo data, then exits | — |
| `nhpaowa-identity` | Identity API | `4000` |
| `nhpaowa-inventory` | Inventory + association API | `4001` |
| `nhpaowa-bus` | School bus API | `4002` |
| `nhpaowa-web` | Web app (nginx) — proxies `/api/*` and `/uploads/*` to the APIs | `8080` |

Data lives in two named volumes: `nhpaowa_pgdata` (database) and `nhpaowa_uploads` (photos and attachments).

## 1. Install Docker

::: code-group

```powershell [Windows]
# 1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
#    Enable WSL 2 when prompted, reboot if asked, then start Docker Desktop.
# 2. Verify in a new PowerShell window:
docker --version
docker compose version
```

```bash [Ubuntu / Debian]
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # log out and back in afterwards
docker --version
docker compose version
```

:::

## 2. Get the code

::: code-group

```powershell [Windows]
New-Item -ItemType Directory -Force -Path C:\apps | Out-Null
cd C:\apps
git clone <YOUR_REPO_URL> nhpaowa_app
cd nhpaowa_app
```

```bash [Linux]
sudo mkdir -p /opt/nhpaowa_app && sudo chown "$USER":"$USER" /opt/nhpaowa_app
git clone <YOUR_REPO_URL> /opt/nhpaowa_app
cd /opt/nhpaowa_app
```

:::

## 3. Set secrets (recommended)

Compose reads a `.env` file in the repo root. Create one and override the defaults:

```env
JWT_SECRET=change-this-to-a-long-random-secret
AUTH_STRICT=true
SEED_ON_START=true
ASSOCIATION_ID=00000000-0000-4000-8000-000000000001
```

- `DATABASE_URL` is set inside Compose to point at the `postgres` container; you don't need to set it.
- `SEED_ON_START=true` loads demo users, flats, inventory, and bus data. Set it to `false` once you have real data.

## 4. Build and start

```bash
docker compose --profile full up -d --build
```

Or, if Node.js is installed on the host: `npm run docker:up`.

The first build takes a few minutes. Startup order is enforced: Postgres becomes healthy, the migrate job finishes, the three APIs become healthy, then the web container starts.

## 5. Verify

```bash
docker compose --profile full ps
curl http://localhost:4000/health
curl http://localhost:4001/health
curl http://localhost:4002/health
```

Open **http://localhost:8080** (or `http://<server-ip>:8080` from another machine) and sign in with `superadmin@nhpaowa.local` / `password123`.

## Day-to-day commands

```bash
# Follow logs
docker compose --profile full logs -f

# Rebuild after pulling new code
git pull
docker compose --profile full up -d --build

# Stop (keeps data)
docker compose --profile full down

# Stop and DELETE all data (database + uploads)
docker compose --profile full down -v
```

Only the database, without the app containers (useful with [Run from Source](/installation/from-source)):

```bash
npm run db:up      # docker compose up -d postgres
```

## Serve on port 80

Change the web port mapping in `docker-compose.yml`:

```yaml
  web:
    ports:
      - "80:80"
```

Then `docker compose --profile full up -d`. For HTTPS, put a reverse proxy in front — see [Reverse Proxy](/installation/reverse-proxy).

## Backups

```bash
# Database dump
docker exec nhpaowa-postgres pg_dump -U nhpaowa -d nhpaowa -Fc > nhpaowa-$(date +%F).dump

# Restore into a running container
docker exec -i nhpaowa-postgres pg_restore -U nhpaowa -d nhpaowa --clean < nhpaowa-2026-10-05.dump
```

Back up the `nhpaowa_uploads` volume as well if you store item photos, staff photos, or attachments.

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| `nhpaowa-migrate` exits with an error | `docker logs nhpaowa-migrate` |
| Web loads but a screen shows errors | `docker logs nhpaowa-inventory` / `nhpaowa-bus` / `nhpaowa-identity` |
| Port already in use | Change the left side of the port mapping in `docker-compose.yml` |
| Build fails during `npm ci` | `docker compose --profile full build --no-cache` |
| Old data after rebuild | Volumes persist by design; `down -v` wipes them |
