# Tasks: Role-Based Auth & Access Control

**Input**: Design documents from `/specs/002-role-based-auth/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[US#]**: User story from spec.md

## Phase 1: Setup

- [x] T001 Confirm feature docs under `specs/002-role-based-auth/` and `.specify/feature.json` points here
- [x] T002 [P] Seed a RESIDENT user in `services/inventory-service/prisma/seed.js` for RBAC demos

## Phase 2: Foundational (blocking)

- [x] T003 Extend `packages/shared-auth/src/index.js` with `PERMISSIONS` matrix, `can(role, resource, action)`, `requirePermission(resource, action)`
- [x] T004 Export matrix helpers for web reuse (same package or duplicated thin copy under `apps/web/.../auth/permissions.js` importing constants if possible)
- [x] T005 Wire inventory `createApp` / routes to use `requirePermission` for write/delete/approve (keep existing approver semantics aligned)

**Checkpoint**: Permission helper unit-testable; APIs can deny by role

## Phase 3: User Story 1 — Email login (P1)

- [x] T006 [US1] Ensure LoginPage is default gate; remove “continue with stub” as primary path (optional small “Dev stub” link only if `import.meta.env.DEV`)
- [x] T007 [US1] App `AuthGate`: no token → redirect `/login`; with token load user role for shell
- [x] T008 [US1] client.js: on 401 clear session and redirect to login; stop using role dropdown when token present

**Checkpoint**: Email login required for web shell

## Phase 4: User Story 2 — View/Edit/Delete by role (P1)

- [x] T009 [P] [US2] Add `Can` component + `usePermissions()` hook in web
- [x] T010 [US2] Wrap Items/Categories/Suppliers Create/Edit/Delete with Can (createEdit/delete)
- [x] T011 [US2] Wrap Stock, PO actions, Settings, Warehouses, Requisitions, AMC buttons with Can
- [x] T012 [US2] Apply API `requirePermission` on DELETE routes and tighten STAFF/RESIDENT/VENDOR denials
- [x] T013 [US2] Jest test `services/inventory-service/tests/rbac.test.js` for Resident 403 write, Staff 403 delete item, Secretary 204 delete

**Checkpoint**: Matrix enforced UI + API

## Phase 5: User Story 3 — Session lifecycle (P2)

- [x] T014 [US3] Sign-out clears token/user and navigates to `/login`
- [x] T015 [US3] Protected routes list covers all inventory pages except `/login`

## Phase 6: User Story 4 — Nav by role (P3)

- [x] T016 [US4] Filter sidebar nav by `view` permission / vendor-only set
- [x] T017 [US4] After vendor login navigate to `/vendor`; block vendor from admin write routes in UI

## Phase 7: Polish

- [x] T018 [P] Update README auth section with RBAC matrix pointer to spec
- [x] T019 Run quickstart checks; mark tasks complete

## Dependencies

- Phase 2 before Phase 3–6
- US1 before US3 (gate needs login)
- US2 can start after T003–T005
- US4 after US1

## Parallel example

```text
T009 Can component || T012 API requirePermission on DELETEs
T010 Items Can || T011 Stock/PO Can
```

## Implementation strategy

MVP = Phase 2 + US1 + US2 (T003–T013), then US3/US4 polish.
