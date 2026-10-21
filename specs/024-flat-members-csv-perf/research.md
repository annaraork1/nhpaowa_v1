# Research: 024

## Family roles
`OWNER_FAMILY` / `TENANT_FAMILY` mirror RWA practice (non-title residents). No schema migration — `FlatMember.role` is string.

## CSV merge
Dry-run returns conflicts; apply uses resolutions keyed `rowNum:field` → `keep|csv`. Fill-missing: empty DB ← CSV; equal values skip; both non-empty and unequal → conflict.

## campusFlatId
Optional column; `parseCampusFlatQuery` fills tower/flatNumber when those cells blank.

## Pagination
Breaking change from bare array to `{ items, total, limit, offset }`. Client updated in same change. Export unchanged (full list).
