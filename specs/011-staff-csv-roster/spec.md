# Feature Specification: Staff Roster CSV Import & Expanded Categories

**Feature Branch**: `011-staff-csv-roster`  
**Created**: 2026-09-20  
**Status**: Draft  
**Depends on**: `007-staff-attendance`  
**Input**: Secretary/Superadmin bulk-load and maintain association working staff via CSV, with research-backed categories for a multi-tower residential complex (security posts, gardening, electrician, clubhouse desk, etc.).

## Research summary (India RWA / multi-tower campus)

For a campus like TATA New Haven Peenya (multiple towers + common amenities), typical association-employed or contractor staff includes:

| Area | Typical roles | Why |
|------|---------------|-----|
| **Security** | Main gate, tower/lobby posts, parking, CCTV desk | 24×7 access control; often 2–3 shifts |
| **Housekeeping** | Common-area cleaners, garbage/STP helpers | Daily hygiene of lobbies, roads, bins |
| **Gardening / landscaping** | Gardeners, lawn/plant care | Green belts and tower gardens |
| **Electrical** | Electrician / lift-liaison helper | DG, common lights, pump panels |
| **Plumbing** | Plumber | Water tanks, leaks, STP liaison |
| **Maintenance (general)** | Handyman / multi-skill | Minor civil, painting touch-ups |
| **Clubhouse / amenities** | Desk attendant, gym/pool helper | Booking desk and amenity oversight |
| **Office** | Association office assistant | Resident desk, registers, courier |

**CSV bulk load** is standard for RWAs when vendors rotate guards or when onboarding an entire shift roster at once.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download CSV template & import staff (Priority: P1)

Authorized user downloads a staff CSV template, fills rows (name, category, phone, optional tower, optional designation/post), and uploads. System validates rows, creates active roster entries, and returns a summary (created / skipped / errors).

**Why this priority**: Manual one-by-one entry does not scale for multi-tower security + vendor staff.

**Independent Test**: Upload CSV with 5 security (towers 1–3 + main gate) and 1 gardener → roster shows all six; error row with bad category is reported without blocking valid rows (or whole-file reject — see assumptions: per-row continue).

**Acceptance Scenarios**:

1. **Given** Secretary is logged in, **When** they download the template, **Then** they receive a CSV with header columns and 1–2 example rows.
2. **Given** a valid CSV, **When** they import, **Then** new staff appear in the attendance roster with correct category and tower/post.
3. **Given** a row with unknown category, **When** they import, **Then** that row is listed in errors and other valid rows are still created.

---

### User Story 2 - Expanded staff categories & tower/post (Priority: P1)

Roster supports research-backed categories (security, housekeeping, gardening, electrical, plumbing, maintenance, clubhouse, office, waste/STP, lift, fire safety, CCTV, other). Optional **tower** and **designation** for post assignment.

**See also**: [categories.md](./categories.md) — categories are **managed in-app** (not hard-coded only).

**Independent Test**: Create Electrician with designation “Common panels”; create Security with tower “3” and designation “Lobby”.

---

### User Story 2b - Add / update staff categories (Priority: P1)

Secretary/Superadmin maintains the category register (code, label, sort order, active). New categories appear in Add Staff and are accepted by CSV import.

**Independent Test**: Add category Waste / STP (`WASTE_MGMT`) → select it when adding a staff member.

---

### User Story 3 - Seeded sample roster for NHPAOWA (Priority: P2)

Dev/demo seed includes a representative multi-tower sample: gate security, per-tower security samples, housekeeping, gardening, electrician, plumber, clubhouse desk, office assistant.

**Independent Test**: After seed, Attendance staff list shows ≥12 active staff across ≥6 categories.

---

### Edge Cases

- Duplicate name+phone+category — skip or update phone/tower (v1: skip duplicate name+category when both active).
- Empty name or category — row error.
- Tower value outside 1–8 — warn but allow (custom posts OK) OR accept any short string.
- CSV encoding / Excel BOM — strip BOM; accept UTF-8.
- Unauthorized role import — 403.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept staff CSV upload for authorized `attendance` createEdit roles.
- **FR-002**: CSV columns MUST include at least: `name`, `category`, `phone` (optional), `tower` (optional), `designation` (optional).
- **FR-003**: System MUST expose a downloadable CSV template with headers and sample rows.
- **FR-004**: Default seeded categories MUST include SECURITY, HOUSEKEEPING, GARDENING, ELECTRICAL, PLUMBING, MAINTENANCE, CLUBHOUSE, OFFICE, WASTE_MGMT, LIFT, FIRE_SAFETY, CCTV, OTHER (see [categories.md](./categories.md)).
- **FR-005**: AssociationStaff MUST store optional tower and designation for post/location.
- **FR-006**: Import MUST return `{ created, skipped, errors[] }` with row numbers for failures.
- **FR-007**: Manual Add Staff UI MUST offer categories from the live register plus tower/designation fields.
- **FR-008**: Seed MUST load a research-based sample roster covering security (gate + towers), housekeeping, gardening, electrical, plumbing, clubhouse, and office.
- **FR-009**: System MUST persist staff categories per association (code, label, sortOrder, active).
- **FR-010**: Authorized users MUST create/update/soft-deactivate staff categories in the Attendance UI.
- **FR-011**: CSV validation MUST accept any active category code from the register (plus common aliases mapped to codes).

### Key Entities

- **AssociationStaff** (extended): name, category, phone, tower?, designation?, active.
- **StaffCsvImportResult**: Summary of bulk import.

## Success Criteria *(mandatory)*

- **SC-001**: Secretary can import a 20-row roster CSV in under 2 minutes including template download.
- **SC-002**: ≥90% of valid rows in a mixed good/bad file are created; each bad row has a clear error message.
- **SC-003**: Seeded demo shows security assigned to more than one tower plus at least one clubhouse and one gardening staff.

## Assumptions

- Staff are association or vendor personnel for operations — distinct from Managing Committee (`010`) and flat owners (`005`).
- Shift schedules / 3-shift auto rostering deferred; designation text can note “Night shift” if needed.
- Biometric/vendor portal sync out of scope.
- Per-row continue on error (partial success) is the default import mode.
- NHPAOWA towers referenced as `1`…`8` matching the flat register catalog.
