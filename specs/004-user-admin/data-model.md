# Data Model: Superadmin User & Role Administration

## User (existing)

| Field | Notes |
|-------|--------|
| id | UUID |
| associationId | Tenant scope |
| email | Unique per association; store lowercase |
| passwordHash | Never returned in API |
| name | Display name |
| role | One of ROLES including `SUPERADMIN` |
| supplierId | Required when role=`VENDOR` |
| active | Default true; false blocks login |
| createdAt / updatedAt | Audit |

### Validation rules

- Email: valid format, unique per association (case-insensitive)
- Password: min 6 characters on create; on update optional (omit = keep)
- Role: enum of known ROLES
- Vendor ⇒ supplierId required and must belong to same association
- Cannot set `active=false` or `role≠SUPERADMIN` if this is the last active Superadmin

### State

- **Active**: can login
- **Inactive**: listed for Superadmin; login denied

No new tables for v1.
