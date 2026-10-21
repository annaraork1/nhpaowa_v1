# Feature Specification: Flats List Search, Filters & Alignment

**Feature Branch**: `023-flats-list-filters`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `005-flat-owners`, `022-tower-registry-seed`, `019-mobile-responsive-lists`  
**Input**: Flat owners search for campus IDs (e.g. T21031) returns empty; table Flat/Actions columns misaligned; page lacks structured filters and clear empty-state messaging.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find flat by campus ID or text (Priority: P1)

Secretary types a campus flat id (`T21031`, `21031`, or `031`), tower, apartment type, owner name, phone, or email. Matching flats appear; unrelated rows hide. Searching must work against the displayed label format `T{tower}{flatNumber}` as well as stored fields.

**Why this priority**: ~1,705 units; without working search the register is unusable.

**Independent Test**: Seed includes T21031; search `T21031` and `21031` each return that flat; clear search restores the list (subject to remaining filters).

**Acceptance Scenarios**:

1. **Given** flat tower 21 / `031` exists, **When** user searches `T21031`, **Then** that flat is shown.
2. **Given** the same flat, **When** user searches `031` or owner phone substring, **Then** matching flats show.
3. **Given** a query with no matches, **When** results settle, **Then** the page shows “no matches” (not “no flats registered yet”).

---

### User Story 2 - Structured filters (Priority: P1)

Flat owners page offers filters: **Tower**, **Floor**, **Occupancy**, **Apartment type**. Filters AND with search. **Clear filters** resets search and all filters. Result count is visible.

**Why this priority**: Secretaries need to narrow by tower/floor/status without scanning 1,700 rows.

**Independent Test**: Filter Tower 21 shows only tower 21; combine with Floor 3 and Occupancy Vacant; Clear restores full list.

**Acceptance Scenarios**:

1. **Given** mixed towers, **When** user picks Tower 21, **Then** only tower 21 flats show.
2. **Given** floors on that tower, **When** user picks Floor 3 (or G), **Then** only that floor’s flats show.
3. **Given** active search + filters, **When** Clear is used, **Then** all controls reset and the full register loads.

---

### User Story 3 - Aligned desktop table (Priority: P2)

Desktop Flat owners table aligns **Flat** and **Actions** columns: Actions header and icon row share the same right edge; Flat labels share a consistent left column. Mobile cards remain unchanged in behavior.

**Why this priority**: Misaligned actions make the register look broken and slow click targeting.

**Independent Test**: On md+ viewport, Actions header text and row icon group share right alignment; Flat column content lines up across rows.

**Acceptance Scenarios**:

1. **Given** the flats table with rows, **When** viewed on desktop, **Then** Actions header and action icons are right-aligned consistently.
2. **Given** the same table, **When** compared across rows, **Then** Flat id text starts at the same horizontal position.

---

### Edge Cases

- Query with leading/trailing spaces is trimmed before search.
- Campus id with or without leading `T` / `t` both work.
- Partial tower-only queries (e.g. `21`) still match tower contains / campus parse when unambiguous.
- Residents keep existing scoped list (no staff filter bar required for residents).
- Empty register (zero flats, no filters) still shows “No flats registered yet.”
- Active filters with zero matches show a distinct no-matches message.

## Requirements *(mandatory)*

- **FR-001**: `GET /flats` MUST accept `q`, `tower`, `floor`, `occupancyStatus`, `apartmentType` (existing params retained where present).
- **FR-002**: `q` MUST match tower, flat number, apartment type, configuration, member name/phone/email, **and** campus flat id forms (`T{tower}{flatNumber}` / `{tower}{flatNumber}`).
- **FR-003**: Floor and occupancy filters MUST use exact match on stored floor / occupancyStatus.
- **FR-004**: Soft-deleted flats remain excluded unless `includeDeleted=true`.
- **FR-005**: Flat owners page MUST expose debounced search (~300ms), Tower / Floor / Occupancy / Apartment type filters, Clear, and result count.
- **FR-006**: Empty states MUST distinguish “no flats yet” vs “no matches for search/filters”.
- **FR-007**: Desktop table MUST right-align the Actions column header with row actions; Flat column uses consistent left padding/alignment.

## Success Criteria

- **SC-001**: Searching `T21031` returns the tower-21 floor-3 unit-1 flat in under 3 seconds on the seeded register.
- **SC-002**: Filtering Tower + Floor returns only that tower-floor’s flats in a manual check.
- **SC-003**: Clear filters restores the unfiltered list count (≈1,705 after seed).
- **SC-004**: Desktop Actions column header and icons share the same right edge in visual check.

## Assumptions

- Mirrors Items / Transactions filter UX (`017`, `020`).
- Floor options for the filter come from the selected tower’s catalog when a tower is chosen; otherwise a sensible G…14 range (or all floors present in catalog).
- Global header search remains separate; this feature is the Flat owners page list only.
- Export/import CSV buttons stay as existing page options; no new CSV behavior in this feature.
