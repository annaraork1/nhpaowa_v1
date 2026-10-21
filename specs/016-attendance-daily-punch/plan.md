# Plan: 016 Attendance Daily Punch

## Goal

Hardening 007/012 punch UX: one shift/day, anti-accidental checkout, explicit Mark absent.

## Approach

1. Prisma `AttendanceDayMark` + relation on `AssociationStaff`.
2. Tighten check-in / check-out validation in `association.js`; extend `deriveDailyStatuses` with marks.
3. New routes: mark-absent / clear absent; expose marks on today’s roster payload or via marks query.
4. AttendancePage: labeled punch buttons, pending disable, day-state + Mark/Clear absent.
5. Update 007/012 contracts + ASSOCIATION-ROADMAP; smoke.

## Out of scope

Multi-shift, half-day, biometric, self-service STAFF punches.
