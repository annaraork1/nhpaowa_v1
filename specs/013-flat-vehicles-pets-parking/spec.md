# Feature Specification: Flat Vehicles, Pets, Parking & Household Register

**Feature Branch**: `013-flat-vehicles-pets-parking`  
**Created**: 2026-09-21  
**Status**: Implemented (UI View/Edit household integrated)  
**Input**: Collect vehicle, pet, and parking details on flats; research-led extras (emergency contacts, access devices); clarifications Q1=B, Q2=A, Q3=B, Q4=B, Q5=A+C. View must show saved household data; Edit must offer changing it.

**Extends**: [005-flat-owners](../005-flat-owners/spec.md)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Named parking allotments (Priority: P1)

Secretary maintains a parking slot inventory (unique label per association, e.g. basement/stilt/open bay id) and allots slots to flats. Flat’s entitled slot count remains a guide; allotments are the operational truth for gate staff.

**Why this priority**: Foundation for linking vehicles and resolving parking disputes.

**Independent Test**: Create slot `B1-12`, allot to Tower 1 Flat 101; list shows allotment; cannot create duplicate label.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they create parking slot `B1-12`, **Then** it appears in the inventory unallotted.
2. **Given** a flat, **When** they allot `B1-12` to that flat, **Then** the flat’s parking list shows it.
3. **Given** duplicate slot label, **When** they save, **Then** the system rejects it.

---

### User Story 2 - Register vehicles with RC upload (Priority: P1)

Secretary registers vehicles against a flat (type, registration number, make/model/colour, sticker/RFID) and may attach an RC document scan. Vehicle may link to an allotted parking slot of that flat.

**Why this priority**: Core request for gate accountability.

**Independent Test**: Add 4-wheeler KA-01-AB-1234 to a flat with RC upload; list shows vehicle and downloadable RC.

**Acceptance Scenarios**:

1. **Given** a flat, **When** admin adds a vehicle with registration number, **Then** it appears under that flat.
2. **Given** a vehicle, **When** admin uploads RC file, **Then** the file is stored and retrievable.
3. **Given** an allotted slot on the flat, **When** admin links the vehicle to that slot, **Then** the link is visible on both vehicle and parking views.

---

### User Story 3 - Register pets with vaccination dates (Priority: P1)

Secretary records pets per flat (species, name, breed, notes) and vaccination / rabies valid-till dates.

**Independent Test**: Add dog “Bruno” with rabies valid till next year; list shows dates.

**Acceptance Scenarios**:

1. **Given** a flat, **When** admin adds a pet with species and name, **Then** it appears under that flat.
2. **Given** a pet, **When** rabies valid-till is set, **Then** it displays on the register.

---

### User Story 4 - Emergency contacts & access devices (Priority: P1)

Secretary records emergency contacts (name, phone, relationship) and access devices (fob / RFID / remote / sticker identifier with issued/returned status) per flat.

**Independent Test**: Add emergency contact and one fob id; both list under flat.

**Acceptance Scenarios**:

1. **Given** a flat, **When** admin adds an emergency contact, **Then** it is listed.
2. **Given** a flat, **When** admin issues an access device with identifier, **Then** status ACTIVE is shown; marking RETURNED updates status.

---

### User Story 5 - Resident submit for approval (Priority: P2)

Residents linked to a flat may submit vehicle/pet/emergency/access (and optionally parking link requests) that remain PENDING until Secretary approves or rejects. Secretary/Superadmin direct creates are APPROVED immediately. Staff have a **Pending** tab per flat and an **association-wide Pending approvals** queue on the Flats page. Sample seed: `resident@nhpaowa.local` linked to Tower 1 / 101 (`014-resident-portal`).

**Why this priority**: Matches hybrid Q5 A+C without blocking admin ops.

**Independent Test**: Resident submits a vehicle → PENDING; Secretary approves → APPROVED and visible as active register entry.

**Acceptance Scenarios**:

1. **Given** a resident linked to a flat, **When** they submit a vehicle, **Then** status is PENDING and not treated as gate-approved until approved.
2. **Given** a PENDING item, **When** Secretary approves, **Then** status becomes APPROVED.
3. **Given** a PENDING item, **When** Secretary rejects with reason, **Then** status becomes REJECTED with reason stored.

---

### User Story 6 - View & edit household from flat register (Priority: P1)

On the Flats register, **View** shows the flat’s core details plus all saved household data (parking allotments, vehicles with RC link, pets with vaccine dates, emergency contacts, access devices). **Edit** opens the flat form and surfaces household editing (household panel and/or “Edit household details”) so Secretary can change existing vehicles and other household records without a separate navigation path.

**Why this priority**: Operators discover and maintain household data in the same place as the flat master.

**Independent Test**: Open View on T1-101 — sees seeded vehicle/pet/contact/slot/fob; click Edit — household panel opens; change vehicle make and save — View reflects the change.

**Acceptance Scenarios**:

1. **Given** a flat with household records, **When** admin opens View, **Then** parking, vehicles, pets, emergency contacts, and access devices appear in the dialog.
2. **Given** a flat, **When** admin clicks Edit, **Then** they can open household editing (panel and/or explicit control) and modify vehicles (and other household data).
3. **Given** no household records yet, **When** admin opens View, **Then** each household section shows an empty state (not an error).

---

### Edge Cases

- Allotting more slots than flat `parkingSlots` count — allowed with warning in UI; not hard-blocked (entitlement is advisory).
- Vehicle linked to slot of another flat — rejected.
- Soft-delete flat — related household records soft-hidden with the flat.
- Duplicate registration number within association — rejected for APPROVED vehicles.
- RC file types — images and PDF only; size capped reasonably.

## Requirements *(mandatory)*

- **FR-001**: System MUST support parking slot inventory CRUD (unique label per association) and allotment to a flat.
- **FR-002**: System MUST support flat vehicle register with type, registration number, make/model/colour, sticker/RFID, optional parking slot link, and RC document upload.
- **FR-003**: System MUST support flat pet register with species, name, breed, notes, and vaccination/rabies valid-till.
- **FR-004**: System MUST support flat emergency contacts (name, phone, relationship, primary flag).
- **FR-005**: System MUST support flat access devices (type, identifier, ACTIVE/RETURNED/LOST, issued/returned dates).
- **FR-006**: Secretary/Superadmin creates/edits MUST default to APPROVED.
- **FR-007**: Resident submissions for their linked flat MUST create PENDING records; only Secretary/Superadmin MAY approve or reject.
- **FR-007a**: Flats page MUST expose an association-wide pending queue (vehicles/pets/contacts/devices) with approve/reject actions for staff.
- **FR-008**: Default lists for gate/ops MUST show APPROVED (and ACTIVE devices) unless “include pending” is selected.
- **FR-009**: RFID boom hardware integration and parking fee billing are OUT OF SCOPE.
- **FR-010**: Flat **View** MUST include a read-only snapshot of APPROVED household data for that flat (parking allotments, vehicles, pets, emergency contacts, access devices).
- **FR-011**: Flat **Edit** MUST provide a clear path to change household data for that flat (open household editor / panel), including editing existing vehicles.
- **FR-012**: Flat/household CSV import & export (`015-flat-household-csv`) MUST round-trip APPROVED household fields (parking labels, vehicles, pets, contacts, devices); binary RC files remain UI upload only.

## Key Entities

- **ParkingSlot**, **FlatVehicle**, **FlatPet**, **FlatEmergencyContact**, **FlatAccessDevice** (all association/flat scoped; approval status where resident-submittable).

## Success Criteria *(mandatory)*

- **SC-001**: Secretary can add parking slot, vehicle (with RC), pet, emergency contact, and access device for one flat in under 5 minutes.
- **SC-002**: Duplicate parking labels and duplicate APPROVED registration numbers are rejected in verification.
- **SC-003**: Resident PENDING vehicle is invisible in default APPROVED register until approved.
- **SC-004**: RC file uploaded for a vehicle can be downloaded again.
- **SC-005**: View on a seeded flat shows household sections populated within one open of the dialog.
- **SC-006**: From Edit, Secretary can change an existing vehicle field and see it on the next View without leaving the Flats page.

## Assumptions

- File storage follows existing inventory-service `/uploads` pattern (local disk in v1); Netlify Blobs may replace later for production CDN.
- Resident “linked flat” = FlatMember with matching userId or matching phone/email to User (v1: userId on FlatMember when present; otherwise Secretary-only until linked).
- Extends 005 UI on Flats page rather than a separate top-level nav item.
