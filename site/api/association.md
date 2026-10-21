# Association API

Base path: `/api/association` (served by inventory-service, port 4001). Covers flats, members, households, NOC, moves, staff attendance, notices, and the board.

## Flats and members

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/apartment-catalog` | Towers and flats of the campus |
| GET | `/flats` | List and search flats (query: `q`, tower, filters) |
| POST | `/flats` | Create a flat record |
| PATCH | `/flats/:id` | Update a flat |
| DELETE | `/flats/:id` | Soft-delete a flat |
| POST | `/flats/:id/members` | Add a member (owner, associate owner, tenant, family) |
| DELETE | `/members/:id` | Remove a member |
| GET | `/flats/export.csv` · `/flats/export.pdf` | Owner register export |
| GET | `/flats/csv-template` · `/flats/csv-guide` | Import template and guide |
| POST | `/flats/import-csv` | Merge a CSV into the register |

## Household

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/flats/:flatId/vehicles` | List or add vehicles |
| PATCH/DELETE | `/vehicles/:id` | Update or remove a vehicle |
| POST | `/vehicles/:id/rc` | Upload the registration certificate |
| POST | `/vehicles/:id/approve` · `/reject` | Approve or reject a resident's vehicle change |
| PATCH | `/pets/:id` · `/access-devices/:id` · `/emergency-contacts/:id` | Update household records |
| GET/POST | `/parking-slots` | Parking slot register |
| PATCH/DELETE | `/parking-slots/:id` | Update or remove a slot |
| POST/DELETE | `/parking-slots/:id/letter` · `/flats/:flatId/parking-letter` | Parking allotment letters |
| GET | `/household-pending` · `/flats/:flatId/household-pending` | Changes waiting for approval |

## NOC

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/noc` | List requests |
| POST | `/noc` | Submit a request (purpose: `SALE_TRANSFER`, `BANK_LOAN`, `RENTAL`, `RENOVATION`, `OTHER`) |
| POST | `/noc/:id/issue` · `/reject` · `/cancel` | Decide a request |
| POST | `/noc/:id/attachments` | Upload supporting documents |
| DELETE | `/noc/:id/attachments/:attachmentId` | Remove an attachment |

## Moves

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/moves` · `/moves/:id` | List or view moves |
| POST | `/moves` | Request a move (`MOVE_IN`, `MOVE_OUT`, `INTERNAL_SHIFT`) |
| POST | `/moves/:id/approve` · `/reject` · `/start` · `/complete` · `/cancel` | Advance the workflow |
| GET | `/moves/:id/pdf` | Move permit PDF |
| POST/DELETE | `/moves/:id/attachments[/:attachmentId]` | Attachments |

## Staff and attendance

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/staff` | List or add staff |
| PATCH | `/staff/:id` | Update staff, including the active flag |
| POST | `/staff/photo` | Upload a staff photo |
| GET | `/staff/csv-template` · POST `/staff/import-csv` | Bulk import |
| GET/POST | `/staff/categories` | Staff categories |
| PATCH/DELETE | `/staff/categories/:id` | Edit or remove a category |
| POST | `/attendance/check-in` | Check a person in |
| POST | `/attendance/:id/check-out` | Check out (blocked within 30 seconds of check-in) |
| POST | `/attendance/mark-absent` · `/clear-absent` | Absent marks |
| GET | `/attendance/day-state` | Today's state per person |
| GET | `/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD` | Punches. Add `format=csv` for the clock CSV, or `format=csv&mode=payroll` for the payroll CSV |
| GET | `/attendance/summary` · `/attendance/history` | Daily summary and history |
| GET/POST | `/leave` | List or record leave |
| POST | `/leave/:id/cancel` | Cancel leave |

## Notices and board

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/notices` · `/notices/:id` | List or view notices (residents see published only) |
| POST | `/notices` | Create a draft |
| PATCH | `/notices/:id` | Edit |
| POST | `/notices/:id/publish` · `/unpublish` · `/archive` | Change status |
| GET | `/notices/:id/pdf` | Notice PDF on the letterhead |
| GET | `/board/roles` · `/board/members` | Office-bearer roles and members |
| POST/PATCH/DELETE | `/board/roles[/:id]` · `/board/members[/:id]` | Manage the board |
| GET | `/board/letterhead` · `/board/letterhead-public` | Letterhead data |

## Flat self-update

These live under `/api/inventory` on the same service.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/inventory/public/flat-update/verify` | Public | Verify a resident's link and flat |
| POST | `/api/inventory/public/flat-update/submit` | Public | Submit updated details |
| GET | `/api/inventory/flat-self-updates` | Staff | Review queue |
| POST | `/api/inventory/flat-self-updates/:id/approve` · `/reject` | Staff | Decide a submission |
| GET | `/api/inventory/flats/collection-summary` | Staff | Drive progress |
| GET | `/api/inventory/flats/update-links.csv` | Staff | Per-flat links for distribution |
