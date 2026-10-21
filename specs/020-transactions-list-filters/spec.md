# Feature Specification: Transactions List Search & Filters

**Feature Branch**: `020-transactions-list-filters`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `001-inventory-management`, `018-stock-management-ux`  
**Input**: Transactions page loads a flat log (limit 200) with no search/filters; Secretaries need to find a specific stock movement quickly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Freetext search (Priority: P1)

Authorized user types in a search box on Transactions. Results match **item name, item SKU, performed-by name, department, notes, warehouse name, or reference type** (case-insensitive contains). Empty query returns the unfiltered set (subject to other filters and limit).

**Independent Test**: Seed an OUT txn with notes “Lift lobby paint”; search `paint` and SKU fragment each return it; unrelated query returns empty list (not error).

**Acceptance Scenarios**:

1. **Given** transactions, **When** user searches an item name substring, **Then** matching rows appear.
2. **Given** a performed-by name, **When** user searches that name, **Then** their movements appear.
3. **Given** search text, **When** user clears it, **Then** the list restores (with remaining filters).

---

### User Story 2 - Structured filters (Priority: P1)

Transactions page offers filters: **Type** (IN / OUT), **Warehouse**, **Date from**, **Date to**. Filters combine with search (AND). A **Clear filters** control resets search + filters.

**Independent Test**: Filter Type=OUT shows only OUT; date range further narrows; Clear restores default list.

**Acceptance Scenarios**:

1. **Given** mixed IN/OUT rows, **When** user filters Stock Out, **Then** only `OUT` rows show.
2. **Given** multiple warehouses, **When** user picks one warehouse, **Then** only that warehouse’s txns show.
3. **Given** from/to dates, **When** applied, **Then** only `transactionDate` within the inclusive range (association local calendar day bounds) show.
4. **Given** active search + filters, **When** Clear is used, **Then** all controls reset and default list loads.

---

### User Story 3 - Debounced UX & empty states (Priority: P2)

Search input is debounced (~300ms). Empty-state copy distinguishes “no transactions yet” vs “no matches for filters”. Result count (and Updating…) mirrors Items filters UX. List still uses cards below `md` / table from `md` (`019`).

**Independent Test**: Rapid typing settles to one request; zero matches shows clear message; mobile cards still render.

---

## Requirements *(mandatory)*

- **FR-001**: `GET /stock-transactions` MUST accept `q`, `type` (`IN`|`OUT`), `warehouseId`, `from`, `to`, plus existing `itemId` and `limit`.
- **FR-002**: `q` MUST match item.name, item.sku, performedByName, department, notes, warehouse.name, referenceType (OR within those fields).
- **FR-003**: `from` / `to` MUST filter `transactionDate` as inclusive calendar-day bounds (ISO date `YYYY-MM-DD`).
- **FR-004**: Transactions page MUST expose search + type + warehouse + date range + Clear.
- **FR-005**: Search MUST be debounced in the UI (~300ms).
- **FR-006**: Default limit remains 200 unless overridden; order remains `transactionDate` desc.
- **FR-007**: Stock page “recent transactions” MAY keep an unfiltered short list (no requirement to add the full filter bar there).

## Success Criteria

- **SC-001**: Find a known transaction by item name or notes in under 5 seconds on a 200-row window.
- **SC-002**: Type=OUT + date range returns only matching OUT rows in manual check.

## Assumptions

- Association transaction volume fits a 200-row window for v1 (same as today); pagination deferred.
- Warehouse filter uses existing warehouses list endpoint.
- Mobile RN transaction history (if any) is out of scope for this feature.
