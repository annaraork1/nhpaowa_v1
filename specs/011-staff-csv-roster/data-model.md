# Data Model: Staff CSV Roster

## AssociationStaff (extended)

- …existing fields…
- tower (string?, e.g. `"3"` or null for campus-wide)
- designation (string?, e.g. `Main Gate`, `Lobby`, `Clubhouse Desk`)
- category (string) — stores **StaffCategory.code**

## StaffCategory

- id (uuid)
- associationId
- code (string) — e.g. SECURITY, WASTE_MGMT
- label (string) — display name
- sortOrder (int)
- active (bool)
- deletedAt?
- createdAt, updatedAt

Unique: (associationId, code)
