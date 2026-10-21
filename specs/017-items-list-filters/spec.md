# Feature Specification: Items List Search & Filters

**Feature Branch**: `017-items-list-filters`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `001-inventory-management`  
**Input**: Items page has no search/filters; Secretaries need to find catalog rows by any visible column and narrow by category / stock status / unit.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Freetext search across columns (Priority: P1)

Authorized user types in a search box on Items. Results match **name, SKU, barcode, category name, or unit** (case-insensitive contains). Empty query returns the full (non-deleted) catalog subject to other filters.

**Independent Test**: Seed item “LED Bulb” SKU `EL-01`; search `EL-01` and `bulb` and category fragment each return it; unrelated query returns empty list (not error).

**Acceptance Scenarios**:

1. **Given** items in catalog, **When** user searches a SKU substring, **Then** matching items appear and non-matches are hidden.
2. **Given** a barcode on an item, **When** user searches that barcode, **Then** the item is found.
3. **Given** search text, **When** user clears it, **Then** the list restores (with any remaining filters still applied).

---

### User Story 2 - Structured filters (Priority: P1)

Items page offers filters: **Category**, **Stock status** (In stock / Low stock / Out of stock), **Unit**. Filters combine with search (AND). A **Clear filters** control resets search + filters.

**Independent Test**: Filter Low stock shows only `LOW_STOCK` rows; combining with a category further narrows; Clear restores full list.

**Acceptance Scenarios**:

1. **Given** multiple categories, **When** user picks one category, **Then** only that category’s items show.
2. **Given** mixed stock statuses, **When** user filters Out of stock, **Then** only `OUT_OF_STOCK` items show.
3. **Given** active search + filters, **When** Clear is used, **Then** all controls reset and full catalog loads.

---

### User Story 3 - Debounced UX (Priority: P2)

Search input is debounced (~300ms) so typing does not hammer the API. Empty-state copy distinguishes “no items yet” vs “no matches for filters”.

**Independent Test**: Rapid typing issues one settled request; zero matches shows a clear message.

---

## Requirements *(mandatory)*

- **FR-001**: `GET /items` MUST accept `q`, `categoryId`, `status` (`IN_STOCK`|`LOW_STOCK`|`OUT_OF_STOCK`), `unit`.
- **FR-002**: `q` MUST match name, sku, barcode, category.name, unit (OR within those fields).
- **FR-003**: Status filter MUST use the same derivation as item status (stock vs min).
- **FR-004**: Soft-deleted items MUST remain excluded.
- **FR-005**: Items page MUST expose search + category + status + unit filters and Clear.
- **FR-006**: Search MUST be debounced in the UI (~300ms).

## Success Criteria

- **SC-001**: Find an item by SKU or name in under 5 seconds on a 500-item catalog.
- **SC-002**: Filter Low stock returns only low-stock rows in manual check.

## Assumptions

- Catalog size for NHPAOWA is modest; server-side filter is sufficient (no pagination in v1).
- Global header search remains separate; Items page search is local to the list.
