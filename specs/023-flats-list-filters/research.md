# Research: 023 Flats List Filters

## Decision: Campus ID search parsing

**Choice**: Normalize query (trim, strip optional leading `T`/`t`). If remaining matches `^(\d{1,2})(\d{3})$`, treat as tower + flatNumber and add an exact `{ tower, flatNumber }` OR branch alongside existing contains matches.

**Why**: Display label is composed (`T` + tower + flatNumber); neither column alone contains `T21031`. Ambiguous 4–5 digit strings always encode 3-digit flat suffix per `022` numbering.

**Rejected**: Client-only filter of full list — too heavy vs server-side with 1705 rows already loaded via API.

## Decision: Filter set

**Choice**: Tower, Floor, Occupancy, Apartment type — mirrors spreadsheet mental model and Items filter density.

**Floor options**: When tower selected, use that tower’s `floors` from catalog; else union of floors from active towers (0…14).

## Decision: Empty states

**Choice**: `!filtersActive && !rows.length` → “No flats registered yet.”; else → “No flats match your search or filters.”

## Decision: Table alignment

**Choice**: Actions `<th>` and `<td>` both `text-right` + `whitespace-nowrap`; Actions column width via `w-px` so icons pack to the right edge (same pattern as other dense tables if present).
