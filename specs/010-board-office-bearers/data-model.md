# Data Model: Board & Office Bearers

## OfficeBearerRole

- id (uuid)
- associationId
- name (string) — e.g. President
- code (string) — e.g. PRESIDENT, SECRETARY, ESTATE_MANAGER
- sortOrder (int)
- showOnLetterhead (bool, default true)
- isPresidentSigner (bool, default false)
- active (bool, default true)
- deletedAt?
- createdAt, updatedAt

Unique: (associationId, code)

## OfficeBearerMember

- id (uuid)
- associationId
- roleId → OfficeBearerRole
- fullName (string)
- phone?
- email?
- notes?
- sortOrder (int, default 0)
- active (bool, default true)
- deletedAt?
- createdAt, updatedAt

Indexes: (associationId, active), (roleId)

## Letterhead query

Active roles with `showOnLetterhead` ordered by `sortOrder`, each with active members ordered by `sortOrder`; President = role where `isPresidentSigner` + first active member.
