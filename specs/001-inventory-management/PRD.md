# PRD: NHPAOWA Inventory Management Module

**Version:** 1.0 · **Status:** Draft · **Owner:** Secretary/Committee
**Related:** `specs/001-inventory-management/spec.md` (Spec Kit spec),
`specs/001-inventory-management/plan.md` (technical plan)

## 1. Problem Statement
NHPAOWA maintains shared physical inventory — electrical fittings,
plumbing parts, cleaning chemicals, safety equipment, garden supplies —
used by maintenance staff and vendors across the community. Today this is
tracked informally (registers, WhatsApp, memory), which leads to:
- Stock-outs discovered only when someone needs an item urgently
- No visibility into how much money is tied up in stock, or where it goes
- No record of who consumed what, when, or why
- Missed reorder points and missed AMC (Annual Maintenance Contract)
  renewals, e.g. fire extinguisher servicing lapsing unnoticed
- No easy way for the Committee to see supplier performance or spend

## 2. Goals
1. Give the Secretary/Committee a real-time view of stock levels and value.
2. Eliminate stock-outs on critical items via automatic low-stock alerts.
3. Create an auditable trail of every unit received and consumed.
4. Formalize purchasing through a Purchase Order workflow with approval.
5. Surface AMC renewals and pending deliveries before they're missed.
6. Provide spend/consumption reporting for budgeting and vendor reviews.

## 3. Success Metrics
| Metric | Target |
|---|---|
| Stock-out incidents on tracked items | Reduce to near zero within 2 months of launch |
| Time to answer "how much X do we have / what did it cost us" | Under 30 seconds via dashboard, vs. manual lookup today |
| % of stock movement captured digitally | ≥95% within first quarter |
| AMC renewals missed | Zero, once reminders are active |
| Committee adoption | Secretary + at least 2 committee members actively using it monthly |

## 4. Non-Goals (v1)
- Vendor self-service portal
- Barcode/QR-based stock entry
- Multi-location/warehouse tracking (single shared store only)
- Auto-generating purchase requisitions from alerts (alerts inform a
  human decision; they don't auto-order)

## 5. Personas & Jobs-to-be-Done
| Persona | Job to be done |
|---|---|
| **Secretary** | "I need to see, at a glance, what we have, what we owe, and what needs attention." |
| **Treasurer/Committee** | "I need to approve spend and see where money is going." |
| **Maintenance/Office Staff** | "I need to quickly log what I took out or received, without paperwork." |
| **Supplier** (indirect, v2+) | "I'd like to know the status of my order." |

## 6. Feature Set (mapped from the approved dashboard design)

### 6.1 Dashboard
- KPI cards: Total Items, Total Stock Value, Pending Purchase Orders, Low
  Stock Items (each with a trend/delta where meaningful)
- Stock Value by Category (donut chart)
- Top 5 Consumed Items, last 3 months (bar chart)
- Alerts & Notifications panel with "View All"
- Recent Inventory Items, Recent Transactions, Top Suppliers, Upcoming
  Purchase Orders — at-a-glance tables
- Quick Actions: Add Item, Create PO, Record Stock In, Record Stock Out,
  Add Supplier, Generate Report

### 6.2 Items & Categories
- Full CRUD on Items (name, SKU, category, unit, stock levels, price,
  photo) and Categories
- Auto-computed status: In Stock / Low Stock / Out of Stock

### 6.3 Suppliers
- Full CRUD on Suppliers
- Per-supplier order count and total value (Top Suppliers)

### 6.4 Purchase Orders
- Multi-line PO creation against a Supplier
- Status lifecycle with an approval gate above a configurable spend
  threshold
- Linked receipt → auto stock-in

### 6.5 Stock Management (In/Out)
- Manual and PO-linked Stock In
- Stock Out with requesting department/purpose
- Immutable transaction log; stock levels update atomically
- Searchable item picker (SKU/name/barcode); on-hand / min / status context
- Needs-replenishment list for Stock In; available-to-issue for Stock Out

### 6.6 Alerts & Notifications
- Low Stock, Purchase Order Due, AMC Expiry Reminder, Stock Received, New
  Supplier Added — generated automatically, shown in-app with timestamps

### 6.7 Reports
- Stock valuation, consumption, and supplier spend, filterable by date
  range, exportable to CSV

## 7. Key User Flows
1. **Reorder flow:** Item hits min stock → Low Stock alert fires →
   Secretary reviews → creates PO → (if above threshold) Treasurer
   approves → PO marked Ordered → goods arrive → Stock In recorded against
   the PO → PO auto-closes when fully received → Stock Received alert
   fires.
2. **Day-to-day consumption flow:** Maintenance staff takes items → logs
   Stock Out with purpose/department → stock level decrements → if it
   crosses the min threshold, Low Stock alert fires.
3. **AMC flow:** Secretary registers an AMC (e.g. fire extinguisher
   servicing) with vendor and end date → system reminds at configurable
   lead time before expiry → Secretary renews or replaces.

## 8. Release Plan
| Phase | Scope |
|---|---|
| Phase 1 | Items, Categories, Suppliers CRUD + dashboard shell |
| Phase 2 | Purchase Orders + approval workflow + Stock In/Out |
| Phase 3 | Alerts (all 5 types) |
| Phase 4 | Reports + CSV export |
| Phase 5 | Mobile Stock In/Out (React Native) |

## 9. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Staff don't log stock movement consistently, data goes stale | Keep Stock In/Out as a 2-tap Quick Action; mobile support in Phase 5 |
| Approval threshold blocks urgent purchases | Allow an "emergency" PO path with post-hoc approval (flag for discussion) |
| Low adoption if UI is unfamiliar | Reuse the already-approved dashboard design as the baseline UI |

## 10. Open Questions
- Should there be an emergency/expedited PO path that bypasses approval
  with mandatory post-approval sign-off?
- Is CSV export sufficient at launch, or is PDF required for board
  reporting? (Assumed CSV-only for v1.)
- Who besides the Secretary should hold approval rights by default —
  Treasurer only, or any Committee member above the threshold?
