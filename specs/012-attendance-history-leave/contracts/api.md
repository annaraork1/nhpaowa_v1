# API Contract: Attendance History & Leave

Base: `/api/association` — permission resource `attendance`.

## Leave

### GET `/leave?from=&to=&staffId=`

List leave overlapping range (default: current month). Includes staff.

### POST `/leave` (createEdit)

```json
{ "staffId": "uuid", "startDate": "2026-09-20", "endDate": "2026-09-22", "leaveType": "CASUAL", "reason": "optional" }
```

Creates APPROVED leave. Reject if endDate < startDate or staff inactive.

### POST `/leave/:id/cancel` (createEdit)

Sets status CANCELLED.

## Summary

### GET `/attendance/summary?from=&to=`

```json
{
  "from": "2026-09-01",
  "to": "2026-09-20",
  "rosterActive": 42,
  "staffDays": { "present": 120, "onLeave": 15, "absent": 40 },
  "today": {
    "date": "2026-09-20",
    "present": 30,
    "onLeave": 4,
    "absent": 8,
    "openCheckIns": 12
  }
}
```

`today.absent` counts only staff with an explicit **Mark absent** for that day (not “not checked in yet”). Range `staffDays.absent` still includes derived no-show days for payroll muster.

## History

### GET `/attendance/history?from=&to=&category=&staffId=`

Returns array of DailyAttendanceStatus. Max range 62 days. Default: last 7 days through today.

### GET `/attendance?format=csv&mode=payroll&from=&to=`

Payroll-ready daily status CSV.  
`mode=events` (default) keeps existing clock-event CSV.

## Unchanged

- GET `/attendance` JSON list of entries  
- POST check-in / check-out  
