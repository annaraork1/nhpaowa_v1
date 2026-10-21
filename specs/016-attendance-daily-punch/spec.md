# Feature Specification: Daily Punch Rules & Mark Absent

**Feature Branch**: `016-attendance-daily-punch`  
**Created**: 2026-09-21  
**Status**: Implemented  
**Depends on**: `007-staff-attendance`, `012-attendance-history-leave`  
**Input**: Check-in currently can be followed by an accidental immediate check-out (same-position button / double-click), and after check-out staff can check in again the same day. Secretaries also need a clear way to **mark Absent** (today’s muster currently only *derives* Absent when there is no punch and no leave).

## Clarifications

| Topic | Decision |
|-------|----------|
| Shifts per day | **One** check-in → check-out cycle per staff per association calendar day (v1). No second check-in after a closed punch that day. |
| Accidental checkout | Server rejects check-out if `checkOutAt - checkInAt` &lt; **30 seconds**. UI disables punch buttons while a mutation is pending and uses distinct **text** actions. |
| Absent | Explicit **Mark absent** for a calendar day; also still **derived** ABSENT at end of day if no punch, no leave, and no mark. Mark is blocked if leave covers the day or any check-in exists that day. |
| Overnight / multi-shift | Out of scope for v1 (same as 007). |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safe check-in / check-out (Priority: P1)

Secretary checks a staff member **in**. The person stays **In** until an intentional check-out. A rapid second click must not close the punch. After a valid check-out, that staff member is **Done for today** — further check-in is rejected until the next calendar day.

**Independent Test**: Check in → entry has null checkOutAt; attempt check-out 5s later → 400; check-out with time ≥30s later → closed; second check-in same day → 400.

**Acceptance Scenarios**:

1. **Given** no open punch, **When** Secretary checks in, **Then** an entry is created with checkOutAt null and roster shows In.
2. **Given** an open punch younger than 30 seconds, **When** check-out is attempted, **Then** the API rejects it.
3. **Given** a closed punch today, **When** check-in is attempted again, **Then** the API rejects with a clear “already completed today” message.
4. **Given** UI, **When** check-in is in flight, **Then** punch controls are disabled so the same click cannot fire check-out.

---

### User Story 2 - Mark staff absent (Priority: P1)

Secretary explicitly marks a staff member **Absent** for today (optional note). History/summary count them Absent. Marking is refused if they already punched or are on leave. Secretary can clear the mark if they arrived later (before any punch — then check-in works).

**Independent Test**: Mark absent for staff with no punch → history ABSENT with note; check-in while marked → reject until mark cleared; clear mark → check-in allowed.

**Acceptance Scenarios**:

1. **Given** active staff with no punch/leave today, **When** Secretary marks Absent, **Then** roster/history show Absent and summary absent count includes them.
2. **Given** staff on approved leave today, **When** mark absent is attempted, **Then** the system rejects it.
3. **Given** an open or closed punch today, **When** mark absent is attempted, **Then** the system rejects it.
4. **Given** an absent mark and no punch, **When** Secretary clears the mark, **Then** the staff returns to “not in” and can check in.

---

### User Story 3 - Roster day state is obvious (Priority: P2)

Roster **Today** column shows one clear state: Not in | In since … | Done (in … · out … · hours) | On leave | Absent — with matching actions (Check in / Check out / Mark absent / Clear absent). Completed shifts show **check-in time, check-out time, and hours worked** (`021-attendance-punch-detail`).

**Independent Test**: Visual states match API for one staff through in → out → done, and one marked absent.

---

### Edge Cases

- Open punch from a **previous** calendar day still blocks new check-in (existing FR) until checked out; after closing it, today’s new check-in is allowed if no completed punch **today**.
- Derived ABSENT (no mark, no punch, no leave) remains for history/payroll when Secretary never marked.
- Minimum 30s dwell uses server timestamps (or provided `at` values when both are supplied for corrections).

## Requirements *(mandatory)*

- **FR-001**: Check-in MUST reject if staff already has an open punch (any day).
- **FR-002**: Check-in MUST reject if staff already has a **closed** punch whose check-in falls on the **association calendar day** being punched (default: today).
- **FR-003**: Check-out MUST reject if the resulting interval is shorter than 30 seconds.
- **FR-004**: Authorized staff MUST be able to mark and clear **Absent** for a staff member on a calendar day when no punch and no leave apply.
- **FR-005**: Daily status derivation MUST treat an Absent mark as ABSENT (leave still wins over absent mark; any punch that day is PRESENT and mark must not exist / is rejected on write).
- **FR-006**: Attendance roster UI MUST disable punch actions while mutations are pending and MUST not rely on identical icon-only controls that swap in place without labels.
- **FR-007**: Extends 007/012; does not replace leave or payroll CSV behaviour.

## Success Criteria

- **SC-001**: Accidental double-click check-in cannot produce a closed punch under 30 seconds (API + UI).
- **SC-002**: Second check-in after a completed same-day shift is rejected 100% in smoke tests.
- **SC-003**: Secretary can mark and clear absent for a no-show in under 30 seconds from the roster.

## Assumptions

- One shift per staff per campus calendar day is sufficient for NHPAOWA v1 security/HK posts; multi-shift comes later.
- “Today” uses `ASSOCIATION_TZ` / Asia/Kolkata helpers already used by 012.
