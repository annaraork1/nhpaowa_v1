# Data Model: Staff Photo

## AssociationStaff (extends 007)

| Field | Type | Notes |
|-------|------|--------|
| photoUrl | String? | Public path e.g. `/uploads/staff/{ts}-{safeName}` or https URL |

Unchanged: name, category, phone, tower, designation, userId, active, deletedAt, timestamps.

## Files

- Directory: `services/inventory-service/uploads/staff/`
- Served at: `/uploads/staff/...` (static mount already on inventory-service)
