# API Contract: Resident Portal

## Auth / permissions

RESIDENT may call:

| Resource | Actions |
|----------|---------|
| dashboard | view |
| alerts | view |
| notices | view |
| flatOwners | view, createEdit (household only; scoped) |
| noc | view, createEdit (create only; scoped) |
| moves | view, createEdit (create only; scoped) |

## Scoping behaviour

### `GET /association/flats`

- RESIDENT → only flats where an active `FlatMember.userId = caller`
- Staff → association-wide (unchanged)

### `POST/PATCH/DELETE /association/flats*` (flat master)

- RESIDENT → **403** on flat create/update/delete
- RESIDENT MAY `POST /flats/:id/members` for linked flats (ASSOCIATE_OWNER | TENANT only)
- Member soft-delete remains staff (`delete` permission)

### `GET /association/noc`, `GET /association/moves`

- RESIDENT → filtered to linked flat ids

### `POST /association/noc`, `POST /association/moves`

- RESIDENT → **403** unless `flatId` is linked
- INTERNAL_SHIFT: origin must be linked; destination any association flat

### Attachments

- `POST/DELETE /association/noc/:id/attachments[/:attachmentId]` — staff or linked resident
- `POST/DELETE /association/moves/:id/attachments[/:attachmentId]` — staff editors or linked resident on that move

### Staff transitions

- `POST .../noc/:id/issue|reject|cancel`
- `POST .../moves/:id/approve|reject|start|cancel|complete`
- RESIDENT → **403**

### Household

- Unchanged from 013 (`flatHousehold.js` link + PENDING); vehicle RC upload remains the household attachment path

