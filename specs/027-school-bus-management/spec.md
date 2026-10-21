# Feature Specification: School Bus Management

**Feature Branch**: `027-school-bus-management`  
**Created**: 2026-09-24  
**Updated**: 2026-09-24 (RBAC: Security Staff gate + reports view)  
**Status**: Active  
**Input**: Digitize NHPAOWA gate school-bus paper register (~50 movements/day, ~25 schools); stream congestion via batches/slots; immutable IN/OUT logging; data-quality alerts; committee CSV reports; Resident read-only today view. Role split: Security Staff operate the gate; registry and slot mapping stay with admin/secretary-level roles.

## Out of scope (v1)

Live GPS, per-child RFID, driver mobile app, route geofence alerts.

## User Scenarios & Testing

### User Story 1 - School & bus registry (Priority: P1)

Secretary (or Superadmin / Estate Manager / Security Head) maintains schools and recurring buses (registration, driver/conductor contacts, home school). Security Staff do **not** access this screen by default.

**Acceptance**: Create school + bus; list scoped by association; soft-deactivate hides from gate roster; Security Staff cannot open Schools & buses or call registry create/update APIs.

### User Story 2 - Batches & slots (Priority: P1)

Secretary (or Superadmin / Estate Manager / Security Head) defines AM/PM batches with bay capacity (default 3) and assigns buses to staggered slots. Security Staff do **not** access slot mapping by default.

**Acceptance**: Batch is PICKUP or DROPOFF; slot links bus+batch+assigned time; live gate flags when occupancy ≥ bay capacity; Security Staff have no Batches & slots nav item.

### User Story 3 - Gate IN/OUT (Priority: P1)

Security Staff (and other gate-capable roles) tap mandatory **PICKUP** or **DROP-OFF**, then IN / OUT (auto timestamps). **Child count once per trip**: PICKUP enters children on **OUT**; DROP-OFF enters children on **IN**. Trips are append-only. This is the **default school-bus feature** for Security Staff.

**Acceptance**: IN disabled until direction selected; one child-count field at the direction-appropriate tap; no edit of past rows; corrections = new row + notes; Security Staff default menu includes Bus gate among school-bus features.

### User Story 4 - Data-quality alerts (Priority: P1)

System flags unmatched OUT, AM/PM mismatch / PM child count > AM, long wait, off-slot arrival, bay capacity exceeded — via shared notification bell.

### User Story 5 - Committee / ops reports (Priority: P2)

On-screen daily bus & child-count report plus CSV/PDF: reconciliation, wait times, congestion. Security Staff may **view** reports (read-only); they cannot change registry or slots from reports.

**Acceptance**: Security Staff can open Bus reports and see date-scoped data; no Schools/Batches actions from that role’s default access.

### User Story 6 - Resident today view (Priority: P2)

Residents see today’s scheduled buses and gate status (school, direction, slot, expected/in/left) — no child counts or driver phones.

## Requirements

- **FR-001**: Dedicated `bus-service` with schema `bus_tracking`; every table has `association_id`.
- **FR-002**: School, Bus, GateBatch, BusSlot, GateTransaction, BusSetting as specified in data-model.
- **FR-003**: GateTransaction append-only (created_at only); optional `correctsTransactionId`.
- **FR-004**: Mandatory `tripDirection` PICKUP|DROPOFF from UI before IN.
- **FR-005**: Live bay occupancy vs batch capacity; hold-at-approach when at capacity.
- **FR-006**: Alerts via `@nhpaowa/shared-notifications` into shared `alerts` table.
- **FR-007**: CSV/PDF reports for daily trips, reconciliation, wait times, congestion.
- **FR-008**: Two permission resources:
  - `schoolBus` — gate logging (view + createEdit for IN/OUT) and report **view**; Resident today view.
  - `schoolBusAdmin` — schools, buses, batches, slots, settings, registry CSV/PDF import/export (view + createEdit).
- **FR-009**: Association calendar day (Asia/Kolkata) for `tripDate`.
- **FR-010**: Default role matrix:
  - **Security Staff**: `schoolBus` VIEW_EDIT; `schoolBusAdmin` NONE (Bus gate + reports view; no registry/slots).
  - **Superadmin, Secretary, Estate Manager, Security Head**: both resources VIEW_EDIT.
  - **Treasurer, Committee**: `schoolBus` VIEW only; `schoolBusAdmin` NONE.
  - **Resident**: `schoolBus` VIEW (today endpoint only in UI).
- **FR-011**: Single child count per trip — PICKUP at OUT; DROP-OFF at IN. Store as `childCount` only.
- **FR-012**: When both directions exist for a bus on the same day, compare Pickup OUT count vs Drop-off IN count; show visual warning on gate cards and daily reports; raise `BUS_AM_PM_MISMATCH` alert when they differ.

## Success Criteria

- **SC-001**: Guard logs a full AM pickup IN→OUT in under 15 seconds.
- **SC-002**: Missing OUT / AM–PM mismatch appear as alerts by end-of-day job.
- **SC-003**: Resident can open Today’s buses without seeing child counts.
- **SC-004**: Fresh Security Staff login shows Bus gate (and may show Bus reports) but not Schools & buses or Bus batches.
- **SC-005**: Security Staff receive Forbidden when calling school/bus/batch/slot create or update APIs.
