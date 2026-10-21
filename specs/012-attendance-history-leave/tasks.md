# Tasks: Attendance History & Leave

**Feature**: `012-attendance-history-leave`  
**Depends on**: 007-staff-attendance, 011-staff-csv-roster

## Phase 1 — Foundation

- [x] T001 Add Prisma `StaffLeave` model + relation on AssociationStaff; db push / generate
- [x] T002 Add `src/lib/attendanceStatus.js` (derive daily statuses + summary helpers)
- [x] T003 Wire leave CRUD: GET/POST `/leave`, POST `/leave/:id/cancel`

## Phase 2 — History & summary APIs

- [x] T004 GET `/attendance/summary`
- [x] T005 GET `/attendance/history` (max 62-day range)
- [x] T006 Extend attendance CSV with `mode=payroll` daily status export

## Phase 3 — Web UI

- [x] T007 Client API methods for leave, summary, history, payroll CSV
- [x] T008 AttendancePage: today KPI strip + History tab + Leave tab (create/cancel)

## Phase 4 — Association calendar (cross-cutting)

- [x] T009 Use `@nhpaowa/shared-ui` association calendar for todayKey / history / leave defaults (Asia/Kolkata)
- [x] T009 Use RowActions/IconButton for leave cancel; keep check-in workflow buttons

## Phase 4 — Seed & docs

- [x] T010 Seed sample leave + ensure attendance history demos work
- [x] T011 Update ASSOCIATION-ROADMAP + note in 007 spec pointing to 012
- [x] T012 Smoke quickstart checklist

## Phase 5 — Association calendar

- [x] T013 Use `@nhpaowa/shared-ui` association calendar for todayKey / history / leave / muster bounds (Asia/Kolkata)

## Dependency graph

```text
T001 → T002 → T003
         ↓
    T004 T005 T006
         ↓
    T007 → T008 → T009
         ↓
    T010 → T011 → T012
```
