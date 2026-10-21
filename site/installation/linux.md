# Install on Linux

A native install on Ubuntu 22.04+ / Debian 12+: Node.js and PostgreSQL on the host, the three APIs as systemd services, and nginx serving the web app and proxying the APIs on one port.

::: tip Prefer containers?
[Run with Docker](/installation/docker) needs only Docker and one command.
:::

The steps below use `/opt/nhpaowa_app` as the install folder.

## 1. Install software

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg nginx

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 18 (or 17) from the official PGDG repository
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-18      # or postgresql-17
sudo systemctl enable --now postgresql
```

Verify:

```bash
node -v      # v20.x or newer
psql --version
nginx -v
```

## 2. Create the database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER nhpaowa WITH PASSWORD 'nhpaowa';
CREATE DATABASE nhpaowa OWNER nhpaowa;
\c nhpaowa
CREATE SCHEMA IF NOT EXISTS bus_tracking AUTHORIZATION nhpaowa;
SQL
```

Use a stronger password in production and update `DATABASE_URL` to match.

## 3. Get the code and configure

```bash
sudo mkdir -p /opt/nhpaowa_app && sudo chown "$USER":"$USER" /opt/nhpaowa_app
git clone <YOUR_REPO_URL> /opt/nhpaowa_app
cd /opt/nhpaowa_app
cp .env.example .env
nano .env
```

Because nginx proxies every API on the same origin, the web build uses relative URLs:

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
VITE_API_BASE_URL=/api/inventory
VITE_IDENTITY_BASE_URL=/api/auth
VITE_BUS_BASE_URL=/api/bus
```

All variables are described in [Configuration](/administration/configuration).

## 4. Install, migrate, seed, build

```bash
cd /opt/nhpaowa_app
npm install

# Inventory + association schema (public)
npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
npm run db:seed

# School bus schema (bus_tracking)
npm run db:bus:push
npx prisma generate --schema=services/bus-service/prisma/schema.prisma
npm run db:bus:seed

# Production web build -> apps/web/dist
npm run build -w @nhpaowa/web
```

::: warning
Only run the seed commands on a fresh database. They load demo users (password `password123`) and sample data.
:::

## 5. systemd services

Create one unit per API. This template uses a dedicated `nhpaowa` system user:

```bash
sudo useradd --system --home /opt/nhpaowa_app --shell /usr/sbin/nologin nhpaowa || true
sudo chown -R nhpaowa:nhpaowa /opt/nhpaowa_app

for svc in identity inventory bus; do
sudo tee /etc/systemd/system/nhpaowa-$svc.service > /dev/null <<EOF
[Unit]
Description=NHPAOWA ${svc} service
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=nhpaowa
Group=nhpaowa
WorkingDirectory=/opt/nhpaowa_app
ExecStart=/usr/bin/node --env-file=/opt/nhpaowa_app/.env /opt/nhpaowa_app/services/${svc}-service/src/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
done

sudo systemctl daemon-reload
sudo systemctl enable --now nhpaowa-identity nhpaowa-inventory nhpaowa-bus
systemctl status nhpaowa-identity nhpaowa-inventory nhpaowa-bus --no-pager
```

Check health:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4001/health
curl http://127.0.0.1:4002/health
```

## 6. nginx (web + API proxy)

Create `/etc/nginx/sites-available/nhpaowa` with the configuration from [Reverse Proxy](/installation/reverse-proxy#nginx), setting `root /opt/nhpaowa_app/apps/web/dist;`. Then:

```bash
sudo ln -sf /etc/nginx/sites-available/nhpaowa /etc/nginx/sites-enabled/nhpaowa
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Open `http://<server-ip>/`.

## 7. Firewall and HTTPS

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# HTTPS with Let's Encrypt (after DNS points at the server)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nhpaowa.example.org
```

HTTPS is required for installing the app as a PWA on phones.

## 8. Updating

```bash
cd /opt/nhpaowa_app
sudo -u nhpaowa git pull
sudo -u nhpaowa npm install
sudo -u nhpaowa npx prisma db push --schema=services/inventory-service/prisma/schema.prisma
sudo -u nhpaowa npm run db:bus:push
sudo -u nhpaowa npx prisma generate --schema=services/bus-service/prisma/schema.prisma
sudo -u nhpaowa npm run build -w @nhpaowa/web
sudo systemctl restart nhpaowa-identity nhpaowa-inventory nhpaowa-bus
```

## Logs

```bash
journalctl -u nhpaowa-inventory -f
journalctl -u nhpaowa-bus -n 200 --no-pager
sudo tail -f /var/log/nginx/error.log
```

More in [Troubleshooting](/administration/troubleshooting).
