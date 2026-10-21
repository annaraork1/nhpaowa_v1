# Research: 020 Transactions List Filters

Mirrors `017-items-list-filters`:

- Server-side Prisma `where` + optional post-filter only when needed.
- Debounced client search; Clear resets all controls.
- Stock log fields that matter for lookup: item identity, who, warehouse, type, date, notes/department/ref.

Date range uses inclusive `YYYY-MM-DD` → start-of-day / end-of-day UTC parsing consistent with other inventory date filters if present; otherwise `new Date(from)` and end-of-day for `to`.
