# Implementation Plan: Resident Portal

**Branch**: `014-resident-portal` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

## Summary

Ship a real sample RESIDENT login linked to Tower 1 / 101, tighten RESIDENT permissions to association self-service only, scope flats/NOC/moves APIs to linked flats, block staff transitions for residents, and present a resident-focused UI (home, my flat, notices, request NOC/moves).

## Technical Context

**Stack**: Express + Prisma (existing association routes), React web shell  
**Permissions**: `@nhpaowa/shared-auth` PERMISSIONS for RESIDENT  
**Scoping**: `FlatMember.userId === user.id` (same as 013 household)

## Constitution Check

| Gate | Status |
|------|--------|
| Spec-driven | PASS |
| Soft-delete / audit | PASS (no schema break) |
| Role permissions centralized | PASS |

## Phase 0 — Research

See [research.md](./research.md).

## Phase 1 — Design

- [data-model.md](./data-model.md) — link semantics only (no new tables)
- [contracts/api.md](./contracts/api.md)
- [quickstart.md](./quickstart.md)

## Structure

```text
packages/shared-auth/src/permissions.js
services/inventory-service/src/lib/residentScope.js
services/inventory-service/src/routes/association.js
services/inventory-service/prisma/seed.js
apps/web/src/App.jsx
apps/web/src/modules/association/pages/ResidentHomePage.jsx
apps/web/src/modules/association/pages/FlatsPage.jsx
apps/web/src/modules/association/pages/NocPage.jsx
apps/web/src/modules/association/pages/MovesPage.jsx
apps/web/src/modules/inventory/pages/LoginPage.jsx
specs/ASSOCIATION-ROADMAP.md + related feature specs
```

## Implementation notes

- Extract `residentLinkedFlatIds` / `assertResidentOwnsFlat` for association routes.
- RESIDENT `createEdit` on noc/moves = create only; transitions require staff roles.
- Flat POST/PATCH/DELETE and member mutate: staff editors only.
- UI: `role === 'RESIDENT'` branches; nav labels “My flat”; resident home at `/`.
