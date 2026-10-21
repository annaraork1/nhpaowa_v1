# Implementation Plan: Inventory Management

**Feature branch:** `001-inventory-management`
**Spec:** `./spec.md`
**Constitution:** `../../memory/constitution.md`

## 1. Technical Context
- **Language/Runtime:** Node.js 20 LTS, JavaScript (ES2022+)
- **Backend framework:** Express
- **ORM:** Prisma, schema `inventory`
- **Database:** PostgreSQL 15+
- **Frontend:** React 18 (JS) + Tailwind CSS, Recharts for the donut/bar
  charts, React Query for data fetching/caching
- **Auth:** JWT issued by the shared platform identity service (consumed
  via middleware, not re-implemented here)
- **File storage:** Item photos → S3-compatible bucket (or local disk in
  dev), referenced by URL
- **Testing:** Jest + Supertest (API), React Testing Library (frontend)

## 2. Constitution Check
- ✅ Own module/schema (`inventory.*`), no direct cross-schema DB access —
  reporting joins happen via API composition or a read-only reporting view.
- ✅ Uses shared auth/role model (§2.4) — no bespoke roles introduced.
- ✅ Uses shared notification service (§2.6) for all alert types.
- ✅ All transactions immutable/append-only (§2.5); stock corrections are
  offsetting entries.
- ✅ Scoped by `association_id` (§2.7) on every table.
- Documented deviation (v1 local): Prisma models use the Postgres `public`
  schema (single DB `nhpaowa`) instead of multi-schema `inventory.*` /
  `notifications.*`, to match local `DATABASE_URL=.../nhpaowa?schema=public`.
  Module boundaries remain enforced at the API/package layer. Revisit
  multi-schema when a second module lands in the same database.

## 3. Project Structure (within monorepo)
```
services/
  inventory-service/
    src/
      routes/          # items, categories, suppliers, purchase-orders, stock, reports
      controllers/
      services/        # business logic (stock level derivation, PO lifecycle, alert triggers)
      prisma/
        schema.prisma  # inventory schema models
        migrations/
      middleware/       # auth passthrough, role guards
      jobs/             # scheduled: AMC expiry scan, PO-due scan
    tests/
apps/
  web/
    src/
      modules/inventory/
        pages/          # Dashboard, Items, Categories, Suppliers, PurchaseOrders, StockManagement, Transactions, Reports, Settings
        components/     # KPI cards, StockValueDonut, TopConsumedBarChart, AlertsPanel, DataTable
        hooks/          # useItems, usePurchaseOrders, useStockTransactions
        api/            # inventory API client
  mobile/
    src/screens/inventory/   # StockIn, StockOut, ItemLookup (v1 subset)
packages/
  shared-notifications/
  shared-auth/
  shared-ui/
```

## 4. Data Model / ERD

### Entities

**Category**
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `name`, `description`
- `created_at`, `updated_at`, `deleted_at`

**Item**
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `category_id` (FK → Category)
- `name`, `sku` (unique per association)
- `unit` (e.g. "pcs", "kg", "litre")
- `current_stock` (numeric)
- `min_stock_level` (numeric)
- `unit_price` (numeric(12,2))
- `photo_url` (nullable)
- `status` — computed: `IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK`
- `created_at`, `updated_at`, `deleted_at`

**Supplier**
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `name`, `contact_person`, `phone`, `email`, `address`, `gst_number`
- `created_at`, `updated_at`, `deleted_at`

**PurchaseOrder**
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `po_number` (unique, human-readable e.g. `PO-2026-0042`)
- `supplier_id` (FK → Supplier)
- `status` (enum: DRAFT, PENDING_APPROVAL, APPROVED, ORDERED,
  PARTIALLY_RECEIVED, RECEIVED, CLOSED, CANCELLED)
- `order_date`, `expected_date`
- `total_amount` (numeric(12,2), derived from line items)
- `created_by` (FK → shared User), `approved_by` (nullable)
- `created_at`, `updated_at`

**PurchaseOrderItem**
- `id` (uuid, PK)
- `purchase_order_id` (FK → PurchaseOrder)
- `item_id` (FK → Item)
- `quantity`, `unit_price`, `subtotal` (numeric(12,2))
- `quantity_received` (numeric, default 0)

**StockTransaction**
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `item_id` (FK → Item)
- `type` (enum: IN, OUT)
- `quantity` (numeric)
- `reference_type` (enum: PURCHASE_ORDER, MANUAL, ADJUSTMENT, ISSUE)
- `reference_id` (nullable, e.g. PurchaseOrder.id)
- `performed_by` (FK → shared User)
- `notes` (nullable)
- `transaction_date`
- `created_at` (immutable — no `updated_at`)

**AmcContract** (supports "AMC Expiry Reminder")
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `item_id` (nullable FK → Item, for asset-linked AMCs e.g. fire
  extinguisher)
- `vendor_id` (FK → Supplier)
- `description`, `start_date`, `end_date`
- `reminder_lead_days` (default 15)
- `status` (enum: ACTIVE, EXPIRED, RENEWED)

**Alert** (may live in shared notification service, referenced here)
- `id` (uuid, PK)
- `association_id` (uuid, FK)
- `type` (enum: LOW_STOCK, PO_DUE, AMC_EXPIRY, STOCK_RECEIVED, NEW_SUPPLIER)
- `severity` (enum: INFO, WARNING, CRITICAL)
- `related_entity_type`, `related_entity_id`
- `message`
- `is_read` (bool, default false)
- `created_at`

### Relationships
- Category `1 —— N` Item
- Supplier `1 —— N` PurchaseOrder
- PurchaseOrder `1 —— N` PurchaseOrderItem `N —— 1` Item
- Item `1 —— N` StockTransaction
- Item `1 —— N` AmcContract (optional, nullable FK)
- Supplier `1 —— N` AmcContract
- shared User `1 —— N` StockTransaction (performed_by)
- shared User `1 —— N` PurchaseOrder (created_by / approved_by)

### Derived / Computed
- `Item.status` — computed at read time (or via trigger) from
  `current_stock` vs `min_stock_level`; never written directly by clients.
- `PurchaseOrder.total_amount` — sum of `PurchaseOrderItem.subtotal`,
  recalculated on line item change.
- Dashboard `Total Stock Value` — `SUM(Item.current_stock * Item.unit_price)`.
- `Stock Value by Category` — same, grouped by `Category`.
- `Top 5 Consumed Items` — `SUM(StockTransaction.quantity) WHERE type=OUT`
  grouped by item over a rolling 3-month window.

## 5. API Surface (high-level)
```
GET/POST/PUT/DELETE   /api/inventory/categories
GET/POST/PUT/DELETE   /api/inventory/items
GET/POST/PUT/DELETE   /api/inventory/suppliers
GET/POST/PUT          /api/inventory/purchase-orders
POST                  /api/inventory/purchase-orders/:id/approve
POST                  /api/inventory/purchase-orders/:id/receive
GET/POST              /api/inventory/stock-transactions
GET                   /api/inventory/dashboard/summary
GET                   /api/inventory/dashboard/stock-value-by-category
GET                   /api/inventory/dashboard/top-consumed
GET                   /api/inventory/alerts
PATCH                 /api/inventory/alerts/:id/read
GET                   /api/inventory/reports/valuation
GET                   /api/inventory/reports/consumption
GET                   /api/inventory/reports/supplier-spend
```
All routes scoped by the authenticated user's `association_id`; write
routes enforce role checks per Constitution §2.4.

## 6. Background Jobs
- **AMC expiry scan** (daily) — creates `AMC_EXPIRY` alerts inside each
  contract's `reminder_lead_days` window.
- **PO due scan** (daily) — creates `PO_DUE` alerts for open POs within 3
  days of `expected_date`.
- **Low stock scan** — can be event-driven (checked on every StockTransaction
  write) rather than a scheduled job, since it's cheap to evaluate inline.

## 7. Platform Integration Notes
- Sits alongside the existing Resident Chatbot & Dues module as its own
  workspace/service in the NHPAOWA monorepo; shares the auth, notification,
  and shared-UI packages rather than duplicating them.
- The React web shell adds an "Inventory" section to the existing
  sidebar/nav, gated by role.
- No direct dependency on the Dues module; the only shared concepts are
  User identity and the notification pipeline.

## 8. Phased Delivery
- **Phase 0 (this doc):** Spec + plan agreed.
- **Phase 1:** Data model + migrations, Items/Categories/Suppliers CRUD,
  basic dashboard shell.
- **Phase 2:** Purchase Orders + approval workflow, Stock In/Out
  transactions, stock-derived status.
- **Phase 3:** Alerts (all 5 types) + notification integration.
- **Phase 4:** Reports (valuation, consumption, supplier spend) + CSV
  export.
- **Phase 5:** Mobile (React Native) Stock In/Out screens.

See `tasks.md` for the concrete task breakdown Cursor/Claude Code should
execute against, phase by phase.
