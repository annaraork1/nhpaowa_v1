# Quickstart: School Bus

1. `npm run dev:identity` · `npm run dev:inventory` · `npm run dev:bus` · `npm run dev:web`
2. Apply bus schema: `npm run db:bus:push` (and seed)
3. Login **Secretary** (or Superadmin) → **Schools & buses** / **Bus batches** → add school/bus/batch/slot
4. Login **Security Staff** → nav shows **Bus gate** (and **Bus reports** view); **does not** show Schools & buses or Bus batches
5. Security Staff → Gate → select PICKUP → IN → enter children → OUT (or DROP-OFF → enter children → IN → OUT)
6. Security Staff → Bus reports → pick date → on-screen child counts (read-only; no registry edits)
7. Resident → Today’s buses (status only)
8. Re-login after RBAC deploy so JWT/menuFeatures pick up `schoolBus` / `schoolBusAdmin`
