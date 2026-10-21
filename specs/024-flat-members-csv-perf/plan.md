# Plan: 024 Family Members, Smart CSV, Flats Perf

**Branch**: `024-flat-members-csv-perf` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

## Summary

Add `OWNER_FAMILY` / `TENANT_FAMILY`; CSV campus id + fill-missing import with dry-run conflict resolutions; paginate GET `/flats` and Flats page.

## Technical Context

**Stack**: Express + Prisma + React (existing)  
**Touch**: `flatCsv.js`, `association.js`, `client.js`, `FlatsPage.jsx`, optional `shared-ui` member role labels  
**Perf**: `take`/`skip` + `count`; default limit 50

## Implementation

1. Shared role constants / labels.
2. Expand zod + FlatsPage member select + CSV EXTRA_MEMBER_ROLES + guide samples (FFU + campusFlatId).
3. Refactor `importFlatsCsv` → preview/apply, fill-missing, conflict list, resolutions map.
4. Import panel: Preview → conflict radios → Apply.
5. GET `/flats` paginated response; client + FlatsPage page controls; reset offset on filter change.
6. Cross-link 005 / 015; mark tasks done.
