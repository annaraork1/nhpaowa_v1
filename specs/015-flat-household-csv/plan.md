# Implementation Plan: Flat & Household CSV

**Branch**: `015-flat-household-csv` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

## Summary

Add staff CSV template + import for flats/members/household; expand existing `/flats/export.csv` to the same column layout for round-trip. Mirror `011-staff-csv-roster` patterns (`parseCsv`, summary response, Flats page UI).

## Technical Context

**Stack**: Express + Prisma; reuse `parseCsv` from `staffCsv.js` or shared helper  
**Permissions**: export = `flatOwners` view (non-resident); import/template = `flatOwners` createEdit + staff editor roles  

## Constitution Check

| Gate | Status |
|------|--------|
| Spec-driven | PASS |
| Soft-delete / no wipe on empty HH cols | PASS |
| Central permissions | PASS |

## Structure

```text
services/inventory-service/src/lib/flatCsv.js
services/inventory-service/src/routes/association.js  # export + import + template
apps/web/.../FlatsPage.jsx
apps/web/.../api/client.js
specs/005, 013, ASSOCIATION-ROADMAP cross-links
```

## Encoding

See [contracts/api.md](./contracts/api.md) and [quickstart.md](./quickstart.md).
