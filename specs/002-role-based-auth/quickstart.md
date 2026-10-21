# Quickstart: Role-Based Auth

## Run

```bash
npm run db:seed
npm run dev:identity
npm run dev:inventory
npm run dev:web
```

## Accounts (seed)

| Email | Password | Role |
|-------|----------|------|
| secretary@nhpaowa.local | password123 | SECRETARY |
| treasurer@nhpaowa.local | password123 | TREASURER |
| staff@nhpaowa.local | password123 | STAFF |
| vendor@shree.local | password123 | VENDOR |

Add resident via Secretary register or seed (if present).

## Manual checks

1. Open http://localhost:5173 → redirect to `/login`
2. Login secretary → Items shows Add/Edit/Delete
3. Logout → login staff → Items has no Delete; Stock works
4. Login resident (or stub only if seeded) → read-only
5. Login vendor → vendor portal only for Shree POs
6. API: Staff JWT `DELETE /items/:id` → 403
