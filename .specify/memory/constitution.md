# NHPAOWA Platform Constitution

**Applies to:** All modules in the NHPAOWA association platform monorepo
(Resident Chatbot & Dues, Inventory Management, and any module added later).

## 1. Purpose

NHPAOWA is building an association-owned digital platform to run its
residential apartment community: resident communication, dues/payment
reconciliation, and facility/inventory management — reducing dependency on
third-party tools like NoBrokerHood (NBH) while keeping NBH as an optional,
decoupled integration.

## 2. Core Principles

### 2.1 Modular Monorepo, Not a Monolith
- Each business capability (Resident/Chatbot, Dues & Payments, Inventory,
  future modules) is built as an independently deployable Node.js service
  living in its own workspace inside one monorepo.
- Services communicate over well-defined REST APIs (or an internal message
  bus for async events such as alerts/notifications) — never by reaching
  into another service's database directly.
- A shared `packages/` layer holds cross-cutting code: auth/session
  middleware, the Postgres client/ORM config, logging, the notification
  dispatcher, and shared UI components/design tokens for the React shell.

### 2.2 One Tech Stack, Applied Consistently
- **Backend:** Node.js + Express, JavaScript (no TypeScript unless a future
  amendment changes this).
- **Database:** PostgreSQL, one logical database per environment, with a
  dedicated schema per module (e.g. `inventory.*`, `dues.*`, `resident.*`)
  to keep modules decoupled at the data layer while allowing cross-schema
  joins for reporting.
- **Frontend (web):** React + JavaScript + Tailwind CSS, composed as a
  single admin/resident shell with module routes lazy-loaded per feature.
- **Mobile:** React Native (Android + iOS), sharing business logic/hooks
  with the web app where practical.
- **ORM:** Prisma (chosen for schema-first migrations that pair well with
  Spec Kit's spec → plan → tasks flow).
- **Auth:** Single shared identity/session service issuing JWTs consumed by
  every module; roles are platform-wide (see 2.4), not re-invented per
  module.

### 2.3 Spec-Driven Development Is Mandatory
- No feature is implemented without a `spec.md` (what/why), `plan.md`
  (how), and `tasks.md` (ordered, testable units of work) under
  `specs/<feature-number>-<feature-name>/`.
- Specs describe user-observable behavior and business rules;
  implementation detail belongs in the plan, not the spec.
- Every plan must include a "Constitution Check" section confirming it
  does not violate this document; deviations must be explicitly justified
  and recorded, not silently introduced.

### 2.4 Shared Role Model
Platform-wide roles, reused by every module's authorization rules:
- **Secretary / Committee Admin** — full access within their association.
- **Committee Member** — scoped access (e.g. Treasurer sees Dues +
  Inventory purchase approvals; Facility Manager sees Inventory + Stock).
- **Resident** — self-service views only (raise requests, view notices,
  view own dues) — no write access to Inventory.
- **Vendor/Supplier** (external, limited) — optional future portal access
  scoped to their own purchase orders/deliveries.
- **Staff (Maintenance/Office)** — operational data entry (stock in/out,
  item receipt) without financial or settings access.

### 2.5 Data Integrity & Audit
- Every state-changing action (stock in/out, PO approval, dues payment,
  chatbot escalation) is recorded as an immutable transaction/audit row —
  never hard-updated in place — so history and reports stay reconstructable.
- Money and quantity fields use fixed-precision types (`numeric` in
  Postgres), never floating point.
- Soft-delete (`deleted_at`) over hard delete for master data (Items,
  Suppliers, Categories) referenced by historical transactions.

### 2.6 Notifications Are a Shared Service
- Alerts (low stock, PO due, AMC expiry, dues reminders, chatbot
  escalations) all flow through one shared notification service/table, not
  a per-module reimplementation — so the dashboard bell and any future
  push/SMS/WhatsApp channel has a single source of truth.

### 2.7 Build for One Association First, Design for More
- Schema and APIs are scoped by an `association_id` from day one, even
  though NHPAOWA is the only tenant today — this avoids a painful
  multi-tenant retrofit if the platform is ever offered to other
  associations, without adding real complexity now.

### 2.8 Pragmatism Over Ceremony
- Favor the smallest deployable increment that delivers a usable feature to
  the Secretary/Committee. Defer non-essential polish (advanced analytics,
  fine-grained permissions beyond 2.4) to later iterations rather than
  blocking launch.

## 3. Amendment Process
Changes to this constitution require a written rationale in the same PR
that introduces the change, and must be reflected back into any `plan.md`
whose Constitution Check assumed the previous version.

**Version:** 1.0.0 | **Ratified:** 2026-09-19
