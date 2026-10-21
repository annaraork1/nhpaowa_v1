# Feature Spec Addendum: Configurable Staff Categories

**Extends**: `011-staff-csv-roster` / `007-staff-attendance`  
**Updated**: 2026-09-20

## Problem

Staff categories were previously **hardcoded** in application constants (`staffCsv.js` / Attendance UI). There was **no screen to add or edit categories**, so associations could not introduce posts such as Waste/STP, Lift liaison, or Fire safety without a code change.

## Research (additional RWA categories)

Beyond gate/lobby security, housekeeping, gardening, electrician, plumber, clubhouse, and office, multi-tower Indian RWAs commonly also roster:

| Code | Label | Typical need |
|------|-------|--------------|
| WASTE_MGMT | Waste / STP | Garbage rooms, STP helper, wet/dry segregation |
| LIFT | Lift technician | Lift breakdown liaison / AMC escort |
| FIRE_SAFETY | Fire & safety | Extinguisher/hydrant checks, drills support |
| CCTV | CCTV desk | Control-room monitoring (sometimes separate from gate) |
| OTHER | Other | Catch-all |

## User Story — Manage staff categories (Priority: P1)

Secretary/Superadmin opens Attendance → **Staff categories**, adds a category (code + label), reorders/deactivates. Add Staff and CSV import only accept **active** categories from this register.

**Independent Test**: Add `WASTE_MGMT` / “Waste / STP” → appears in Add Staff dropdown → CSV row with that category imports successfully.

## Functional requirements (additions)

- **FR-009**: System MUST persist staff categories per association (code, label, sortOrder, active).
- **FR-010**: Authorized `attendance` createEdit users MUST be able to create, update, and soft-deactivate categories.
- **FR-011**: Add Staff dropdown, CSV validation, and `/staff/categories` MUST read the live category register (not a hard-coded exclusivelist).
- **FR-012**: Seed MUST install research defaults: SECURITY, HOUSEKEEPING, GARDENING, ELECTRICAL, PLUMBING, MAINTENANCE, CLUBHOUSE, OFFICE, WASTE_MGMT, LIFT, FIRE_SAFETY, CCTV, OTHER.

## Assumptions

- Category **code** is stable uppercase slug used in CSV; **label** is display text.
- Deactivating a category does not delete existing staff rows that already use that code.
- Built-in defaults can be renamed via label; deleting system codes is soft-deactivate only.
