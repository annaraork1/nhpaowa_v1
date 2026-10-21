# FAQ

## General

### What is the NHPAOWA Platform?

A self-hosted web application for the New Haven Peenya Apartment Owners Welfare Association. It handles the flat owners register, NOCs, moves, notices, staff attendance, the school bus gate, and the association's inventory and purchasing. See the [Feature List](/help/features).

### Can another apartment association use it?

Yes. The campus register (towers and flats) is seeded from `packages/shared-ui/src/towerCatalog.js` and `apartmentCatalog.js`. Change those for your layout before seeding, and update the board and letterhead in the app.

### Does it need the internet?

Only to install packages. It runs entirely on your own server and can be used on a local network. Installing it as a phone app (PWA) requires HTTPS.

## Installation

### Which PostgreSQL version do I need?

PostgreSQL **17 or 18**. Docker installs use `postgres:18-alpine`. See [System Requirements](/installation/system-requirements).

### Docker or native install?

[Docker](/installation/docker) is the quickest and keeps everything in containers. Choose [Windows](/installation/windows) or [Linux](/installation/linux) native installs if Docker isn't allowed on your server or you already run PostgreSQL.

### I can't sign in after installing

Check that the identity service is running (`http://localhost:4000/health`) and that the database was seeded. Demo accounts use the password `password123`. See [Troubleshooting](/administration/troubleshooting).

### Screens say "You do not have permission"

The signed-in role doesn't have that module. Check the [permission matrix](/administration/roles). For Staff, Security Head, Estate Manager, and Security Staff, the Superadmin may have switched the module off under **Users → Role menu features**; sign out and back in after changes.

### The bus screens are empty or fail to load

The bus service is separate (port 4002) and uses its own schema. Make sure it's running and you've run `npm run db:bus:push` and `npm run db:bus:seed`, and that your proxy forwards `/api/bus/` to it.

## Security

### Is it safe to expose to the internet?

Yes, with the [production checklist](/administration/configuration#production-checklist): set `AUTH_STRICT=true`, a long random `JWT_SECRET`, HTTPS through a [reverse proxy](/installation/reverse-proxy), strong passwords, remove the demo accounts, and keep PostgreSQL off the public network.

### What does `AUTH_STRICT=false` do?

It lets requests without a token act as a development user (Secretary by default). It's only for local development.

### How long does a sign-in last?

Seven days. After that, users are asked to sign in again.

## Usage

### Can residents see other flats?

No. Residents see only flats where they're a member, and the API enforces the same rule.

### Why can't a staff member check out right after checking in?

Check-out is blocked for 30 seconds after check-in so a double tap doesn't close the shift. Each person can check in and out once per day.

### Why is my purchase order waiting for approval?

Its total is above the approval threshold (default ₹10,000, set in **Settings**). A Secretary, Treasurer, or Superadmin must approve it. For urgent work, raise it as an emergency PO.

### Can I correct a stock movement or bus gate entry?

Entries aren't edited, so the history stays trustworthy. Record an adjusting stock transaction, or a correction entry at the bus gate.

### How do I back up the data?

Back up the PostgreSQL database with `pg_dump` (it holds both schemas) and the `uploads` folder (photos and attachments). See [Docker → Backups](/installation/docker#backups).
