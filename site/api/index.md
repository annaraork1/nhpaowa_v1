# API Overview

Everything the web app does goes through a JSON REST API, so you can script imports, connect other tools, or build your own client.

## Services and base URLs

| Service | Port | Base path | Reference |
|---------|------|-----------|-----------|
| Identity | 4000 | `/api/auth` | [Identity API](/api/identity) |
| Inventory | 4001 | `/api/inventory` | [Inventory API](/api/inventory) |
| Inventory (association module) | 4001 | `/api/association` | [Association API](/api/association) |
| Bus | 4002 | `/api/bus` | [Bus API](/api/bus) |

Behind the [reverse proxy](/installation/reverse-proxy), every path is served from the same origin, for example `https://nhpaowa.example.org/api/inventory/items`. Each service also exposes `GET /health` without authentication.

## Authentication

Sign in to get a JSON Web Token (JWT), then send it on every request:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"secretary@nhpaowa.local","password":"password123"}' | jq -r .token)

curl http://localhost:4001/api/inventory/items \
  -H "Authorization: Bearer $TOKEN"
```

Tokens are valid for **7 days**. The token carries the user's id, role, association, and (for vendors) supplier, so the same token works on all three services as long as they share `JWT_SECRET`.

### Development mode

When `AUTH_STRICT=false`, a request **without** a token is accepted as a development user. The role defaults to Secretary and can be changed with the `X-Dev-Role` header:

```bash
curl http://localhost:4001/api/association/flats -H 'X-Dev-Role: COMMITTEE'
```

::: danger
Never run production with `AUTH_STRICT=false` — anyone could call the API as any role. See [Configuration](/administration/configuration).
:::

## Permissions

Each endpoint checks the caller's role against the [permission matrix](/administration/roles). Superadmin can additionally switch menu features on or off for Staff, Security Head, Estate Manager, and Security Staff.

## Conventions

- Request and response bodies are JSON. File uploads use `multipart/form-data`.
- Ids are UUIDs.
- Money and quantities are returned as numbers.
- Deletes are soft — records get a `deletedAt` timestamp and disappear from lists.
- CSV and PDF exports are plain `GET` requests that return a file download.

## Errors

Errors return an HTTP status and a JSON body with an `error` message:

```json
{ "error": "Forbidden for this role" }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation failed or the action isn't allowed in the record's current state |
| 401 | Missing or invalid token (`Authentication required`, `Invalid token`, `Invalid credentials`) |
| 403 | The role doesn't have permission |
| 404 | Not found, or belongs to another association |
| 409 | Conflict, such as a duplicate email |
