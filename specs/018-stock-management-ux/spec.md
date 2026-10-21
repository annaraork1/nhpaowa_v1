# Feature Specification: Stock Management UX

**Feature Branch**: `018-stock-management-ux`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `001-inventory-management`  
**Input**: Stock Management uses a plain item `<select>` that does not scale, and staff cannot tell at a glance which SKUs need replenishment vs have stock to issue.

## Research summary

Industry inventory UIs (SKU.io, warehouse stock kits, ops UX guides) converge on:

1. **Typeahead item pickers** matching SKU / name / barcode (not native dropdowns for large catalogs).
2. **On-hand + reorder context** shown beside the picker (qty, min, status label — not color alone).
3. **Priority lists** for low/out-of-stock with a one-click path into Stock In.
4. **Recent movements** near the form so operators confirm what they just recorded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Searchable item picker (Priority: P1)

On Stock In/Out, staff pick an item via a **searchable combobox** (typeahead) querying the items API by name/SKU/barcode/category. Selecting an item shows a **context card**: current stock, min level, unit, status badge, category.

**Independent Test**: With 19+ items, typing a SKU fragment lists matches; selecting fills the form and shows stock context; Clear resets selection.

**Acceptance Scenarios**:

1. **Given** Stock page, **When** user types ≥1 character, **Then** matching items appear (max ~40) with stock qty and status.
2. **Given** a selected item, **When** context card renders, **Then** it shows stock, min, unit, and derived status.
3. **Given** a selection, **When** Clear is clicked, **Then** itemId clears and the card hides.

---

### User Story 2 - Needs stock vs available (Priority: P1)

Stock page shows an **attention panel** that depends on mode:

- **Stock In**: “Needs replenishment” — Out of stock and Low stock items (sorted out first, then low), with **Use** to prefill the picker.
- **Stock Out**: “Ready to issue” — **In stock only** (on-hand above minimum). Out of stock and low stock are excluded from this panel so it does not repeat the replenishment list; operators can still find limited-qty items via search if needed.

**Independent Test**: Seeded low/out items appear under Stock In attention; switching to Stock Out hides zero-stock SKUs from that panel.

**Acceptance Scenarios**:

1. **Given** OUT_OF_STOCK and LOW_STOCK items, **When** mode is Stock In, **Then** both appear under Needs replenishment with status labels.
2. **Given** mode Stock Out, **When** attention panel loads, **Then** only `IN_STOCK` items appear (no out-of-stock or low-stock rows).
3. **Given** an attention row, **When** Use is clicked, **Then** the item is selected in the picker and context card updates.

---

### User Story 3 - Recent transactions (Priority: P2)

Below the form, show the last ~15 stock transactions (item, type, qty, warehouse, time) so staff see confirmation of what was recorded.

**Independent Test**: Record Stock In → recent list shows the new IN row without leaving the page.

---

## Requirements *(mandatory)*

- **FR-001**: Stock page MUST use a searchable item picker (not a bare native select of the full catalog).
- **FR-002**: Picker MUST search via existing items list API (`q`) and show stock + status in results.
- **FR-003**: Selected item MUST show an informative stock context card (stock, min, unit, status, category).
- **FR-004**: Mode-aware attention panel MUST surface needs-replenishment (OUT+LOW for Stock In) or ready-to-issue (**IN_STOCK only** for Stock Out) with one-click Use.
- **FR-005**: Stock page MUST list recent transactions after record (invalidate on save).
- **FR-006**: Existing stock create API behaviour remains unchanged.
- **Related**: Full Transactions page search/filters → `020-transactions-list-filters`. Mobile card layout for txn lists → `019-mobile-responsive-lists`.

## Success Criteria

- **SC-001**: Staff can find and select an item by SKU in under 10 seconds on a 200+ item catalog.
- **SC-002**: Without opening Items, Secretary can identify at least the seeded low/out SKUs from the Stock In attention panel.

## Assumptions

- Reuses `017` items `q` filter; no new search endpoint required.
- Attention panel loads from `GET /items?status=` (or client filter of catalog meta) — v1 may combine two status queries.
- Barcode hardware scan deferred (picker text entry is enough for web v1).
