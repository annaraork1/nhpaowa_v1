# Plan: 023 Flats List Filters

**Branch**: `023-flats-list-filters` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

## Summary

Fix Flat owners search so campus IDs (`T21031`) resolve; add Tower / Floor / Occupancy / Type filters with Clear; distinguish empty vs no-match; align desktop Flat/Actions columns.

## Technical Context

**Language/Version**: Node.js (inventory-service) + React (apps/web)  
**Primary Dependencies**: Express, Prisma, TanStack Query, `@nhpaowa/shared-ui`  
**Storage**: Existing `Flat` / `FlatMember` Postgres models  
**Testing**: Manual smoke via API + UI  
**Target Platform**: NHPAOWA web ops console  
**Project Type**: Monorepo web + API  
**Performance Goals**: Debounced search; server-side filter on ~1705 flats  
**Constraints**: Resident scoped list unchanged  
**Scale/Scope**: One page + GET `/flats` query extension

## Constitution Check

Passes: permissioned association routes; shared catalog helpers in `@nhpaowa/shared-ui`; no secrets.

## Project Structure

```text
specs/023-flats-list-filters/
├── plan.md
├── research.md
├── quickstart.md
├── contracts/flats-list.md
└── tasks.md

packages/shared-ui/src/towerCatalog.js     # parseCampusFlatQuery
services/inventory-service/src/routes/association.js
apps/web/src/modules/inventory/api/client.js
apps/web/src/modules/association/pages/FlatsPage.jsx
```

## Implementation

1. Add `parseCampusFlatQuery(q)` in shared-ui (strip `T`, split tower + 3-digit flat).
2. Extend GET `/flats` with `floor`, `occupancyStatus`; enrich `q` OR with campus-id exact tower+flatNumber.
3. Client `flats.list(params)` via URLSearchParams.
4. FlatsPage filter bar (Items-style); floor options from tower catalog; empty-state split; table `text-right` on Actions th; optional `w-*` / `whitespace-nowrap` on Actions.
5. Cross-link FR-006 in `005-flat-owners` and note in `022`.
6. Smoke: `q=T21031`, tower+floor filters, Clear.
