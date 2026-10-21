# Research: Attendance History & Leave (Payroll-Ready Facts)

**Date**: 2026-09-20  
**Sources**: EstateDeck society attendance, Mygate workforce notes, Bharat Payroll AMS guide, Zoho/AttendFirst/SmoothHiring attendance report models, RWA security & housekeeping ops guides.

## Problem today (007 + 011)

NHPAOWA already has:

- Staff roster + categories + CSV import
- Check-in / check-out intervals (`AttendanceEntry`)
- Raw CSV of clock events

Gaps for payroll prep and daily ops:

- No **history / muster** view (who was Present / Absent / On Leave by day)
- No **leave** records (CL / SL / week-off / unpaid)
- No **live summary**: how many attended today vs currently on leave vs absent
- CSV is clock-event oriented, not **daily status** oriented (what payroll and auditors ask for)

## Industry pattern (India RWA / AMS)

| Concept | Typical practice |
|---------|------------------|
| **Daily status** | One status per staff per calendar day: Present, Absent, On Leave, Half Day (optional), Holiday/Week-off |
| **Clock facts** | Check-in/out remain the source of “Present” + hours |
| **Leave** | Approved leave overlays the day so it is not counted Absent |
| **Muster / history** | Date-range grid or list + KPI strip (Present / Leave / Absent / Open check-ins) |
| **Payroll** | System produces **facts feed** (days present, hours, leave days) — Secretary/Treasurer reviews; **no auto salary / PF / ESI** in v1 |
| **Compliance** | Monthly muster + leave register support Code on Wages / auditor asks; biometric optional and out of scope |

## Decisions

### D1 — Extend 007; do not replace check-in/out

Keep `AttendanceEntry` as the clock source of truth. Add leave + derived daily status + summary APIs. Payroll calculation remains a later feature that consumes these facts.

### D2 — `StaffLeave` entity (Secretary-recorded in v1)

Fields: staff, startDate, endDate (inclusive), leaveType, reason/note, status (`APPROVED` default for v1; `CANCELLED` soft), recordedBy.

Leave types (v1 enum): `CASUAL`, `SICK`, `EARNED`, `WEEK_OFF`, `UNPAID`, `OTHER`.

Self-service leave request / multi-level approval deferred.

### D3 — Derived daily status (no separate DailyAttendance table in v1)

For each active staff × each day in range:

1. If an **approved leave** covers the day → **ON_LEAVE** (leaveType attached)
2. Else if ≥1 check-in that calendar day → **PRESENT** (hours = sum of closed intervals; open interval counts as Present with partial hours note)
3. Else → **ABSENT**

Half-day / late flags deferred (need shift rules). Holiday calendar deferred.

### D4 — Summary endpoint for ops + payroll prep

`GET /attendance/summary?from=&to=` returns:

- `rosterActive`
- `presentDays` / `leaveDays` / `absentDays` (staff-day counts over range)
- For **today** also: `presentNow`, `onLeaveToday`, `absentToday`, `openCheckIns`

### D5 — Payroll-ready CSV

Export columns: `staff,category,tower,designation,date,status,leaveType,hours,checkInAt,checkOutAt,note`  
One row per staff per day (status view), not only raw clock rows. Keep existing raw clock CSV as optional `format=csv&mode=events`.

### D6 — Out of scope (explicit)

Salary amounts, OT multipliers, PF/ESI, biometric/RFID devices, agency vs in-house billing reconciliation, auto-disbursal, shift roster engine.

## Alternatives considered

| Option | Why not (v1) |
|--------|----------------|
| Materialized daily attendance rows written every night | Extra jobs; derivation is enough for ~100 staff |
| Full leave balance / accrual engine | Needs policy config; record approved leave first |
| Integrate Zoho/greytHR | Later; export CSV is the bridge |
