# Introduction

NHPAOWA Platform is the association-owned management system for **New Haven Peenya Apartment Owners Welfare Association** (TATA New Haven, Bengaluru). It replaces paper registers and spreadsheets with one role-permissioned web app for the office, the security gate, the facility team, residents, and vendors.

It covers:

- **Residents and flats** — the full campus register (1,705 flats across 31 towers), owners, tenants, family, vehicles, pets, parking, and a login-free self-update drive.
- **Society paperwork** — NOC certificates, move-in/move-out handovers, and resident notices, all printed on the association letterhead.
- **Operations** — staff attendance with photos and leave, and the school bus gate register.
- **Facility inventory** — items, stock, warehouses, barcodes, purchase orders with approvals, requisitions, AMC contracts, and reports.

The web app works on desktop and phones, supports light and dark themes, and can be installed as a PWA. See the full [feature list](/help/features).

<img class="screenshot" src="/screenshots/home.png" alt="Operations home" />

## Architecture

| Component | Technology | Default port |
|-----------|------------|--------------|
| Web app | React 18 + Vite + Tailwind (installable PWA) | `5173` (dev) |
| Identity service | Node.js + Express — login, JWT, users, role menu features | `4000` |
| Inventory service | Node.js + Express + Prisma — inventory **and** association APIs (flats, NOC, moves, notices, board, attendance) | `4001` |
| Bus service | Node.js + Express + Prisma — school bus gate (`bus_tracking` schema) | `4002` |
| Database | PostgreSQL 17 or 18 | `5432` |

All services share one PostgreSQL database. The bus service uses its own `bus_tracking` schema; everything else uses `public`.

## Quick start with Docker

If Docker is installed, one command builds and starts everything (database, three APIs, and the web app):

```bash
git clone <YOUR_REPO_URL> nhpaowa_app
cd nhpaowa_app
docker compose --profile full up -d --build
```

Open **http://localhost:8080** and sign in with `superadmin@nhpaowa.local` / `password123`.

::: warning
The seeded demo accounts all use `password123`, and the default `JWT_SECRET` is public. Change both before exposing the app beyond your machine. See [Configuration](/administration/configuration).
:::

## Choose an install path

| Path | Best for |
|------|----------|
| [Run with Docker](/installation/docker) | Fastest setup on any OS; nothing else to install |
| [Install on Windows](/installation/windows) | Native Windows server with services managed by NSSM |
| [Install on Linux](/installation/linux) | Native Linux server with systemd + nginx |
| [Run from Source](/installation/from-source) | Day-to-day development with hot reload |

Check the [system requirements](/installation/system-requirements) first.

## Demo accounts

After seeding, these accounts exist (password `password123` for all):

| Email | Role |
|-------|------|
| `superadmin@nhpaowa.local` | Superadmin |
| `secretary@nhpaowa.local` | Secretary |
| `treasurer@nhpaowa.local` | Treasurer |
| `staff@nhpaowa.local` | Staff |
| `security.head@nhpaowa.local` | Security Head |
| `estate.manager@nhpaowa.local` | Estate Manager |
| `security.staff@nhpaowa.local` | Security Staff |
| `resident@nhpaowa.local` | Resident (Tower 1 / 101) |
| `vendor@shree.local` | Vendor |

What each role can do is listed in [Roles & Permissions](/administration/roles).
