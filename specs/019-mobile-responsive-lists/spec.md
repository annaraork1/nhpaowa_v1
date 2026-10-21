# Feature Specification: Mobile Responsive Lists

**Feature Branch**: `019-mobile-responsive-lists`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `001-inventory-management`, association modules  
**Input**: Data tables forced horizontal scroll on phones; operators needed a readable mobile layout without losing actions.

## Clarifications (locked)

| # | Decision |
|---|----------|
| 1 | Scope: **all web tables** (inventory + association list pages) |
| 2 | Pattern: **mixed** — cards for entity lists; sticky first column + scroll for comparison-heavy grids (Attendance history) |
| 3 | Row actions: **always visible** on mobile cards (no overflow “⋯” menu) |
| 4 | Clients: **web responsive only** (React Native unchanged) |
| 5 | Breakpoint: **`md` (768px)** — cards below; tables from `md` up |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entity lists as cards on mobile (Priority: P1)

Below `md`, each row of an entity list renders as a card: identity title, key fields, status badge when present, and the same View/Edit/Delete (or workflow) actions as desktop — always visible in the card footer.

**Independent Test**: Open Items / Flats / Notices on a ≤767px viewport; no horizontal page scroll for the list; actions remain tappable without sideways scroll.

**Acceptance Scenarios**:

1. **Given** Items with rows, **When** viewport &lt; `md`, **Then** cards show name/SKU, stock fields, status, and RowActions.
2. **Given** Flats list, **When** on mobile, **Then** each card shows flat label, type, occupancy, members, and household/edit actions.
3. **Given** Attendance roster, **When** on mobile, **Then** punch controls (Check in / out / Mark absent) appear in the card actions area.

---

### User Story 2 - Comparison grid keeps sticky identity (Priority: P1)

Attendance **history** remains a table on all breakpoints. On narrow viewports, the first column (Date) stays sticky while other columns scroll horizontally, with a short “swipe for more columns” hint.

**Independent Test**: History tab on phone — Date stays visible while Status/Hours scroll sideways.

---

### User Story 3 - Shared helpers (Priority: P2)

Web uses shared `ResponsiveList`, `EntityCard`, `StickyScrollTable`, and `stickyColClass` so pages stay consistent.

**Independent Test**: Import path `modules/inventory/components/ResponsiveList.jsx` is used by inventory and association pages.

---

## Requirements *(mandatory)*

- **FR-001**: Entity list pages MUST use cards below `md` and tables from `md` up.
- **FR-002**: Mobile cards MUST show the same primary actions as desktop (always visible).
- **FR-003**: Attendance history MUST use sticky first column + horizontal scroll (not cards).
- **FR-004**: Stock transactions list MUST keep existing card/table split (already shipped in `018`).
- **FR-005**: Noc / Moves card UIs and Flats CSV help table are out of scope (already non-table or reference-only).
- **FR-006**: React Native screens are out of scope for this feature.

## Covered pages

| Area | Pages |
|------|--------|
| Inventory | Items, Users, Suppliers, Purchase Orders, AMC, Barcodes, Dashboard widgets, Stock/Transactions (existing cards) |
| Association | Flats, Notices, Board (roles + members), Attendance (categories, roster, leave → cards; history → sticky) |

## Success Criteria

- **SC-001**: On a phone-width viewport, primary inventory and association lists do not require horizontal scroll to read identity + act.
- **SC-002**: Attendance history still supports column scan via sticky Date + scroll.

## Assumptions

- “Comparison-heavy” is limited to Attendance history for v1; other dense tables use cards.
- Desktop/tablet ≥ `md` retains full tables.
