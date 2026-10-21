# Research: Mobile Responsive Lists

Industry patterns for dense data on phones:

1. **Cards / stacked records** — best when users read one entity at a time (orders, flats, items).
2. **Sticky first column + horizontal scroll** — best when column alignment / comparison still matters.
3. **Priority columns + expand** — hide secondary columns until expand (not chosen for v1).
4. **CSS stacked table (`data-label`)** — keep one `<table>`; weaker cross-row compare.

**Choice for NHPAOWA:** mixed — cards for entity lists; sticky+scroll for Attendance history. Actions always visible on cards. Breakpoint `md`. Web only.
