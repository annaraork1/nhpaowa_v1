# Feature Spec: Inventory Management

**Feature branch:** `001-inventory-management`
**Status:** Draft
**Input:** Dashboard mockup — items, categories, suppliers, purchase orders,
stock in/out, transactions, alerts, and reporting for NHPAOWA's shared
facility inventory.

## 1. Overview

The Association Secretary and Facility/Maintenance staff currently track
shared inventory (electrical, plumbing, housekeeping, safety, garden,
maintenance supplies) informally. This feature gives them a single system
to record what's in stock, what's been consumed, who supplied it, and when
to reorder — with visibility for the Committee and audit-ready transaction
history.

## 2. User Personas

| Persona | Needs |
|---|---|
| Secretary / Admin | Full visibility: dashboard KPIs, all reports, approve POs, manage suppliers/settings |
| Treasurer / Committee Member | View stock value, PO spend, supplier totals; approve POs above a threshold |
| Facility/Maintenance Staff | Record stock in/out, view current stock levels, raise low-stock flags |
| Vendor/Supplier (future) | View their own PO status (out of scope for v1) |

## 3. User Scenarios & Acceptance Criteria

### 3.1 Dashboard Overview
- **Given** I am the Secretary, **when** I open Inventory, **then** I see
  Total Items, Total Stock Value, Pending Purchase Orders, and Low Stock
  Items as KPI cards, each reflecting current data (not cached >5 min).
- **Given** stock value by category, **when** I view the dashboard,
  **then** I see a category breakdown (donut) that sums to Total Stock
  Value.
- **Given** consumption history, **when** I view the dashboard, **then** I
  see the top 5 consumed items by quantity over the last 3 months.

### 3.2 Item & Category Management
- I can create, edit, and soft-delete an Item with: name, SKU, category,
  unit of measure, current stock, minimum stock level, unit price, and an
  optional photo.
- I can create/edit Categories (name, description) used to classify Items.
- An Item's Status (`In Stock` / `Low Stock` / `Out of Stock`) is derived
  automatically from `current_stock` vs `min_stock_level` — never manually
  set.
- **Items list filters & search** (see `017-items-list-filters`): I can
  search across name, SKU, barcode, category, and unit; filter by category,
  stock status, and unit; clear filters. Search is debounced.
- Item **View** modal shows catalog fields plus the **last 5 stock
  transactions** in a table (date/time, type, qty, stock before/after,
  who, warehouse, notes) for quick reference. On narrow viewports the
  shared transaction list uses cards (`019-mobile-responsive-lists`).

### 3.3 Supplier Management
- I can create, edit, and soft-delete a Supplier with: name, contact
  person, phone, email, address, GST number (optional).
- I can see, per supplier: total number of orders and total value ordered
  to date (Top Suppliers view).

### 3.4 Purchase Orders
- I can create a Purchase Order against one Supplier with one or more line
  items (Item + quantity + unit price); the system computes line subtotal
  and PO total.
- A PO has a status lifecycle: `Draft → Pending Approval → Approved →
  Ordered → Partially Received → Received → Closed` (and `Cancelled` from
  any pre-Received state).
- **Given** a PO's total exceeds an association-configured approval
  threshold, **when** it is submitted, **then** it requires
  Secretary/Treasurer approval before moving to `Ordered`.
- **Given** a PO has an Expected Date, **when** that date is within 3 days
  and the PO is not yet Received, **then** a "Purchase Order Due" alert is
  generated.

### 3.5 Stock Transactions (In/Out)
- I can record **Stock In** referencing either a received Purchase Order
  (auto-fills item/quantity) or a manual entry (donation, adjustment) with
  a reason.
- I can record **Stock Out** referencing the requesting department/purpose
  (e.g. "Maintenance Team", "Office Staff") and quantity.
- Every transaction captures: item, type (IN/OUT), quantity, user, date,
  and optional notes; transactions are immutable once recorded (corrections
  are new offsetting transactions, not edits).
- Recording a transaction updates the Item's `current_stock` atomically.
- **Stock page UX** (`018-stock-management-ux`): searchable item picker;
  context card (stock / min / status); mode-aware attention list
  (needs replenishment vs available to issue); recent transactions.
- **Transactions list filters** (`020-transactions-list-filters`): search
  across item / who / warehouse / notes; filter by type, warehouse, and
  date range; clear filters. Search is debounced.
- **Mobile responsive lists** (`019-mobile-responsive-lists`): entity lists
  use cards below `md` with actions always visible; Attendance history uses
  sticky Date + horizontal scroll.

### 3.6 Alerts & Notifications
The system generates these alert types automatically:
- **Low Stock Alert** — when `current_stock <= min_stock_level`.
- **Purchase Order Due** — per 3.4.
- **AMC Expiry Reminder** — for tracked Annual Maintenance Contracts
  (e.g. fire extinguisher servicing), configurable lead time (default 15
  days).
- **Stock Received** — confirmation when a PO-linked Stock In is recorded.
- **New Supplier Added** — informational, for Committee visibility.
- Alerts appear in a bell/notification panel with relative timestamps and
  can be marked read; a "View All" list shows full history.

### 3.7 Reporting
- Generate a stock valuation report (by category, by item) for a given
  date or range.
- Generate a consumption report (quantity out by item/category) for a
  configurable period.
- Generate a supplier spend report (total value ordered per supplier, per
  period).
- Reports are viewable on-screen and exportable (CSV/PDF — PDF may be
  deferred to a later iteration; CSV is required for v1).

## 4. Functional Requirements Summary

| ID | Requirement |
|---|---|
| FR-1 | System MUST support CRUD for Items, Categories, Suppliers |
| FR-1a | Items list MUST support freetext search across catalog columns and filters for category, stock status, and unit (`017-items-list-filters`) |
| FR-2 | System MUST support PO creation with multi-line items and a status lifecycle |
| FR-3 | System MUST support PO approval gating above a configurable threshold |
| FR-4 | System MUST record immutable Stock In/Out transactions and update stock levels atomically |
| FR-4a | Stock Management UI MUST provide searchable item picker, stock context, and needs-replenishment / available-to-issue guidance (`018-stock-management-ux`) |
| FR-4b | Transactions list MUST support freetext search and filters for type, warehouse, and date range (`020-transactions-list-filters`) |
| FR-4c | Web entity lists MUST use cards below `md` with actions always visible; comparison grids MAY use sticky first column (`019-mobile-responsive-lists`) |
| FR-5 | System MUST auto-derive Item status from stock levels |
| FR-6 | System MUST generate Low Stock, PO Due, AMC Expiry, Stock Received, and New Supplier alerts automatically |
| FR-7 | System MUST provide dashboard KPIs and category/consumption charts reflecting near-real-time data |
| FR-8 | System MUST provide stock valuation, consumption, and supplier spend reports, exportable as CSV |
| FR-9 | System MUST restrict write access per the platform's shared role model (Constitution §2.4) |
| FR-10 | System MUST retain a full audit trail of stock and PO changes |

## 5. Non-Functional Requirements
- Dashboard must load primary KPIs within 2 seconds for up to ~5,000 items
  and ~50,000 transactions.
- All monetary values in INR, stored as `numeric(12,2)`.
- Mobile-responsive web UI; native mobile app view is read-mostly for v1
  (staff can record stock in/out; full PO management is web-only for v1).

## 6. Out of Scope (v1)
- Vendor-facing self-service portal.
- Barcode/QR scanning for stock entry (candidate for v2).
- Multi-warehouse/location tracking (single shared store assumed for v1).
- Automated purchase requisition generation from low-stock alerts (v1 is
  alert-only; ordering remains a manual PO creation).

## 7. Open Questions
- Q1: Should PO approval threshold be a fixed platform setting or
  configurable per association? *(Assumption for v1: a single configurable
  setting per association.)*
- Q2: Does NHPAOWA want PDF export at launch, or is CSV sufficient for v1?
  *(Assumption: CSV only for v1, PDF deferred.)*
