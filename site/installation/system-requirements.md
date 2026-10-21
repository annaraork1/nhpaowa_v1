# System Requirements

## Server

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| Memory | 2 GB | 4 GB |
| Disk | 5 GB (app + database) | 20 GB+ if storing photos and attachments |
| OS | Windows 10/11 or Server 2019+, Ubuntu 22.04+/Debian 12+, or any OS that runs Docker | — |

These figures are sized for one association (~1,700 flats, a few dozen staff, ~50 bus movements a day).

## Software

### Docker install

| Software | Version |
|----------|---------|
| Docker Engine or Docker Desktop | 24+ with Compose v2 (`docker compose`) |
| Git | Any recent version (to clone the repo) |

Docker images bundle Node.js, PostgreSQL 18, and nginx, so nothing else is needed.

### Native install

| Software | Version | Notes |
|----------|---------|-------|
| Node.js | **20 LTS or newer** | Services use `node --env-file`, which needs Node 20+ |
| npm | Bundled with Node | npm workspaces are used |
| PostgreSQL | **17 or 18** | One database, schemas `public` and `bus_tracking` |
| Git | Any recent version | |
| nginx (Linux) | Any recent version | Serves the web build and proxies the APIs |
| NSSM (Windows) | 2.24+ | Runs the Node services as Windows services |

## Network ports

| Port | Used by | Expose publicly? |
|------|---------|------------------|
| `80` / `443` | nginx (web + API reverse proxy) | Yes |
| `8080` | Web container (Docker install) | Yes, or put behind a proxy |
| `5173` | Vite dev server / static web server | LAN only |
| `4000` | Identity API | No — proxy through nginx |
| `4001` | Inventory + association API | No — proxy through nginx |
| `4002` | Bus API | No — proxy through nginx |
| `5432` | PostgreSQL | No |

## Clients

| Client | Support |
|--------|---------|
| Desktop browsers | Current Chrome, Edge, Firefox, Safari |
| Phones | Android Chrome and iOS Safari; installable as a PWA |
| PWA install | Requires HTTPS (or `localhost`) |
