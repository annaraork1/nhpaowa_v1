# Feature Specification: Attendance Punch Detail (In / Out / Hours)

**Feature Branch**: `021-attendance-punch-detail`  
**Created**: 2026-09-22  
**Status**: Implemented  
**Extends**: `007-staff-attendance`, `012-attendance-history-leave`, `016-attendance-daily-punch`  
**Input**: After check-in and check-out, Secretaries need to see **when** staff arrived/left and **how long** they worked — on the live roster and in history — for association ops (security, housekeeping, facilities).

## Research summary (association ops)

Gate/security and facility teams typically need a **muster view** that answers:

1. Who is on duty now vs finished for today?
2. What were the **clock times** for a completed shift?
3. How many **hours** did that person work (for payroll / contractor verification)?

Existing backend already derives `checkInAt`, `checkOutAt`, and `hours` for history (`deriveDailyStatuses`). Roster `day-state` already returns punch timestamps for `IN` / `DONE` but **hours** were missing, and the UI only showed a partial label (e.g. “Done · out …”).

**Decision:** Reuse server-side `hoursBetween` (no new DB columns). Enrich `buildDayStates` with `hours`. Surface **In / Out / Hours** on roster (when both punches exist) and add history columns for check-in/out.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Completed shift shows In, Out, Hours on roster (Priority: P1)

When a staff member has completed today’s check-in **and** check-out (`DONE`), the roster Today view shows **check-in time**, **check-out time**, and **hours worked** (same rounding as history: 2 decimal hours).

**Independent Test**: Check in → wait ≥30s → check out → roster shows In · Out · X.XX h (not only “out at”).

**Acceptance Scenarios**:

1. **Given** `DONE` with both timestamps, **When** roster renders, **Then** In time, Out time, and hours are visible (desktop Today cell and mobile card).
2. **Given** `IN` (open punch), **When** roster renders, **Then** check-in time is shown; hours may show elapsed-so-far as partial (labeled or numeric from server).
3. **Given** NOT_IN / ABSENT / ON_LEAVE, **When** roster renders, **Then** no false punch times or hours.

---

### User Story 2 - History shows punch times (Priority: P1)

Attendance **History** for PRESENT rows shows **Check in**, **Check out**, and **Hours** (hours already present). Leave/absent rows show — for punch times.

**Independent Test**: History range with a PRESENT row displays locale times for in/out plus hours.

---

### User Story 3 - Mobile cards include shift detail (Priority: P2)

On mobile roster cards (`019`), completed shifts expose In / Out / Hours as card fields (actions remain punch controls).

**Independent Test**: Phone viewport — DONE card lists In, Out, Hours without horizontal scroll.

---

## Requirements *(mandatory)*

- **FR-001**: `GET /attendance/day-state` MUST include `hours` for `DONE` (closed interval) and MAY include elapsed `hours` for `IN` (check-in → now).
- **FR-002**: Roster UI MUST display check-in time, check-out time, and hours when both punches exist for today.
- **FR-003**: History UI MUST display check-in and check-out columns (API fields already exist).
- **FR-004**: Hours MUST use the same rounding as history derivation (0.01 h).
- **FR-005**: No new persisted hours column; association TZ / one-shift-per-day rules unchanged (`007`/`016`).

## Success Criteria

- **SC-001**: Secretary can read In, Out, and hours for a completed shift without opening CSV.
- **SC-002**: History PRESENT rows show punch times matching payroll CSV for the same day.

## Assumptions

- One closed shift per day (v1); overnight multi-shift remains out of scope.
- Display uses browser locale time formatting; calendar day remains association TZ on the server.
