# Implementation Plan: Attendance History & Leave

**Branch**: `012-attendance-history-leave` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Add `StaffLeave`, derive daily Present/Absent/On Leave statuses from leave + check-ins, expose summary + history + payroll CSV APIs, and extend Attendance UI with History and Leave tabs plus today KPIs — payroll-ready facts without calculating pay.

## Technical Context

**Stack**: Express + Prisma (inventory-service), React AttendancePage, shared-auth `attendance` permissions  
**Derivation**: Server-side for date range (active staff × days); cap range to 62 days for history/export to protect payload size  

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo | PASS | `/api/association/attendance/*`, `/leave` |
| Soft-delete | PASS | Leave cancel; staff soft-delete unchanged |
| Spec-driven | PASS | This folder |

## Structure

```text
prisma/schema.prisma              # StaffLeave model
src/lib/attendanceStatus.js       # derive daily statuses + summary
routes/association.js             # leave CRUD, summary, history, payroll CSV
apps/web/.../AttendancePage.jsx   # KPIs + History + Leave tabs
apps/web/.../api/client.js        # new endpoints
prisma/seed.js                    # sample leave + history entries
```

## Phase 0 / 1 artifacts

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/api.md](./contracts/api.md)
- [quickstart.md](./quickstart.md)
