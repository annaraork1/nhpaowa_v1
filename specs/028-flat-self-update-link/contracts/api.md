# Contract: Flat self-update API

## Public (no JWT)

- `POST /api/inventory/public/flat-update/verify`  
  `{ towerNumber }` (e.g. `21031` / `T21031`) → `{ token, expiresAt, flat: { tower, flatNumber, towerNumber, occupancyStatus, primaryName, primaryPhone, secondaryName, secondaryPhone, tenantName, tenantPhone, notes, hasExisting } }`  
  Aliases: `campusFlatId`, `flatId`. Legacy `{ tower, flatNumber }` still accepted. No phone check.
- `POST /api/inventory/public/flat-update/submit`  
  `{ token, occupancyStatus, primaryName, primaryPhone, secondaryName?, secondaryPhone?, tenantName?, tenantPhone?, notes? }` → `{ id, status: PENDING }`  
  Tenant name + phone required when `occupancyStatus=TENANT_OCCUPIED`.

## Staff (flatOwners)

- `GET /api/inventory/flat-self-updates?status=PENDING`
- `POST /api/inventory/flat-self-updates/:id/approve`
- `POST /api/inventory/flat-self-updates/:id/reject` `{ reason }`
- `GET /api/inventory/flats/collection-summary` → `{ towers: [{ tower, total, seed, p1, p2 }], totals }`
- `GET /api/inventory/flats/update-links.csv` — `towerNumber,tower,flatNumber,collectionPhase,url` for notice blasts
