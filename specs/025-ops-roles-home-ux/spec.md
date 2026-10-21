# Feature Specification: Ops Roles, Menu Features, Home Cards & Flat Picker UX

**Feature Branch**: `025-ops-roles-home-ux`  
**Created**: 2026-09-23  
**Status**: Active  
**Input**: Internal team review — Superadmin add users/roles (Security Head, Estate Manager, Security Staff); assign left-menu features; home cards for easy actions; non-technical UX; flat search from seeded list with clear not-found; Users menu on top for Superadmin.

## User Scenarios & Testing

### User Story 1 - Ops login roles & user provisioning (Priority: P1)

Superadmin creates users with roles **Security Head**, **Estate Manager**, and **Security Staff** (in addition to existing roles). Those users can log in and see only features they are allowed.

**Acceptance**:
1. Roles appear in Users create/edit dropdown and `/api/auth/roles`.
2. Created Security Staff can log in; permissions match defaults until menu overrides change them.

### User Story 2 - Superadmin assigns left-menu features (Priority: P1)

On Users (or Role features panel), Superadmin toggles which left-nav features each ops role may see. Changes apply on next login (or immediately after re-fetch of session features).

**Acceptance**:
1. Superadmin enables Moves + Attendance for Security Staff, disables inventory Items → Security Staff nav shows Moves/Attendance only (plus Home).
2. Non-Superadmin cannot change role features.

### User Story 3 - Home screen action cards (Priority: P1)

After login, staff/ops users see **Home** (`/`) with large cards for each feature they can access. **Dashboard** (`/dashboard`) is a separate inventory charts page. Clicking a Home card goes straight to that screen.

**Acceptance**:
1. Home and Dashboard are distinct nav items and routes for all staff users who have permission.
2. Security Staff home shows cards only for permitted features.
3. Cards navigate to the correct route.
4. Inventory Dashboard is reached via its own menu item / Home card (not mixed into Home).

### User Story 4 - Flat picker: seeded list + not found (Priority: P1)

Everywhere FlatSearchSelect is used (NOC, Moves, etc.), the control loads the association flat register (seeded flats), shows a filterable list, and if the typed query matches nothing, shows: **“This flat is not in the register.”**

**Acceptance**:
1. Focusing the field shows flats from the register (filterable).
2. Wrong search (no match) shows the not-found message (not a blank failure).
3. Selecting a listed flat sets the value.

### User Story 5 - Superadmin nav: Users near top (Priority: P2)

For Superadmin, **Users** appears near the top of the left menu (immediately after Home/Dashboard), before association/inventory modules.

**Acceptance**:
1. Superadmin sees Users as the second nav item (after Home).
2. Other roles that cannot view Users are unchanged.

## Requirements

- **FR-001**: Add platform roles `SECURITY_HEAD`, `ESTATE_MANAGER`, `SECURITY_STAFF` with sensible default matrix permissions (association ops; no user admin).
- **FR-002**: Persist per-association per-role menu feature toggles; Superadmin CRUD via API + UI.
- **FR-003**: Login / session exposes effective menu feature list for the user role.
- **FR-004**: Web `can(..., 'view')` and left nav honour menu features for customizable ops roles.
- **FR-005**: Home page shows large action cards from permitted nav features.
- **FR-006**: FlatSearchSelect uses preloaded flat register + client filter + fixed not-found copy.
- **FR-007**: Superadmin nav order puts Users after Home.

## Out of scope

- Fully free-form custom role names beyond the three ops roles.
- Per-user (not per-role) feature matrix.
- Changing createEdit/delete matrix via UI (view/menu only for v1).

## Success criteria

- Superadmin can provision a Security Staff user and limit them to Moves + Attendance in under 5 minutes.
- Gate staff find a flat from the picker without typing an exact API query pattern.
- Home cards reduce “where do I click?” for non-technical users.
