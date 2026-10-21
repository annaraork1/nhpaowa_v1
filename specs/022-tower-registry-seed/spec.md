# Feature Specification: Tower Registry & Campus Flat Seed

**Feature Branch**: `022-tower-registry-seed`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `005-flat-owners`, `015-flat-household-csv`  
**Input**: Spreadsheet is authoritative for NHPAOWA towers 1–35 (excl. Riva 17–20), floor groups G+14/G+12/G+10, one category per tower, 4 flats/floor, 19 missing flat numbers → **1,705** actual flats.

## Clarifications (locked)

| Topic | Decision |
|-------|----------|
| Active towers | 1–16 and 21–35 (31 towers) |
| Excluded | 17–20 Riva permanently (0 flats) |
| Floors | Display **G**, then **1…N**; DB stores G as `0` |
| Flat numbers | `{FF}{U}` — G=`001`–`004`, 3rd=`031`–`034`, 10th=`101`–`104`; label **`T{tower}{num}`** (T21031) |
| Category | Uniform per tower → apartment catalog variant |
| Missing | Exact flat numbers excluded per tower (19 total) |
| Uniqueness | Same tower + flat number rejected (409); floor must match flat number |

## User Scenarios

### US1 - Add Flat respects tower registry (P1)
Secretary picks an active tower; floor options match that tower’s group; type/config locked to tower category; excluded flat numbers rejected.

### US2 - Seed creates 1,705 flats (P1)
`prisma seed` upserts the campus grid for the association (demo members remain on sample flats).

### US3 - Catalog API exposes tower metadata (P2)
`GET /apartment-catalog` includes `towerCatalog` with floors, category, missing flats, defaultVariant.

## Requirements

- **FR-001**: `TOWER_CATALOG` in `@nhpaowa/shared-ui` is source of truth.
- **FR-002**: Create/update flat MUST reject inactive towers (17–20), invalid floors, and missing flat numbers.
- **FR-003**: Tower category MUST determine apartment type/configuration.
- **FR-004**: Seed MUST create exactly 1,705 flats matching the spreadsheet.
- **FR-005**: UI floor control uses labels G / 1…N.

## Success Criteria

- **SC-001**: Generator count === 1705.
- **SC-002**: Add Flat cannot select Tower 17.
- **SC-003**: Tower 4 cannot create flat `001`.

## Related

- List search by campus id (`T21031`), structured filters, and Flats table alignment: `023-flats-list-filters`.
