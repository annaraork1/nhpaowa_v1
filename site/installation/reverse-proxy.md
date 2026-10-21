# Reverse Proxy

In production, serve the web build and all APIs from **one origin** behind a reverse proxy. The browser then only needs port 80/443, the APIs stay private, and HTTPS (needed for PWA install) is handled in one place.

## Routes to proxy

| Path | Upstream | Serves |
|------|----------|--------|
| `/api/auth/` | `127.0.0.1:4000` | Identity — login, users, role menu features |
| `/api/inventory/` | `127.0.0.1:4001` | Inventory, purchasing, AMC, reports, flat self-update links |
| `/api/association/` | `127.0.0.1:4001` | Flats, NOC, moves, notices, board, staff, attendance |
| `/api/bus/` | `127.0.0.1:4002` | School bus gate, registry, slots, reports |
| `/uploads/` | `127.0.0.1:4001` | Item and staff photos, NOC and move attachments |
| everything else | static files in `apps/web/dist` | Single-page app (fall back to `index.html`) |

Build the web app with relative API URLs so it calls the same origin:

```env
VITE_API_BASE_URL=/api/inventory
VITE_IDENTITY_BASE_URL=/api/auth
VITE_BUS_BASE_URL=/api/bus
```

(`VITE_ASSOCIATION_BASE_URL` defaults to `/api/association`.)

## nginx

```nginx
server {
    listen 80;
    server_name nhpaowa.example.org;

    root /opt/nhpaowa_app/apps/web/dist;
    index index.html;
    client_max_body_size 20m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/auth/ {
        proxy_pass http://127.0.0.1:4000/api/auth/;
        include /etc/nginx/proxy_params;
    }

    location /api/inventory/ {
        proxy_pass http://127.0.0.1:4001/api/inventory/;
        include /etc/nginx/proxy_params;
    }

    location /api/association/ {
        proxy_pass http://127.0.0.1:4001/api/association/;
        include /etc/nginx/proxy_params;
    }

    location /api/bus/ {
        proxy_pass http://127.0.0.1:4002/api/bus/;
        include /etc/nginx/proxy_params;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4001/uploads/;
        include /etc/nginx/proxy_params;
    }
}
```

`/etc/nginx/proxy_params` ships with Debian/Ubuntu nginx and sets `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`. On other distributions, add those headers explicitly.

Add HTTPS with `sudo certbot --nginx -d nhpaowa.example.org`.

## Caddy

Caddy obtains HTTPS certificates automatically:

```txt
nhpaowa.example.org {
    encode gzip

    handle /api/auth/* {
        reverse_proxy 127.0.0.1:4000
    }
    handle /api/bus/* {
        reverse_proxy 127.0.0.1:4002
    }
    handle /api/* {
        reverse_proxy 127.0.0.1:4001
    }
    handle /uploads/* {
        reverse_proxy 127.0.0.1:4001
    }
    handle {
        root * /opt/nhpaowa_app/apps/web/dist
        try_files {path} /index.html
        file_server
    }
}
```

## In front of the Docker stack

The `nhpaowa-web` container already proxies every route above to the API containers. Point your outer proxy at it:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    include /etc/nginx/proxy_params;
}
```

## Netlify (web app only)

`netlify.toml` in the repo builds `@nhpaowa/web` and publishes `apps/web/dist`. When the APIs are hosted elsewhere, add redirects that proxy to them:

```toml
[[redirects]]
  from = "/api/auth/*"
  to = "https://api.example.org/api/auth/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/api/bus/*"
  to = "https://api.example.org/api/bus/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/api/*"
  to = "https://api.example.org/api/:splat"
  status = 200
  force = true
```

Proxy redirects must come **before** the SPA catch-all `/* → /index.html` rule.
