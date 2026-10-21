# Feature Specification: Flat & Household CSV Import / Export

**Feature Branch**: `015-flat-household-csv`  
**Created**: 2026-09-21  
**Status**: Implemented  
**Depends on**: `005-flat-owners`, `013-flat-vehicles-pets-parking`  
**Input**: Secretary needs bulk import of flat owners (and household register details) via CSV for ~1705 units, and the existing flats CSV export must include household details so data can leave and re-enter the system.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download template & import flats + members (Priority: P1)

Authorized staff downloads a flats CSV template, fills tower/flat, apartment catalog fields, occupancy, and owner/member contacts, then imports. System upserts by tower + flat number, creates/updates memberships, and returns `{ created, updated, skipped, errors[] }` with row numbers.

**Why this priority**: Manual entry does not scale for a full campus register.

**Independent Test**: Import 3 flats (one new, one existing update, one bad row) → summary shows created/updated/error; valid flats appear in the register.

**Acceptance Scenarios**:

1. **Given** Secretary, **When** they download the template, **Then** they get headers + sample rows covering flat + primary owner columns.
2. **Given** a valid new tower/flat row, **When** they import, **Then** the flat and primary owner are created.
3. **Given** an existing tower/flat, **When** they import changed occupancy/owner phone, **Then** the flat is updated (not duplicated).
4. **Given** a row missing tower or flat number, **When** they import, **Then** that row is listed in errors and other rows still process.

---

### User Story 2 - Import household details in the same CSV (Priority: P1)

The same CSV supports optional household columns: allotted parking labels, vehicles, pets, emergency contacts, and access devices (multi-value encoding). Staff import creates APPROVED household records (or updates matching keys such as vehicle registration / device identifier). Binary RC scans are out of scope for CSV.

**Independent Test**: Import a row with one parking label, one vehicle, one pet, one emergency contact, one fob → household panel shows APPROVED entries.

**Acceptance Scenarios**:

1. **Given** a flat row with vehicle registration, **When** imported, **Then** an APPROVED vehicle appears under that flat.
2. **Given** empty household columns, **When** imported, **Then** existing household data is left unchanged (no wipe).
3. **Given** an invalid vehicle type token, **When** imported, **Then** that household portion is reported in the row error/warnings without inventing bad records.

---

### User Story 3 - Export flats CSV includes household details (Priority: P1)

Existing **Export CSV** on Flats expands beyond primary owner to include household fields in the same column layout as the import template (round-trip friendly). Residents cannot export.

**Independent Test**: Seeded Tower 1-101 export row contains primary owner plus non-empty vehicle/pet/parking/contact/device fields matching the register.

**Acceptance Scenarios**:

1. **Given** staff, **When** they export, **Then** CSV headers match the import template (plus any documented read-only columns such as superBuiltUpArea).
2. **Given** flats with household data, **When** they export, **Then** multi-value household fields are populated.
3. **Given** a resident session, **When** they attempt export or import, **Then** the system denies it.

---

### User Story 4 - Flats UI: Import CSV control (Priority: P2)

Flats page offers **Import CSV** (staff createEdit) beside Export: choose file / paste, show result summary (created/updated/skipped/errors). Optional template download link.

**Independent Test**: From Flats UI, import template sample → toast/summary shows created ≥ 0 without page crash.

---

### User Story 5 - Column help & multi-value samples (Priority: P1)

Staff who are not CSV experts need to see **what to type in each column**, including how to put **several members / vehicles / pets in one cell**. The downloadable template includes a `#HELP` guide row with per-column samples; the Import panel shows a column guide with hover (`title`) text and visible sample encodings. Multiple entries use `|` between records and `:` between fields inside a record.

**Why this priority**: Without samples, bulk import fails or is abandoned for ~1705 units.

**Independent Test**: Open Import → guide shows `vehicles` sample with two `|`-joined records; download template → second row starts with `#HELP`; importing that file does not create a flat for the help row.

**Acceptance Scenarios**:

1. **Given** Secretary, **When** they download the template, **Then** they see header + `#HELP` row + sample data rows that demonstrate multi-value `|` encoding.
2. **Given** Import panel open, **When** they hover a multi-value column name, **Then** the tooltip shows the field pattern and a sample with two entries.
3. **Given** a CSV whose tower cell is `#HELP` (or any `#…`), **When** imported, **Then** that row is skipped (not an error that blocks other rows).
4. **Given** one cell `FOUR_WHEELER:…|TWO_WHEELER:…`, **When** imported, **Then** both vehicles appear under the flat.

---

### Edge Cases

- Duplicate PRIMARY_OWNER in members encoding — reject row or keep first primary (document: keep dedicated primary columns as source of truth).
- Apartment type/configuration not in catalog — accept strings but fill superBuiltUpArea when catalog matches.
- Parking slot label already allotted to another flat — row error for that allotment.
- UTF-8 BOM / Excel quotes — strip BOM; quoted commas supported.
- Very large file (~1705 rows) — completes with progress summary (no hard UI timeout for typical campus size).
- `#HELP` / `#`-prefixed tower rows — skipped on import (template guide only).
- Spaces around `|` — trim each record; prefer no spaces around `|` when authoring.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff with `flatOwners` createEdit MUST be able to import a CSV of flats + members + optional household fields.
- **FR-002**: System MUST provide a downloadable CSV template with headers, a `#HELP` guide row (per-column sample/format), and sample data rows that demonstrate multi-value encoding.
- **FR-003**: Import MUST upsert flats by association + tower + flatNumber (optional `campusFlatId`) and return `{ created, updated, filled, skipped, conflicts[], errors[] }` with dry-run / resolutions per `024-flat-members-csv-perf`.
- **FR-004**: Primary owner MUST be taken from dedicated columns; additional ASSOCIATE_OWNER / TENANT / OWNER_FAMILY / TENANT_FAMILY MAY be supplied via a multi-value `members` field.
- **FR-005**: Optional household columns MUST support parking allotments, vehicles, pets, emergency contacts, and access devices using `|` between records and `:` between fields; empty household fields MUST NOT delete existing household data.
- **FR-006**: Staff-imported household records MUST be APPROVED (same as Secretary UI create).
- **FR-007**: Existing flats export MUST use the same column set (household included) for round-trip; residents MUST NOT import/export.
- **FR-008**: Flats page MUST expose Import CSV (+ template) for authorized staff.
- **FR-009**: Import MUST skip rows whose `tower` value starts with `#` (guide/comment rows).
- **FR-010**: Flats Import UI MUST show a column guide (allowed values + sample, with hover text) covering multi-value columns; guide content MUST match `GET /flats/csv-guide`.

### Key Entities

- **Flat**, **FlatMember** (005)
- **ParkingSlot**, **FlatVehicle**, **FlatPet**, **FlatEmergencyContact**, **FlatAccessDevice** (013)
- **FlatCsvImportResult**: summary DTO only
- **FlatCsvColumnGuide**: column metadata for template help + UI tooltips

## Success Criteria

- **SC-001**: Secretary can import a 20-row sample (flats + household) and see matching register/household data in under 5 minutes.
- **SC-002**: Export of seeded demo flat includes household fields that re-import without creating duplicate flats.
- **SC-003**: Invalid rows never create partial flats without an error entry; valid rows in the same file still succeed.
- **SC-004**: A new Secretary can fill members/vehicles/pets correctly using only the template `#HELP` row and Import panel guide (no engineer docs).

## Assumptions

- One CSV row = one flat (not one row per member).
- Multi-value fields use `|` between records and `:` between fields within a record (documented in template, UI guide, and quickstart).
- Vehicle RC / pet certificate binary files remain upload-only in UI (013), not CSV.
- Upsert does not soft-delete flats missing from the file.
