# Plan: 028 Flat Self-Update Link

**Branch**: `028-flat-self-update-link` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Constitution Check

| Principle | Status |
|-----------|--------|
| §2.1 Modular | PASS — inventory-service association routes + public router |
| §2.3 Spec-driven | PASS — this folder |
| §2.4 Shared roles | PASS — public verify; staff flatOwners for approve |
| §2.7 association_id | PASS — all rows scoped |

## Technical Context

- Public routes: `/api/inventory/public/flat-update/*` (no JWT)
- Verify by **tower number** (`towerNumber`: `21031` / `T21031`); opaque tokens in DB (`FlatUpdateSession`), 30 min TTL
- Web: `/flat-update` outside authenticated shell; field label **Tower number**
- Reuse Flats CSV (015) for P0 seed; paper form maps to same columns; household (P2) via Flats / CSV

## Phases

1. Schema: collectionPhase + FlatSelfUpdate + FlatUpdateSession
2. Public verify/submit + staff approve APIs
3. Public UI + staff pending inbox + completion summary
4. Paper form doc + INSTALL P0 seed ops + notice URL export
