# Feature Specification: Attendance History & Leave (Payroll-Ready)

**Feature Branch**: `012-attendance-history-leave`  
**Created**: 2026-09-20  
**Status**: Draft  
**Input**: Track attendance history, how many attended, how many currently on leave, so payroll can be implemented later.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily ops summary (Priority: P1)

Secretary opens Attendance and immediately sees today: active roster size, how many are Present (checked in), how many are On Leave, how many are Absent, and how many have an open check-in (not yet checked out).

**Why this priority**: Day-to-day gate/ops accountability; foundation for payroll headcount facts.

**Independent Test**: With 10 active staff, 6 checked in, 2 on approved leave today, and 2 with neither → summary shows Present 6, On Leave 2, Absent 2, Open check-ins ≥0.

**Acceptance Scenarios**:

1. **Given** active staff and some check-ins and leave covering today, **When** Secretary views Attendance, **Then** summary KPIs match those counts.
2. **Given** no leave and no check-ins for a staff member today, **When** summary is computed, **Then** that staff counts as Absent (derived). Secretary MAY also explicitly **Mark absent** (`016-attendance-daily-punch`) before end of day.

---

### User Story 2 - Record staff leave (Priority: P1)

Secretary records leave for a staff member (date range + leave type + optional reason). Approved leave prevents that person from being marked Absent for covered days and contributes to “On Leave” counts.

**Why this priority**: Without leave, absences and payroll-ready days are wrong.

**Independent Test**: Record leave for tomorrow for one staff; tomorrow’s summary shows them On Leave and not Absent; history row shows ON_LEAVE.

**Acceptance Scenarios**:

1. **Given** an active staff member, **When** Secretary creates leave CASUAL for a date range, **Then** leave appears in the leave list and covers each day in range.
2. **Given** leave covering today, **When** someone tries to treat them as Absent in history, **Then** status is ON_LEAVE instead.
3. **Given** an approved leave, **When** Secretary cancels it, **Then** those days revert to Present/Absent based on check-ins.

---

### User Story 3 - Attendance history muster (Priority: P1)

Secretary/Treasurer picks a date range and sees a history list: each staff × day with status Present / Absent / On Leave, **check-in / check-out times**, hours (when Present), leave type (when On Leave). Filters by category/staff optional. Punch-time columns: `021-attendance-punch-detail`.

**Why this priority**: Audit trail and payroll review before any salary feature.

**Independent Test**: Check in/out yesterday for one staff; history for that day shows PRESENT with hours; staff with no entry and no leave shows ABSENT.

**Acceptance Scenarios**:

1. **Given** closed check-in/out on a day, **When** history is loaded for that day, **Then** status is PRESENT and hours reflect the interval.
2. **Given** approved leave on a day with no check-in, **When** history is loaded, **Then** status is ON_LEAVE with leave type.
3. **Given** neither leave nor check-in, **When** history is loaded, **Then** status is ABSENT.

---

### User Story 4 - Payroll-ready export (Priority: P2)

Authorized user exports a date-range CSV of daily statuses (not only raw clock events) for Treasurer/payroll prep.

**Why this priority**: Bridges to future payroll without building pay calculation yet.

**Independent Test**: Export CSV for a week; row count equals active staff × days (or filtered subset); columns include status and hours/leaveType.

**Acceptance Scenarios**:

1. **Given** history for a range, **When** user downloads payroll CSV, **Then** file contains staff, date, status, leaveType, hours fields.
2. **Given** the same range on screen, **When** CSV totals of Present/Leave/Absent days are counted, **Then** they match on-screen summary.

---

### Edge Cases

- Leave overlapping an existing check-in day → status **ON_LEAVE** wins for muster (leave approved means not working); check-in rows remain in event log for audit.
- Partial-day leave (half day) — deferred; v1 leave is full calendar days.
- Overnight open check-in spanning midnight — still Present on check-in calendar day; hours until checkout may land next day (documented assumption from 007).
- Deactivated staff — excluded from daily muster for dates after deactivation; historical rows for past dates remain visible when filtering by staff id if needed.
- Cancelled leave — excluded from status derivation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show an attendance summary for a selectable date range including counts of Present, On Leave, and Absent staff-days, plus today’s Present / On Leave / Absent / open check-in counts. “Today” MUST use the association campus calendar day (`Asia/Kolkata` / `ASSOCIATION_TZ`).
- **FR-002**: System MUST allow authorized roles to create, list, and cancel staff leave records with type and inclusive date range.
- **FR-003**: System MUST derive daily attendance status per active staff per day as Present, Absent, or On Leave using check-ins and approved leave.
- **FR-004**: System MUST provide an Attendance History view filtered by date range (and optionally category/staff).
- **FR-005**: System MUST export a payroll-ready CSV of daily statuses for a date range.
- **FR-006**: System MUST retain existing check-in/out and raw event CSV behaviour from 007.
- **FR-007**: Payroll salary calculation, PF/ESI, biometric devices, and leave accrual balances are OUT OF SCOPE for this feature.

### Key Entities

- **AssociationStaff** / **AttendanceEntry** (existing): roster and clock intervals.
- **StaffLeave**: Approved or cancelled leave covering one or more calendar days.
- **DailyAttendanceStatus** (derived, not necessarily persisted): staff + date + status + hours + leaveType.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Secretary can answer “how many attended today / on leave today / absent today” in under 10 seconds from the Attendance page.
- **SC-002**: For a sample week with known check-ins and leave, history statuses match expected Present/Leave/Absent for 100% of active staff-days in a manual audit.
- **SC-003**: Payroll-ready CSV for that week matches on-screen Present/Leave/Absent day totals.
- **SC-004**: Recording leave for one staff takes under 1 minute.

## Assumptions

- Working calendar is every calendar day in the selected range (no holiday master yet); Week-off is recorded as leave type WEEK_OFF when needed.
- v1 leave is Secretary/staff-admin recorded as APPROVED; self-service request workflow comes later.
- Association timezone for all “today” / calendar-day features is **Asia/Kolkata** (override with `ASSOCIATION_TZ`). Never use raw `toDateString()` or UTC `toISOString().slice(0,10)` for campus “today” — see `@nhpaowa/shared-ui` `associationCalendarYmd`.
- Extends `007-staff-attendance` and `011-staff-csv-roster`; does not replace them.
