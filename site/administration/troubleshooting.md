# Troubleshooting

## Check what is running

::: code-group

```powershell [Windows]
netstat -ano | findstr "LISTENING" | findstr ":4000 :4001 :4002 :5173 :5432"
```

```bash [Linux]
sudo ss -tlnp | grep -E ':(4000|4001|4002|5173|5432|80)\b'
```

:::

Health endpoints:

| Service | URL |
|---------|-----|
| Identity | http://localhost:4000/health |
| Inventory | http://localhost:4001/health |
| Bus | http://localhost:4002/health |

`/health` on the inventory and bus services also reports whether `AUTH_STRICT` is on.

## Common problems

### Sign-in

| Symptom | Cause and fix |
|---------|---------------|
| "Invalid credentials" for demo users | Database not seeded — run `npm run db:seed` |
| Login page spins or shows a network error | Identity service (`:4000`) is down, or `VITE_IDENTITY_BASE_URL` points at the wrong host |
| Everyone is signed out after a deploy | `JWT_SECRET` changed. Sign in again |
| A user still sees an old menu after a role change | Menu features are stored in the login token. Sign out and sign in again |
| `Forbidden: view schoolBus` for Security Staff | Same cause — sign out and sign in again |

### Screens and data

| Symptom | Cause and fix |
|---------|---------------|
| Inventory works but Flats, NOC, Moves, or Attendance fail | `/api/association` isn't routed. Behind a proxy, add the `/api/association/` location; with a static server, set `VITE_ASSOCIATION_BASE_URL` and rebuild |
| Bus screens fail or return 404 | Bus service (`:4002`) not running, or `/api/bus` isn't proxied / `VITE_BUS_BASE_URL` not set |
| Public flat-update form fails on a static server | Set `VITE_INVENTORY_BASE_URL` to the absolute inventory URL and rebuild |
| Photos or attachments don't load | `/uploads/` isn't proxied to the inventory service, or `VITE_UPLOAD_ORIGIN` is wrong |
| Page refresh returns 404 | The web server needs an SPA fallback to `index.html` (`try_files $uri /index.html` in nginx, `serve -s`) |

### Database

| Symptom | Cause and fix |
|---------|---------------|
| `Can't reach database server` | PostgreSQL is stopped, or `DATABASE_URL` host/port/password is wrong |
| `npm run db:up` → `'docker' is not recognized` | That script needs Docker. With a native PostgreSQL install, skip it |
| Bus `db push` offers to drop flats or items tables | The bus Prisma schema must only use `schemas = ["bus_tracking"]`. Use `npm run db:bus:push`, never a custom push against `public` |
| `permission denied for schema bus_tracking` | Create the schema owned by the app user: `CREATE SCHEMA IF NOT EXISTS bus_tracking AUTHORIZATION nhpaowa;` |
| `db push` warns about data loss | A column was removed or renamed. Back up, read the prompt, and only then use `--accept-data-loss` |

### Ports

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE` on 4000/4001/4002/5173 | Another copy is already running. Stop it, or change `IDENTITY_PORT` / `INVENTORY_PORT` / `BUS_PORT` |

Stop whatever is on the app ports (Windows):

```powershell
4000,4001,4002,5173 | ForEach-Object {
  Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
}
```

### Docker

| Symptom | Fix |
|---------|-----|
| `nhpaowa-migrate` exited with an error | `docker logs nhpaowa-migrate` |
| `nhpaowa-bus` keeps restarting | `docker logs nhpaowa-bus`; rebuild with `docker compose --profile full build --no-cache` |
| Old demo data reappears | Volumes persist. `docker compose --profile full down -v` wipes them (destructive) |

## Logs

| Install | Where |
|---------|-------|
| Dev | The terminal running each `npm run dev:*` |
| Windows services | `C:\apps\nhpaowa_app\logs\*.log` |
| Linux systemd | `journalctl -u nhpaowa-inventory -f` (likewise `-identity`, `-bus`) |
| Docker | `docker compose --profile full logs -f` |
| nginx | `/var/log/nginx/error.log` |
