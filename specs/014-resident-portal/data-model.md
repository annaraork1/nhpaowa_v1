# Data Model: Resident Portal

No new tables. Semantics of existing models:

## FlatMember.userId

- Optional UUID of `User.id`
- When set and `isActive` and not soft-deleted, that user is **linked** to the flat
- RESIDENT may read/write household and create NOC/moves only for linked flats

## Seed sample

| Field | Value |
|-------|--------|
| User email | `resident@nhpaowa.local` |
| Role | RESIDENT |
| Password | `password123` (shared demo) |
| Flat | Tower `1`, Flat `101` |
| Member role | PRIMARY_OWNER |
| Member name | matches User.name |

## List scoping

| Resource | RESIDENT filter |
|----------|-----------------|
| Flats | `members.some({ userId })` |
| NOC | `flatId in linkedFlatIds` |
| Moves | `flatId in linkedFlatIds OR destinationFlatId in linkedFlatIds` |
| Notices | PUBLISHED only (unchanged) |
