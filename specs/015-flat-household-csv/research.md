# Research: Flat & Household CSV

## Decision 1 — One row per flat

**Choice**: Single wide CSV with multi-value household fields.  
**Rationale**: Matches Secretary mental model (one unit one row); simpler Excel fill than row-type CSVs.  
**Rejected**: Separate household CSV (harder coordination); JSON upload (not Excel-friendly).

## Decision 2 — Empty household columns do not wipe

**Choice**: Only create/update when household field non-empty.  
**Rationale**: Partial owner-only updates must not erase vehicles.

## Decision 3 — Staff import → APPROVED

**Choice**: Same as Secretary UI creates.  
**Rationale**: Bulk load is authoritative office data, not resident PENDING submits.

## Decision 4 — Reuse parseCsv

**Choice**: Import `parseCsv` from staff CSV helper (or extract later).  
**Rationale**: BOM + quoted fields already handled.

## Decision 5 — Multi-value encoding (`|` + `:`)

**Choice**: Keep industry-common pattern:
- `|` separates **multiple records** in one cell (members, vehicles, pets, …) — same as NetSuite / Maildroppa multi-select CSV.
- `:` separates **fields inside one record** (role:name:phone, TYPE:reg:make:…).

**Example (two vehicles in one cell)**:
`FOUR_WHEELER:KA01AB1234:Hyundai:Creta:White:STK-1|TWO_WHEELER:KA01XY9999:Honda:Activa:Grey:`

**Rationale**: Excel-friendly single cell; no extra rows; export round-trips the same format.  
**Rejected**: One CSV row per member/vehicle ( explodes ~1705 flats); JSON-in-cell (error-prone in Excel); comma as multi-delimiter (conflicts with CSV commas).

## Decision 6 — In-template help + UI column guide

**Choice**:
1. Template CSV includes a `#HELP` row (tower cell starts with `#`) with per-column sample/format text; import **skips** any row whose `tower` starts with `#`.
2. Flats Import panel shows a **column guide** table (column → allowed values → sample) with native `title` hover tooltips.
3. `GET /flats/csv-guide` returns the same guide JSON so UI and template stay aligned.

**Rationale**: Pure CSV cannot host a second Excel sheet; `#` skip-rows are a common import convention; hover + visible samples answer “what do I type?” without leaving the page.  
**Rejected**: Separate PDF only (gets out of sync); forcing users to read contracts/api.md.
