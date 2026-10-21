# API Contract: Daily Punch & Absent

Base: `/api/association` — resource `attendance`.

## Punch rules (extends 007)

### POST `/attendance/check-in` `{ staffId, at?, note? }`

- 400 if open punch exists (any day).
- 400 if a **closed** punch already exists with `checkInAt` on the target association calendar day (default today from `at` or now).

### POST `/attendance/:id/check-out` `{ at?, note? }`

- 400 if already checked out.
- 400 if `(checkOutAt - checkInAt) < 30000` ms.

## Absent marks

### POST `/attendance/mark-absent` `{ staffId, date?: "YYYY-MM-DD", note? }`

- createEdit; default date = today (association TZ).
- 400 if leave covers date, or any attendance entry with checkIn on that date.
- Upserts mark status `ABSENT`.

### POST `/attendance/clear-absent` `{ staffId, date?: "YYYY-MM-DD" }`

- Deletes / clears absent mark for that day.

### GET `/attendance/day-state?date=`

Optional helper for roster: per active staff `{ staffId, state, entryId?, checkInAt?, checkOutAt?, markNote?, leaveType? }`  
`state` ∈ `NOT_IN | IN | DONE | ON_LEAVE | ABSENT`.

## Status derivation (012)

`deriveDailyStatuses` accepts `dayMarks[]`. Precedence: ON_LEAVE → PRESENT (any punch) → ABSENT (mark or none).
