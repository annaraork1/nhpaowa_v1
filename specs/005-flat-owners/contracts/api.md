# Contract: Flat Owners API

Base: `/api/association`

## Permissions resource `flatOwners`
- SUPERADMIN, SECRETARY: view, createEdit, delete
- TREASURER, COMMITTEE: view
- Others: none

## Endpoints
- `GET /flats?q=&includeDeleted=`
- `POST /flats` `{ wing, flatNumber, floor?, flatType?, parkingSlots?, occupancyStatus?, notes? }`
- `PATCH /flats/:id`
- `DELETE /flats/:id` soft-delete
- `GET /flats/:id/members`
- `POST /flats/:id/members` `{ role, name, phone, email? }`
- `PATCH /members/:id` / `DELETE /members/:id`
- `GET /flats/export.csv` (includes household columns — see `015-flat-household-csv`)
- `GET /flats/csv-template` (staff createEdit)
- `POST /flats/import-csv` `{ csv }` → `{ created, updated, skipped, errors[] }` (staff createEdit)
