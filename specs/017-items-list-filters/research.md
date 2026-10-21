# Research: Items List Filters

## Decision 1 — Server-side query params on existing GET /items

**Choice**: Extend `GET /items?q=&categoryId=&status=&unit=` rather than a new endpoint.  
**Rationale**: Matches Flats/staff list patterns; keeps one list contract.  
**Rejected**: Client-only filter of full dump (wastes bandwidth as catalog grows).

## Decision 2 — Status filter after derive (or equivalent predicates)

**Choice**: Apply stock predicates consistent with `deriveItemStatus` (≤0 out; ≤min low; else in).  
**Rationale**: Status is never stored; filter must match StatusBadge.

## Decision 3 — Search fields

**Choice**: name, sku, barcode, category.name, unit.  
**Rationale**: Covers every text column shown on the Items table / detail drawer.
