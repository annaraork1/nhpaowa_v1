# Feature Specification: Flat Owners & Unit Register

**Feature Branch**: `005-flat-owners`  
**Created**: 2026-09-20  
**Status**: Draft  
**Input**: NHPAOWA Secretary/board need a list of flat owners; foundation for NOC and move-in/out.

## User Scenarios & Testing

### User Story 1 - Maintain flat unit register (Priority: P1)

Secretary (or Superadmin) records each apartment unit (wing/block, flat number, floor, type, parking slots) so the association has a single source of truth for who lives where.

**Independent Test**: Create Wing A / 101; list shows it; edit parking; soft-delete hides it from default list.

**Acceptance Scenarios**:

1. **Given** an admin session, **When** they add a flat with wing + number, **Then** it appears in the register.
2. **Given** duplicate wing+number, **When** they save, **Then** the system rejects with a clear message.
3. **Given** a soft-deleted flat, **When** viewing the default list, **Then** it is hidden unless “include archived” is on.

### User Story 2 - Link owners / members to flats (Priority: P1)

Admin links people as Primary Owner, Associate/Joint Owner, or Tenant Occupant with name, phone, email, and membership notes. One flat can have multiple members; one person can own multiple flats.

**Independent Test**: Attach Primary Owner to A-101; list owners filter by flat; change Primary → Associate.

**Acceptance Scenarios**:

1. **Given** a flat, **When** admin adds a Primary Owner, **Then** the flat’s owner list shows them.
2. **Given** a flat already has a Primary Owner, **When** admin adds another Primary, **Then** system either rejects or automatically demotes the previous (v1: reject second Primary).
3. **Given** occupancy status Owner-occupied / Tenant / Vacant, **When** admin updates it, **Then** the register reflects the new status.

### User Story 3 - Search and export register (Priority: P2)

Committee can search by flat, name, phone, or email and export a CSV for AGM / auditors. Export includes household register fields (vehicles, pets, parking allotments, emergency contacts, access devices) — see `015-flat-household-csv`. With ~1705 units, Flats page search is debounced so Secretaries are not blocked waiting on the full register. Campus IDs (`T21031`), Tower / Floor / Occupancy / Type filters, Clear, and aligned Actions column are specified in `023-flats-list-filters`.

**Independent Test**: Search “101” or `T21031` returns matching flats; export CSV includes wing, flat, primary owner name, phone, status, and household columns when present.

### User Story 3b - Bulk CSV import (Priority: P1)

Secretary downloads a CSV template and imports flats + owners + optional household details. Upserts by tower + flat number. See `015-flat-household-csv`.

**Independent Test**: Import template sample row for a new tower/flat → register and household show the data.

### User Story 4 - Typeahead flat picker (Priority: P1)

Forms that need a flat (NOC, moves / internal shift, etc.) MUST use a searchable typeahead (tower / flat / owner / phone), not a native `<select>` listing the entire register.

**Independent Test**: Typing “2-305” or an owner name filters options quickly; selecting sets the flat id.

### Edge Cases

- Flat without owner yet (vacant / under possession) — allowed.
- Owner with no email — phone required at minimum for Primary.
- Soft-delete owner link vs person record — v1 soft-deletes the membership link only.

> **Extended by** [013-flat-vehicles-pets-parking](../013-flat-vehicles-pets-parking/): named parking slots, vehicles (+ RC), pets (+ vaccines), emergency contacts, access devices, resident PENDING→approve flow. **Flat View** shows saved household data; **Edit** opens household editing on the Flats page.


## Requirements

- **FR-001**: System MUST support creating/editing/listing/soft-deleting flats scoped to the association.
- **FR-002**: Flat identity MUST be unique by association + **tower number** + flat number.
- **FR-002a**: Flat MUST capture apartment type, configuration variant, and super built-up area from the NHPAOWA catalog.
- **FR-003**: System MUST support membership roles: PRIMARY_OWNER, ASSOCIATE_OWNER, TENANT, **OWNER_FAMILY**, **TENANT_FAMILY** (see `024-flat-members-csv-perf`).
- **FR-004**: A flat MUST have at most one active PRIMARY_OWNER.
- **FR-005**: System MUST store occupancy status: OWNER_OCCUPIED, TENANT_OCCUPIED, VACANT.
- **FR-006**: System MUST allow search by flat number, tower, apartment type, member name, phone, email (debounced on Flats page). Campus flat IDs and structured list filters: see `023-flats-list-filters`.
- **FR-006a**: Shared flat picker MUST typeahead-search the register (min 1 character) and MUST NOT render all association flats as a bare `<select>` when the register is large (~1705).
- **FR-007**: Authorized roles MUST export the register to CSV including household columns (`015-flat-household-csv`).
- **FR-007a**: Authorized staff MUST import flats/members/household via CSV template (`015-flat-household-csv`).
- **FR-008**: Residents MUST NOT edit the master flat register (create/update/delete flats). Linked residents MAY view their own flat(s), add Associate owner / Tenant members on linked flats, and submit household updates per 013 / `014-resident-portal`. Soft-delete of members and Primary-owner changes remain staff-only.

## Key Entities

- **Flat**: Unit identified by tower number + flat number, with apartment type/configuration/area, parking, occupancy.
- **FlatMember**: Link of a person to a flat with membership role and contact details.
- **Person** (embedded v1): Name/phone/email on FlatMember; optional future link to User account.

## Success Criteria

- **SC-001**: Secretary can register 20 flats with primary owners in under 30 minutes.
- **SC-002**: Duplicate flat keys are rejected 100% of the time in verification.
- **SC-003**: CSV export matches on-screen register for a 50-flat sample.

## Assumptions

- Single association / campus (TATA New Haven – Bengaluru) for v1.
- No Form-I legal PDF generation in v1 (data model supports it later).
- Dues balance is not stored here; NOC module may later call dues when available.
