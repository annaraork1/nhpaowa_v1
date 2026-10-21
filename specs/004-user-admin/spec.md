# Feature Specification: Superadmin User & Role Administration

**Feature Branch**: `004-user-admin`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "How do we create users - can you create a spec and add this feature so as a superadmin we can add users and roles - run this as new spec in SDD loop"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Superadmin creates a user with a role (Priority: P1)

A Superadmin opens Users administration, adds a new association member with name, email, temporary password, and a role (Secretary, Treasurer, Committee, Staff, Resident, Vendor, or Superadmin). For Vendor, they also link a supplier. The new person can sign in immediately with those credentials and receives the correct permissions for that role.

**Why this priority**: Today users are only seeded or created via a raw API; the core ask is in-app Superadmin provisioning.

**Independent Test**: Sign in as Superadmin → create Staff user → sign out → sign in as that Staff user → inventory actions match Staff permissions.

**Acceptance Scenarios**:

1. **Given** an active Superadmin session, **When** they submit a valid new user form (name, email, password, role), **Then** the user appears in the list and can log in with that email/password.
2. **Given** role Vendor, **When** Superadmin omits supplier, **Then** creation is rejected with a clear message; **When** supplier is selected, **Then** creation succeeds and vendor portal is scoped to that supplier.
3. **Given** an email already used in the association, **When** Superadmin tries to create again, **Then** the system rejects with a duplicate-email message.
4. **Given** a non-Superadmin session (e.g. Staff), **When** they open Users or call create-user, **Then** the screen is hidden/denied and the API rejects the request.

---

### User Story 2 - Superadmin lists and updates users & roles (Priority: P1)

Superadmin views all association users (name, email, role, active status, supplier if any). They can change a user’s role, update name/email, reset password, activate/deactivate, and change vendor supplier link. Role changes take effect on the user’s next login (or next authenticated request if tokens are refreshed).

**Why this priority**: Creating users without ongoing admin is incomplete for real associations.

**Independent Test**: Change a Resident to Staff → confirm Staff can record stock after re-login; deactivate a user → login fails.

**Acceptance Scenarios**:

1. **Given** Superadmin on Users, **When** they change a user’s role from Resident to Staff and save, **Then** the list shows Staff and after re-login that user can perform Staff stock actions.
2. **Given** an active user, **When** Superadmin deactivates them, **Then** login is denied until reactivated.
3. **Given** Superadmin resets a password, **When** the user signs in with the new password, **Then** login succeeds; old password fails.
4. **Given** Treasurer (or any non-Superadmin), **When** they attempt to update another user’s role, **Then** the action is denied.

---

### User Story 3 - Safeguards for privileged accounts (Priority: P2)

The system prevents locking the association out of administration: Superadmin cannot deactivate or demote the last remaining active Superadmin. Non-Superadmin roles cannot assign the Superadmin role. Secretary (if still allowed limited user ops) cannot create or promote Superadmins.

**Why this priority**: Avoids irreversible lockout; security boundary for the new role.

**Independent Test**: With one Superadmin, attempt deactivate/demote → rejected. With two, demote one → succeeds.

**Acceptance Scenarios**:

1. **Given** exactly one active Superadmin, **When** they try to deactivate themselves or change their role away from Superadmin, **Then** the system blocks the change with a clear explanation.
2. **Given** two active Superadmins, **When** one demotes the other to Secretary, **Then** the change succeeds.
3. **Given** a Secretary session, **When** they attempt to assign role Superadmin, **Then** the request is rejected.

---

### User Story 4 - Users nav & empty-state guidance (Priority: P3)

Superadmin sees a Users item in navigation. Empty or first-time states explain that seeded Superadmin credentials exist for bootstrap. Other roles do not see Users in the nav.

**Why this priority**: Discoverability; security by not advertising admin to other roles.

**Independent Test**: Compare nav for Superadmin vs Secretary vs Staff after login.

**Acceptance Scenarios**:

1. **Given** Superadmin, **When** they view the shell, **Then** Users is visible and opens the admin screen.
2. **Given** Staff, **When** they view the shell, **Then** Users is not listed and `/users` redirects or shows forbidden.

### Edge Cases

- Duplicate email within the same association → reject; email is case-insensitive.
- Vendor without supplier → reject create/update.
- Inactive user → cannot log in; remains listed for Superadmin with status shown.
- Password below minimum length → reject with validation message.
- Superadmin edits own email to a duplicate → reject.
- Concurrent edit of the same user → last write wins; no complex locking in v1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Superadmin role distinct from Secretary, with exclusive authority to fully administer association users and roles.
- **FR-002**: Superadmin MUST be able to create a user with name, email, password, role, active flag, and optional supplier (required when role is Vendor).
- **FR-003**: Superadmin MUST be able to list all association users with role and active status (passwords never displayed).
- **FR-004**: Superadmin MUST be able to update a user’s name, email, role, supplier link, active status, and password.
- **FR-005**: System MUST reject user create/update when email is already used in the association (case-insensitive).
- **FR-006**: System MUST require a supplier when role is Vendor on create and when changing role to Vendor.
- **FR-007**: System MUST prevent removing or demoting the last active Superadmin.
- **FR-008**: System MUST deny user-administration actions to roles other than Superadmin (API and UI).
- **FR-009**: Non-Superadmin roles MUST NOT be able to assign the Superadmin role.
- **FR-010**: Newly created and role-updated users MUST receive permissions consistent with the existing role permission matrix after they authenticate.
- **FR-011**: At least one seeded Superadmin account MUST exist after database seed/reset so the association can bootstrap Users admin without a blank lockout.
- **FR-012**: Users administration MUST be reachable from the web shell navigation for Superadmin only.

### Key Entities

- **User account**: Association member identity — email, display name, role, active flag, optional supplier link; credentials are never returned in list/detail responses.
- **Role**: Named access profile (Superadmin, Secretary, Treasurer, Committee, Staff, Resident, Vendor) that drives inventory permissions.
- **Supplier link**: Optional relationship required for Vendor accounts to scope vendor portal data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Superadmin can create a working user account (login succeeds with assigned role) in under 2 minutes without using seed scripts or API tools.
- **SC-002**: 100% of create/update attempts by non-Superadmin roles are denied in both UI and API checks during verification.
- **SC-003**: Attempting to deactivate or demote the last Superadmin fails with a user-visible reason every time in verification scenarios.
- **SC-004**: After a role change and re-login, the user’s allowed inventory actions match the target role’s matrix with no residual elevated controls visible.
- **SC-005**: Duplicate-email and missing-vendor-supplier mistakes show clear corrective messages without creating partial accounts.

## Assumptions

- Superadmin is association-scoped (one association per deployment in v1), not a multi-tenant platform operator console.
- Email/password remains the only auth method; no invite email or SSO in v1 (temporary password is set by Superadmin and shared out-of-band).
- Existing Secretary “register user” API capability is superseded for full admin by Superadmin; Secretary does not manage Superadmin accounts.
- Role change effectiveness after re-login is acceptable for v1 (no forced live session revoke required).
- Builds on existing identity service, User records, and shared permission matrix from `002-role-based-auth`.
- Soft-delete of users is out of scope; deactivate (`active=false`) is the removal path.

## Related

- `025-ops-roles-home-ux` — Add Security Head / Estate Manager / Security Staff; **Role menu features** on Users page.
