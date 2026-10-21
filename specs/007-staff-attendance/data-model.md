# Data Model: Attendance

## AssociationStaff
- id, associationId, name, category, phone?, tower?, designation?, photoUrl?, userId?, active, deletedAt?, timestamps

## AttendanceEntry
- id, staffId, checkInAt, checkOutAt?, note?, recordedByUserId?, timestamps

> **Photo**: optional `photoUrl` — see [026-staff-photo-roster](../026-staff-photo-roster/).
