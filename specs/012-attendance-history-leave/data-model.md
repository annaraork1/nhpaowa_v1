# Data Model: Attendance History & Leave

## StaffLeave

| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| staffId | UUID FK → AssociationStaff | |
| startDate | Date | inclusive |
| endDate | Date | inclusive ≥ startDate |
| leaveType | String | CASUAL, SICK, EARNED, WEEK_OFF, UNPAID, OTHER |
| reason | String? | |
| status | String | APPROVED \| CANCELLED |
| recordedByUserId | UUID? | |
| createdAt / updatedAt | DateTime | |

Indexes: `(staffId, startDate, endDate)`, status filter via query.

## DailyAttendanceStatus (derived)

Not persisted in v1.

| Field | Notes |
|-------|-------|
| staffId, staffName, category, tower, designation | from roster |
| date | YYYY-MM-DD |
| status | PRESENT \| ABSENT \| ON_LEAVE |
| leaveType | set when ON_LEAVE |
| hours | decimal hours from closed intervals that day; open interval uses now |
| checkInAt / checkOutAt | first in / last out that day (optional) |
| note | from leave reason or attendance note |

## Derivation order

1. Approved leave covering date → ON_LEAVE  
2. Else any AttendanceEntry with checkIn on that local date → PRESENT  
3. Else ABSENT  

## Existing

- AssociationStaff, AttendanceEntry, StaffCategory unchanged except consumed by derivation.
