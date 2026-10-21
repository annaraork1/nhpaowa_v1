# Contract: Staff CSV API

Resource `attendance` (createEdit for mutate).

- `GET /staff/categories` — list categories (`?includeInactive=true`)
- `POST /staff/categories` — create `{ code, label, sortOrder?, active? }`
- `PATCH /staff/categories/:id` — update label/sort/active
- `DELETE /staff/categories/:id` — soft deactivate
- `GET /staff/csv-template` — text/csv attachment `staff-template.csv`
- `POST /staff/import-csv` — body `{ csv }` → `{ created, skipped, errors[] }`
- `POST /staff` / `PATCH /staff/:id` — category must match an **active** StaffCategory.code; optional `photoUrl` (`026-staff-photo-roster`)
- `POST /staff/photo` — multipart staff face image (`026`)
