# Feature Specification: Staff Attendance Registry

**Feature Branch**: `007-staff-attendance`  
**Created**: 2026-09-20  
**Status**: Draft  
**Input**: Attendance registry for working staff under the association (security, housekeeping, maintenance).

## User Scenarios & Testing

### User Story 1 - Maintain staff roster (Priority: P1)

Secretary maintains association staff: name, role/category (Security, Housekeeping, Maintenance, Office), phone, shift pattern, active flag. Optional link to a platform User with STAFF role.

**Independent Test**: Add Security guard; list shows Active; deactivate hides from check-in picker.

### User Story 2 - Record daily attendance (Priority: P1)

Authorized user records **one** check-in and check-out per staff per association calendar day (with timestamps). Duplicate open check-in is blocked; a second check-in after a completed same-day shift is blocked. Check-out within 30 seconds of check-in is rejected (anti accidental double-click). See `016-attendance-daily-punch`.

**Independent Test**: Check in staff; early check-out fails; check-out after ≥30s succeeds; second check-in same day fails.

### User Story 3 - Attendance reports (Priority: P2)

Secretary/Treasurer views monthly attendance summary (days present, hours) and exports CSV for payroll support.

> **Extended by** [012-attendance-history-leave](../012-attendance-history-leave/): daily Present/Absent/On Leave history, leave register, today KPIs, payroll-ready status CSV.

### Edge Cases

- Check-out without check-in — reject.
- Overnight shift spanning midnight — v1: single calendar day; note in assumptions.
- Backdated correction — Secretary can edit with reason (audit).

## Requirements

- **FR-001**: System MUST support staff roster CRUD (soft-deactivate).
- **FR-002**: Staff categories are a managed register (see `011-staff-csv-roster/categories.md`) seeded with SECURITY, HOUSEKEEPING, GARDENING, ELECTRICAL, PLUMBING, MAINTENANCE, CLUBHOUSE, OFFICE, WASTE_MGMT, LIFT, FIRE_SAFETY, CCTV, OTHER — associations MAY add more.
- **FR-003**: System MUST record attendance entries with checkInAt, optional checkOutAt, optional note.
- **FR-004**: System MUST prevent two open (no checkout) entries for the same staff.
- **FR-004a**: System MUST allow only one completed check-in/out cycle per staff per association calendar day (`016-attendance-daily-punch`).
- **FR-004b**: Check-out MUST be rejected if the punch interval is shorter than 30 seconds.
- **FR-004c**: Authorized roles MUST be able to mark / clear Absent for a day when there is no punch and no leave (`016-attendance-daily-punch`).
- **FR-005**: Authorized roles MUST list/filter attendance by date range and category.
- **FR-005a**: Roster and history MUST surface check-in time, check-out time, and hours worked for completed shifts (`021-attendance-punch-detail`).
- **FR-005b**: Roster MUST show optional staff photos (or initials) for recognition; Add staff MUST allow photo upload; view and change gestures MUST be distinct (`026-staff-photo-roster`).
- **FR-006**: System MUST export attendance CSV for a date range.
- **FR-007**: Staff role MAY self check-in/out only for their linked roster record (optional; v1 Secretary can record for all).

## Key Entities

- **AssociationStaff**: Roster person.
- **AttendanceEntry**: One work interval.
- **User** (optional link): Platform login for self-service later.

## Success Criteria

- **SC-001**: Recording a full day’s attendance for 10 staff takes under 5 minutes.
- **SC-002**: Open duplicate check-ins are rejected 100% in tests.
- **SC-003**: Monthly CSV matches on-screen totals for a sample week.

## Assumptions

- Geo-fencing / biometric devices out of scope.
- Payroll calculation (PF/ESI) out of scope — export only.
- Overnight shifts handled as next-day entry in a future revision.
- “Today” and attendance date ranges use association campus calendar (`Asia/Kolkata` / `ASSOCIATION_TZ`), not raw UTC date strings.
