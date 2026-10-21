# Install on Windows

A native install on a clean Windows 10/11 or Windows Server machine: Node.js and PostgreSQL on the host, with the three APIs and the web app running as Windows services through NSSM.

::: tip Prefer containers?
[Run with Docker](/installation/docker) needs only Docker Desktop and one command.
:::

The steps below use `C:\apps\nhpaowa_app` as the install folder.

## 1. Install software

| Software | Download | Notes |
|----------|----------|-------|
| Git | [git-scm.com/download/win](https://git-scm.com/download/win) | Defaults are fine |
| Node.js 20 LTS+ | [nodejs.org](https://nodejs.org) | Keep **Add to PATH** checked |
| PostgreSQL 17 or 18 | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) | Note the `postgres` password; keep port `5432` |
| NSSM | [nssm.cc/download](https://nssm.cc/download) | Extract to `C:\Tools\nssm` |

Open a **new** PowerShell window and verify:

```powershell
git --version
node -v        # v20.x or newer
npm -v
C:\Tools\nssm\win64\nssm.exe version
```

## 2. Create the database

Open **SQL Shell (psql)** or pgAdmin as the `postgres` superuser:

```sql
CREATE USER nhpaowa WITH PASSWORD 'nhpaowa';
CREATE DATABASE nhpaowa OWNER nhpaowa;
\c nhpaowa
CREATE SCHEMA IF NOT EXISTS bus_tracking AUTHORIZATION nhpaowa;
```

Use a stronger password in production and update `DATABASE_URL` to match.

## 3. Get the code and configure

```powershell
New-Item -ItemType Directory -Force -Path C:\apps | Out-Null
cd C:\apps
git clone <YOUR_REPO_URL> nhpaowa_app
cd C:\apps\nhpaowa_app
Copy-Item .env.example .env
notepad .env
```

Recommended `.env` for a Windows server (replace `localhost` with the server's LAN IP or hostname if other PCs will use it):

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

`VITE_*` values are baked into the web build — rebuild the web app whenever you change them. All variables are described in [Configuration](/administration/configuration).

## 4. Install, migrate, seed, build

```powershell
cd C:\apps\nhpaowa_app
npm install

# Inventory + association schema (public)
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run db:seed

# School bus schema (bus_tracking)
npm run db:bus:push
npx prisma generate --schema=services/bus-service/prisma/schema.prisma
npm run db:bus:seed

# Production web build -> apps\web\dist
npm run build -w @nhpaowa/web
```

::: warning
Only run the seed commands on a fresh database. They load demo users (password `password123`) and sample data.
:::

## 5. Quick manual test

Run each in its own PowerShell window from `C:\apps\nhpaowa_app`:

```powershell
npm run start -w @nhpaowa/identity-service    # :4000
npm run start -w @nhpaowa/inventory-service   # :4001
npm run start -w @nhpaowa/bus-service         # :4002
npx --yes serve -s apps/web/dist -l 5173      # web
```

Check http://localhost:4000/health, http://localhost:4001/health, http://localhost:4002/health, then open http://localhost:5173. Stop everything with `Ctrl+C` before installing services.

## 6. Install Windows services (NSSM)

Run **PowerShell as Administrator**:

```powershell
$nssm = "C:\Tools\nssm\win64\nssm.exe"
$node = (Get-Command node).Source
$app  = "C:\apps\nhpaowa_app"
New-Item -ItemType Directory -Force -Path "$app\logs" | Out-Null

$services = @{
  "nhpaowa-identity"  = "services\identity-service\src\index.js"
  "nhpaowa-inventory" = "services\inventory-service\src\index.js"
  "nhpaowa-bus"       = "services\bus-service\src\index.js"
}

foreach ($name in $services.Keys) {
  & $nssm install $name $node "--env-file=$app\.env $app\$($services[$name])"
  & $nssm set $name AppDirectory $app
  & $nssm set $name AppStdout "$app\logs\$name.out.log"
  & $nssm set $name AppStderr "$app\logs\$name.err.log"
  & $nssm set $name AppRotateFiles 1
  & $nssm set $name Start SERVICE_AUTO_START
  & $nssm start $name
}

# Web app (static build)
npm install -g serve
$serve = (Get-Command serve.cmd).Source
& $nssm install nhpaowa-web $serve "-s $app\apps\web\dist -l 5173"
& $nssm set nhpaowa-web AppDirectory $app
& $nssm set nhpaowa-web AppStdout "$app\logs\nhpaowa-web.out.log"
& $nssm set nhpaowa-web AppStderr "$app\logs\nhpaowa-web.err.log"
& $nssm set nhpaowa-web Start SERVICE_AUTO_START
& $nssm start nhpaowa-web
```

Manage them in **services.msc** or with NSSM:

```powershell
& $nssm status  nhpaowa-inventory
& $nssm restart nhpaowa-bus
& $nssm stop    nhpaowa-web
```

## 7. Firewall

Allow the web port (and the API ports, because the browser calls them directly in this setup):

```powershell
foreach ($p in 5173, 4000, 4001, 4002) {
  New-NetFirewallRule -DisplayName "NHPAOWA $p" -Direction Inbound -Protocol TCP -LocalPort $p -Action Allow
}
```

To expose only one port and add HTTPS, put IIS or nginx in front — see [Reverse Proxy](/installation/reverse-proxy).

## 8. Updating

```powershell
cd C:\apps\nhpaowa_app
git pull
npm install
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run db:bus:push
npx prisma generate --schema=services/bus-service/prisma/schema.prisma
npm run build -w @nhpaowa/web
foreach ($s in "nhpaowa-identity","nhpaowa-inventory","nhpaowa-bus","nhpaowa-web") { & $nssm restart $s }
```

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| Service starts then stops | `C:\apps\nhpaowa_app\logs\*.err.log` |
| `'docker' is not recognized` when running `npm run db:up` | That script needs Docker. With native PostgreSQL, skip it |
| Login works but flats / NOC / bus screens fail | `VITE_ASSOCIATION_BASE_URL` and `VITE_BUS_BASE_URL` set? Web rebuilt after changing them? |
| Port already in use | `Get-NetTCPConnection -LocalPort 4001` then stop that process |

More in [Troubleshooting](/administration/troubleshooting).
