# Tasks: Superadmin User & Role Administration

**Input**: Design documents from `/specs/004-user-admin/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/user-admin.md

**Tests**: Include API tests for Superadmin guards and last-Superadmin safeguard.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: [US1]…[US4] maps to spec user stories

---

## Phase 1: Setup

- [x] T001 Confirm feature docs under `specs/004-user-admin/` and set `.specify/feature.json` to `specs/004-user-admin`

---

## Phase 2: Foundational (shared-auth + seed)

- [x] T002 [P] Add `SUPERADMIN` to `ROLES` and grant full inventory + `users` view/createEdit in `packages/shared-auth/src/permissions.js`
- [x] T003 [P] Mirror SUPERADMIN + users permissions in `apps/web/src/modules/inventory/auth/permissions.js`
- [x] T004 Seed `superadmin@nhpaowa.local` (and keep existing users) in `services/inventory-service/prisma/seed.js`; document in `README.md` login table
- [x] T005 Restrict legacy `users` permissions so only SUPERADMIN has view/createEdit (Secretary no longer manages users)

---

## Phase 3: User Story 1 — Create user (P1)

**Goal**: Superadmin creates users with role (+ supplier for Vendor) via API and UI.  
**Independent Test**: Create Staff → login as Staff works.

- [x] T006 [US1] Implement `POST /api/auth/users` (Superadmin) with Zod validation in `services/identity-service/src/index.js`; align `POST /api/auth/register` to Superadmin-only
- [x] T007 [US1] Add `GET /api/auth/roles` for role dropdown in identity-service
- [x] T008 [US1] Add web API helpers for users/roles in `apps/web/src/modules/inventory/api/client.js`
- [x] T009 [US1] Build create form on `apps/web/src/modules/inventory/pages/UsersPage.jsx` (name, email, password, role, supplier when Vendor)
- [x] T010 [US1] Wire `/users` route + Superadmin-only nav in `apps/web/src/App.jsx`

---

## Phase 4: User Story 2 — List & update (P1)

**Goal**: List users; update role/name/email/password/active/supplier.  
**Independent Test**: Role change + deactivate verified by re-login.

- [x] T011 [US2] Implement `GET /api/auth/users` Superadmin-only in identity-service
- [x] T012 [US2] Implement `PATCH /api/auth/users/:id` (optional password) in identity-service
- [x] T013 [US2] Extend UsersPage with table, edit, deactivate/activate, password reset fields
- [x] T014 [US2] Load suppliers list for Vendor dropdown from inventory API on UsersPage

---

## Phase 5: User Story 3 — Safeguards (P2)

**Goal**: Last Superadmin cannot be demoted/deactivated; non-Superadmin cannot assign SUPERADMIN.  
**Independent Test**: API returns 400/403 as specified.

- [x] T015 [US3] Enforce last-active-Superadmin check on PATCH in identity-service
- [x] T016 [US3] Reject role=SUPERADMIN from non-Superadmin callers; block Secretary from users routes
- [x] T017 [US3] Add Jest tests in `services/identity-service` or inventory tests covering create/list/patch/last-superadmin/403

---

## Phase 6: User Story 4 — Nav & guidance (P3)

- [x] T018 [US4] Hide Users nav unless `can('users','view')`; forbidden empty state if route hit without permission
- [x] T019 [US4] Add short page subtitle explaining Superadmin bootstrap account

---

## Phase 7: Polish

- [x] T020 [P] Update README login table with Superadmin
- [x] T021 Run identity/user admin smoke per `quickstart.md` and fix gaps
- [x] T022 Mark checklist items complete in `specs/004-user-admin/checklists/requirements.md` if needed

---

## Dependencies

- Phase 2 before Phase 3–6
- US1 (create) before US2 (edit) preferred; list can ship with create
- US3 after PATCH exists
- US4 after route exists

## Parallel opportunities

- T002/T003/T004 in parallel after T001
- T006/T007 parallel; T008 after contracts stable
- T017 after T015–T016

## MVP

T001–T010 + T011–T013 delivers create/list/basic edit for Superadmin.

## Implementation strategy

1. Shared-auth + seed Superadmin  
2. Identity CRUD + safeguards  
3. UsersPage + nav  
4. Tests + README  
