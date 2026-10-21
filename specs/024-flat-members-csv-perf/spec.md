# Feature Specification: Family Members, Smart CSV Merge & Flats Performance

**Feature Branch**: `024-flat-members-csv-perf`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `005-flat-owners`, `015-flat-household-csv`, `022-tower-registry-seed`, `023-flats-list-filters`  
**Input**: Need owner/tenant family member roles; CSV must use campus tower/flat IDs and merge into seeded flats (fill missing only); conflicting CSV vs existing values need user confirmation; Flats page is slow with ~1705 rows fully rendered.

## Clarifications (locked)

| Topic | Decision |
|-------|----------|
| Family roles | `OWNER_FAMILY`, `TENANT_FAMILY` (many per flat) |
| Primary uniqueness | Unchanged — at most one `PRIMARY_OWNER` |
| CSV key | `tower` + `flatNumber`; optional `campusFlatId` (`T21031`) may supply both |
| Import default | **Fill missing** — never overwrite non-empty existing values unless user resolves a conflict |
| Conflicts | Preview lists field-level conflicts; user chooses **Keep current** or **Use CSV** per conflict (or bulk) |
| Household CSV | Blank cell = leave unchanged; new keys still added; differing existing keys are conflicts |
| List performance | Server pagination (`limit`/`offset`/`total`); default page size 50; filters/search still server-side |

## User Scenarios & Testing

### US1 - Add owner / tenant family members (P1)

Staff (and residents where already allowed for associate/tenant) can add members with roles **Owner family** or **Tenant family**.

**Acceptance**:

1. Add Owner family on an owner-occupied flat → appears in member list.
2. Add Tenant family → appears; Primary uniqueness unchanged.
3. CSV `members` cell accepts `OWNER_FAMILY:…` and `TENANT_FAMILY:…`.

### US2 - CSV uses campus tower/flat details (P1)

Template, guide, export, and import use FFU flat numbers and optional `campusFlatId`. Samples use e.g. tower `21`, flat `031`, floor `3` / `T21031`.

**Acceptance**:

1. Template samples use FFU numbers and family roles in `members`.
2. Export includes `campusFlatId` column (and existing columns).
3. Import with only `campusFlatId=T21031` resolves tower/flat when columns blank.

### US3 - Smart merge into seeded flats (P1)

Import against already-seeded flats **fills empty fields and adds missing members/household**; does not blindly overwrite.

**Acceptance**:

1. Seeded vacant flat + CSV with primary owner only → primary created; tower/type unchanged if already set.
2. Existing primary phone differs from CSV → conflict in preview, not silent overwrite.
3. New associate/family in CSV not in DB → added.

### US4 - Conflict confirmation (P1)

Import is **preview then apply**. Preview returns creates / fills / conflicts. User resolves each conflict (Keep / Use CSV), then apply.

**Acceptance**:

1. Preview with conflicts shows them in UI; apply without resolutions is rejected or no-ops those fields.
2. Resolving Use CSV updates that field; Keep leaves DB value.
3. Zero conflicts → apply completes with fills + creates only.

### US5 - Flats list pagination (P1)

Flats page does not render all ~1705 rows at once. API returns a page; UI has next/prev (or page size) and shows total count.

**Acceptance**:

1. Default load returns ≤50 flats + total ≈1705.
2. Search `T21031` still finds the flat (server-side).
3. Changing tower filter resets to first page.

## Requirements

- **FR-001**: Member roles MUST include `OWNER_FAMILY` and `TENANT_FAMILY` in API validation, UI select, and CSV.
- **FR-002**: Residents MUST NOT set `PRIMARY_OWNER`; they MAY add `ASSOCIATE_OWNER`, `TENANT`, `OWNER_FAMILY`, `TENANT_FAMILY` on linked flats.
- **FR-003**: CSV MUST support optional `campusFlatId`; export MUST include it.
- **FR-004**: `POST /flats/import-csv` MUST accept `dryRun` and `resolutions`; default apply strategy is fill-missing.
- **FR-005**: Conflicts MUST identify row, flat key, field, current value, csv value.
- **FR-006**: `GET /flats` MUST support `limit` (default 50, max 200) and `offset`; response `{ items, total, limit, offset }`.
- **FR-007**: Flats page MUST paginate and not mount all register rows in the DOM by default.

## Success Criteria

- **SC-001**: Family roles selectable and persisted in manual check.
- **SC-002**: Preview of conflicting CSV shows ≥1 conflict; apply with Keep leaves DB phone unchanged.
- **SC-003**: First paint of Flat owners with seeded DB shows one page of rows in under 3s on typical laptop.
- **SC-004**: Search `T21031` still returns that flat under pagination.

## Assumptions

- Conflict UI is in the existing Import CSV panel (no separate route).
- Export remains full-register (staff) — pagination does not limit export.
- Soft-deleted flats stay excluded from import match unless reactivated later (out of scope).
