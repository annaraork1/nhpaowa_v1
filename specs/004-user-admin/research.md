# Research: Superadmin User & Role Administration

## Decision: Add SUPERADMIN role (string on User.role)

**Rationale**: Spec requires a distinct Superadmin above Secretary. Existing `User.role` is a free-form string validated against `ROLES` in shared-auth; adding `SUPERADMIN` matches the current pattern without a Role table.

**Alternatives considered**:
- Reuse Secretary as “superadmin” — rejected; user asked for Superadmin and Secretary already has broad inventory powers without clear privilege boundary.
- Separate `isSuperAdmin` boolean — rejected; complicates JWT and matrix; role string is enough.

## Decision: Identity-service owns all user admin APIs

**Rationale**: Login/register/list already live on identity (`:4000`). Inventory should not mutate users. Web calls `/api/auth/users` via proxy or direct identity base URL (existing auth client pattern).

**Alternatives considered**:
- Inventory-service user routes — rejected; splits identity concerns.

## Decision: Superadmin-only for user admin (Secretary loses users createEdit)

**Rationale**: FR-008/FR-009 — only Superadmin administers users fully; Secretary must not assign Superadmin. Simplest matrix: `users` resource → Superadmin `view`+`createEdit`; Secretary `[]` (or view-only if needed — choose none for clear boundary).

**Alternatives considered**:
- Secretary can manage non-Superadmin users — deferred; v1 keeps a single admin path.

## Decision: Last-Superadmin safeguard in identity update handlers

**Rationale**: Count active users with role SUPERADMIN before deactivate/demote; reject if count would drop to zero.

**Alternatives considered**:
- Soft-delete users — out of scope; use `active=false`.

## Decision: Seed `superadmin@nhpaowa.local` / password123

**Rationale**: FR-011 bootstrap after reset; document in README login table.

## Decision: Passwords set/reset by Superadmin only (no email invite)

**Rationale**: Spec assumption; out-of-band password share. bcrypt hash on create/update when password provided.
