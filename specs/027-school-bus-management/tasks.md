# Tasks: 027 School Bus Management

- [x] T001 Spec / plan / research / data-model / contracts / quickstart
- [x] T002 schoolBus permissions + menu feature
- [x] T003 bus-service scaffold + Prisma bus_tracking
- [x] T004 Registry CRUD APIs
- [x] T005 Gate IN/OUT + live + today + resident
- [x] T006 Alerts job + CSV reports
- [x] T007 Web pages + nav + proxy
- [x] T008 Root scripts, compose, env, docs, seed

## Phase: Security Staff RBAC split (FR-008 / FR-010)

- [x] T009 [P] Add `schoolBusAdmin` to MENU_FEATURE_RESOURCES and PERMISSIONS matrix in `packages/shared-auth/src/permissions.js`
- [x] T010 [P] Update `specs/027-school-bus-management` plan/research/contracts/quickstart for RBAC
- [x] T011 Require `schoolBusAdmin` on registry/batches/slots/settings/CSV/PDF routes in `services/bus-service/src/routes/bus.js`
- [x] T012 Point Schools & buses + Bus batches nav to `schoolBusAdmin` in `apps/web/src/App.jsx`
- [x] T013 Gate SchoolsBusesPage / BatchesSlotsPage on `schoolBusAdmin` in page components
- [x] T014 Update INSTALL-WINDOWS §15 role table for Security Staff vs admin
- [x] T015 Smoke: Security Staff Forbidden on POST /schools; OK on gate today + reports
