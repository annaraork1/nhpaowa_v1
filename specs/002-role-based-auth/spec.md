# Feature Specification: Role-Based Auth & Access Control

**Feature Branch**: `002-role-based-auth`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Auth, login page, email ID login with Role — access handled with view, edit, and delete options based on the role. Create a spec and implement using SDD in loop."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email login loads role (Priority: P1)

An association user opens the app, signs in with their email and password, and lands in the inventory shell already identified with their assigned role (Secretary, Treasurer, Committee, Staff, Resident, or Vendor). They do not pick a role manually.

**Why this priority**: Without trusted identity, every other permission rule is insecure or cosmetic.

**Independent Test**: Sign in as `secretary@…` and as `resident@…`; each session shows the correct display name and role and cannot impersonate the other.

**Acceptance Scenarios**:

1. **Given** a seeded active user with email and password, **When** they submit correct credentials on the login page, **Then** they enter the app and their role matches the account record.
2. **Given** wrong password or unknown email, **When** they submit, **Then** login fails with a clear message and no session is created.
3. **Given** an inactive user, **When** they attempt login, **Then** access is denied.

---

### User Story 2 - View / edit / delete by role (Priority: P1)

After login, the user only sees actions they are allowed to perform. View-only roles can browse allowed screens but cannot create, edit, or delete. Write roles see Create/Edit where permitted. Delete (soft-delete of master data) is limited to privileged roles. Approval actions remain limited to approvers.

**Why this priority**: Core ask — access must be role-driven for view, edit, and delete.

**Independent Test**: Log in as Resident: association self-service visible (my flat, notices, NOC, moves); inventory nav absent and write APIs reject. Log in as Secretary: full controls work. Log in as Staff: stock write works; item delete and settings do not.

**Acceptance Scenarios**:

1. **Given** a Resident session, **When** they open the shell, **Then** they see Home / My flat / Notices / NOC / Moves (not Items), and inventory write APIs reject (see `014-resident-portal`).
2. **Given** a Staff session, **When** they record stock in/out, **Then** it succeeds; **When** they attempt to delete an item or change settings, **Then** the UI hides those actions and the API rejects them.
3. **Given** a Secretary session, **When** they create, edit, or soft-delete master data and update settings, **Then** those actions succeed.
4. **Given** a Treasurer session, **When** they approve a pending purchase order, **Then** approval succeeds; settings remain Secretary-only.
5. **Given** a Vendor session, **When** they open the vendor portal, **Then** they only see purchase orders for their linked supplier.

---

### User Story 3 - Session required for inventory shell (Priority: P2)

Unauthenticated visitors are sent to the login page. After sign-out, protected screens are inaccessible until they sign in again. Dev role stub remains available only when strict auth is off and no real session exists (local development convenience).

**Why this priority**: Makes login the real entry path while preserving local stub when explicitly allowed.

**Independent Test**: Clear session → visit `/items` → redirected to login. Sign in → access granted. Sign out → redirected again.

**Acceptance Scenarios**:

1. **Given** no session, **When** the user opens a protected route, **Then** they are redirected to login.
2. **Given** an active session, **When** they sign out, **Then** the session is cleared and protected routes require login again.

---

### User Story 4 - Permission-aware navigation (Priority: P3)

Navigation and screens adapt to role: Residents do not see financial/settings/admin areas; Vendors land on / are steered to the vendor portal; write actions on visible screens still respect the matrix.

**Why this priority**: Improves clarity; security still enforced by P1 API rules.

**Independent Test**: Compare nav for Resident vs Secretary vs Vendor after login.

**Acceptance Scenarios**:

1. **Given** a Resident, **When** they view the shell, **Then** inventory, attendance, users, board admin, and settings are hidden; they see resident self-service modules only (`014-resident-portal`).
2. **Given** a Vendor, **When** they sign in, **Then** they are taken to the vendor portal and cannot access association admin inventory write screens.

### Edge Cases

- Expired or tampered session token → treat as logged out; prompt to sign in again.
- Vendor account without linked supplier → login may succeed but vendor APIs deny access with a clear error.
- User with role that can view but not delete → Edit may be allowed while Delete stays hidden/rejected.
- Concurrent role change by admin → next authenticated request uses the token’s role until re-login (v1 accepts re-login for role refresh).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users by email and password against association user accounts.
- **FR-002**: System MUST assign access from the user’s stored role after successful login (not from a client-chosen role when a real session exists).
- **FR-003**: System MUST support platform roles: Secretary, Treasurer, Committee, Staff, Resident, Vendor.
- **FR-004**: System MUST enforce a permission matrix of at least **view**, **create/edit**, and **delete** (plus approve where applicable) per inventory capability.
- **FR-005**: System MUST hide or disable Create, Edit, and Delete controls in the web UI when the signed-in role lacks that permission.
- **FR-006**: System MUST reject unauthorized write/delete/approve API requests even if the UI is bypassed.
- **FR-007**: System MUST provide a login page as the default entry for the web inventory shell when no session exists.
- **FR-008**: System MUST allow the user to sign out and clear their session.
- **FR-009**: Vendor role MUST be limited to supplier-scoped purchase order visibility.
- **FR-010**: Settings changes (e.g. approval threshold, auto-PR) MUST be Secretary-only.
- **FR-011**: Soft-delete of Items, Categories, and Suppliers MUST be limited to Secretary (and optionally Treasurer for suppliers — default: Secretary only).
- **FR-012**: Staff MUST be able to perform operational stock in/out and PO receive without master-data delete or settings access.

### Key Entities

- **User**: Association member or vendor account (email, name, role, active flag, optional supplier link).
- **Session**: Authenticated identity proving who the user is and which role applies.
- **Permission**: Capability grant (view / create-edit / delete / approve) for a resource area (items, categories, suppliers, stock, purchase orders, reports, settings, vendor portal).

### Default permission matrix (normative for v1)

| Role | View inventory | Create/Edit master data | Delete master data | Stock in/out & receive | Approve PO | Settings | Vendor portal |
|------|----------------|-------------------------|--------------------|------------------------|------------|----------|---------------|
| Secretary | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Treasurer | Yes | Limited (PO-related; no category/item delete) | No | Yes | Yes | No | No |
| Committee | Yes | Yes (master data create/edit) | No | Yes | No | No | No |
| Staff | Yes | No | No | Yes | No | No | No |
| Resident | Yes (read-only screens) | No | No | No | No | No | No |
| Vendor | Own POs only | No | No | No | No | No | Yes |

*Limited Treasurer*: can create/edit purchase orders and view all; cannot soft-delete items/categories/suppliers; cannot edit association settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with valid credentials completes login and reaches an allowed home screen in under 30 seconds.
- **SC-002**: For each role in the matrix, 100% of sampled Create/Edit/Delete UI actions match the matrix (allowed actions work; disallowed actions are not offered).
- **SC-003**: For each role, unauthorized API write/delete attempts return a clear denial (no silent success) in 100% of automated permission checks.
- **SC-004**: Unauthenticated access to protected inventory screens redirects to login in 100% of tried routes.
- **SC-005**: Vendor users never see another supplier’s purchase orders in the portal.

## Assumptions

- Reuse the existing identity service and User records; extend permissions rather than invent a second identity store.
- Email/password is the v1 method (no SSO/OAuth in this feature).
- Soft-delete remains the only delete for master data.
- Mobile app may continue using stub headers until a follow-up; web is in scope for mandatory login + RBAC UI.
- When `AUTH_STRICT` is false and no JWT session exists, the existing `X-Dev-Role` stub may still work for local API testing; the web shell prefers real login.
- Password reset / self-registration for residents is out of scope (Secretary registers users).

## Related

- `025-ops-roles-home-ux` — Security Head / Estate Manager / Security Staff roles; Superadmin assigns left-menu features per role.
