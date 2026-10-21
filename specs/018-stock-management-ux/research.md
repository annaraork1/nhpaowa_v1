# Research: Stock Management UX

## Decision 1 — Typeahead over native `<select>`

**Choice**: Combobox calling `GET /items?q=` (same as 017).  
**Rationale**: Native selects fail past ~50–100 options; industry pickers match SKU/name/barcode.  
**Rejected**: Infinite scroll select; loading all items into a client filter only (still works as fallback meta).

## Decision 2 — Mode-aware attention lists

**Choice**:
- **Stock In** → Needs replenishment: `OUT_OF_STOCK` then `LOW_STOCK`.
- **Stock Out** → Ready to issue: **`IN_STOCK` only** (on-hand above minimum). Exclude out-of-stock and low-stock from this panel.

**Rationale**: Issue flows should surface items that can be given out safely. Leading Stock Out with the same low/out list as Stock In confuses operators (research: hide OOS from issue/sellable pickers; available qty &gt; reorder point = healthy). Low-stock can still be found via search if the last units must be issued.  
**Rejected**: Stock Out = all `currentStock > 0` sorted low-first (looks identical to replenishment list).

## Decision 3 — Context card + recent txns

**Choice**: Show derived status + stock/min next to form; recent 15 transactions below.  
**Rationale**: Reduces wrong-item / over-issue mistakes; confirms immutable log after save.
