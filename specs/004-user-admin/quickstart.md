# Quickstart: Superadmin User Admin

## Prerequisites

- Postgres up; `DATABASE_URL` in `.env`
- `npm run db:seed` (or reset) so `superadmin@nhpaowa.local` exists
- `npm run dev:identity`, `npm run dev:inventory`, `npm run dev:web`

## Seeded Superadmin

| Email | Password | Role |
|-------|----------|------|
| superadmin@nhpaowa.local | password123 | SUPERADMIN |

## Validate

1. Login as Superadmin → open **Users** in nav.
2. Create user: Staff, email `staff2@nhpaowa.local`, password `password123`.
3. Sign out → login as `staff2@…` → confirm stock in/out available; Users nav hidden.
4. As Superadmin, deactivate `staff2` → login as staff2 fails.
5. As Superadmin with only one Superadmin, try deactivate self → rejected.
6. Non-Superadmin calling `POST /api/auth/users` → 403.

## API smoke

```bash
# login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"superadmin@nhpaowa.local\",\"password\":\"password123\"}"
# use token:
curl -s http://localhost:4000/api/auth/users -H "Authorization: Bearer $TOKEN"
```
