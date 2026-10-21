# Tasks: Flats List Search, Filters & Alignment

**Input**: Design documents from `/specs/023-flats-list-filters/`  
**Prerequisites**: plan.md, spec.md, research.md, contracts/

## Phase 1: Setup

- [x] T001 Cross-link 023 from `specs/005-flat-owners/spec.md` (FR-006) and `specs/022-tower-registry-seed/spec.md`
- [x] T002 Write `specs/023-flats-list-filters` artifacts (spec/plan/research/contracts/quickstart)

## Phase 2: Foundational

- [x] T003 [P] Add `parseCampusFlatQuery` in `packages/shared-ui/src/towerCatalog.js` and export via index
- [x] T004 Extend GET `/flats` in `services/inventory-service/src/routes/association.js` with campus-id `q` match + `floor` + `occupancyStatus` filters

## Phase 3: US1 Search (P1)

- [x] T005 [US1] Update `apps/web/src/modules/inventory/api/client.js` `association.flats.list` to accept params object (`q`, `tower`, `floor`, `occupancyStatus`, `apartmentType`)
- [x] T006 [US1] Wire debounced `q` through new list params on `FlatsPage.jsx`; fix empty-state copy for no matches vs no flats

## Phase 4: US2 Filters (P1)

- [x] T007 [US2] Add Tower / Floor / Occupancy / Apartment type filter bar + Clear + result count on `FlatsPage.jsx` (Items-style panel)

## Phase 5: US3 Alignment (P2)

- [x] T008 [US3] Align desktop table Flat/Actions columns in `FlatsPage.jsx` (Actions th/td `text-right`, consistent padding); pending approvals use column table

## Phase 6: Polish

- [x] T009 Smoke helpers (`parseCampusFlatQuery`); mark tasks complete; set spec Status Implemented
