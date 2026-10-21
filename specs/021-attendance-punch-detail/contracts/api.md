# API Contract: Attendance Punch Detail

## GET `/api/association/attendance/day-state`

Existing response `states[]` fields plus:

| Field | Type | When |
|-------|------|------|
| `hours` | number \| null | `DONE`: closed checkIn→checkOut; `IN`: checkIn→now (elapsed); else null |

`checkInAt` / `checkOutAt` unchanged (ISO).

## GET `/api/association/attendance/history`

Unchanged shape — UI now renders `checkInAt` / `checkOutAt` as well as `hours`.
