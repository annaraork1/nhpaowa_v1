# Quickstart: Resident Portal

## Seed

```bash
cd services/inventory-service
npx prisma db seed
```

## Login

| Email | Password | Flat |
|-------|----------|------|
| `resident@nhpaowa.local` | `password123` | Tower **1** / **101** |

App: http://localhost:5173/login

## Smoke

1. Sign in as resident → nav: Home, My flat, Notices, NOC, Moves (no Items / Attendance).
2. Home shows Tower 1-101 and shortcuts.
3. My flat → **+ Add member** (Associate / Tenant) → member listed.
4. My flat → Household → submit a vehicle → PENDING (RC upload available).
5. NOC → Request NOC → **paperclip** attach PDF/image → listed.
6. Moves → Request move → Details → upload attachment → listed.
7. Notices → only published.
8. Sign in as secretary → approve household / NOC / moves as usual.
