# Tasks: Inventory Management

**Input:** `plan.md`, `spec.md` in this directory  
**Status:** Spec gaps closed 2026-09-19 (AMC UI, photos, emergency PO,
auto-close, report filters, tests, mobile role hardening).

## Phase 1 — Foundation & Master Data

- [x] T001–T007, T009–T013
- [x] T008 Jest + Supertest tests for master data / roles / stock

## Phase 2 — Purchase Orders & Stock Transactions

- [x] T014–T019, T021–T024
- [x] T020 Jest: PO lifecycle, emergency post-approve, receive→CLOSED, stock
- [x] Emergency PO path + post-approval (`isEmergency`, `pendingPostApproval`)
- [x] Full receive auto-closes PO (`CLOSED`)

## Phase 3 — Alerts & Notifications

- [x] T025–T032
- [x] T033 Covered via stock-out / PO / supplier create paths in tests + smoke

## Phase 4 — Dashboard & Reports

- [x] T034–T043
- [x] T044 Report aggregation exercised via smoke + live API
- [x] Report UI date-range filters (`from` / `to`)
- [x] Items list search + category / stock status / unit filters (`017-items-list-filters`)
- [x] Stock Management UX — searchable picker, needs-replenishment panel (`018-stock-management-ux`)

## Phase 5 — Mobile (React Native / Expo)

- [x] T045–T048
- [x] Role switcher + visible API base URL for device wiring

## Cross-Cutting

- [x] T049 Seed script
- [x] T050 E2E smoke: `services/inventory-service/scripts/e2e-smoke.mjs`
- [x] T051 Constitution note (public schema deviation documented)
- [x] AMC CRUD API + web UI (`/amc`) + renew/expire
- [x] Item photo upload (`POST /uploads`) + Items UI thumbnails
- [x] Global search

## Implemented (previously deferred)

- [x] Multi-warehouse + WarehouseStock + stock/PO receive by location
- [x] Barcode on items + lookup + Code128 PNG labels
- [x] Vendor portal (`/api/inventory/vendor`, web `/vendor`)
- [x] Purchase requisitions + auto-PR on low stock (Settings)
- [x] PDF export for reports (valuation / consumption / supplier spend)
- [x] Production identity service (`:4000` login/JWT; stub remains when `AUTH_STRICT=false`)
