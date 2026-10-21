# Tasks: Resident Notices (PDF)

**Input**: Design documents from `/specs/009-resident-notices/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Add `pdfkit` dependency to `services/inventory-service/package.json` (already present)
- [x] T002 [P] Add `NOTICE_PUBLISHED` to `packages/shared-notifications/src/index.js` ALERT_TYPES

---

## Phase 2: Foundational

- [x] T003 Add `notices` permission resource in `packages/shared-auth/src/permissions.js`
- [x] T004 Add Prisma models `Notice` + `NoticeStatusEvent`; db push
- [x] T005 Create `services/inventory-service/src/lib/noticePdf.js` (PDFKit circular generator)

**Checkpoint**: Schema + permissions + PDF helper ready

---

## Phase 3: User Story 1 - Draft and publish (P1) MVP

**Goal**: Secretary creates draft notices and publishes with PDF generation  
**Independent Test**: Create → publish → download PDF with title/body/issuer

- [x] T006 [US1] Implement notices CRUD + publish routes in `services/inventory-service/src/routes/association.js`
- [x] T007 [US1] Wire PDF generation + status events on publish; emit shared notification
- [x] T008 [US1] Add `association.notices` client methods in `apps/web/src/modules/inventory/api/client.js`
- [x] T009 [US1] Build admin create/list/publish UI in `apps/web/src/modules/association/pages/NoticesPage.jsx`
- [x] T010 [US1] Register `/notices` nav + route in `apps/web/src/App.jsx`

**Checkpoint**: Secretary can publish and download PDF

---

## Phase 4: User Story 2 - Residents browse published (P1)

**Goal**: Residents see only PUBLISHED notices and download PDF  
**Independent Test**: Mixed statuses → resident list shows published only

- [x] T011 [US2] Enforce published-only filter for RESIDENT on list/get/pdf endpoints
- [x] T012 [US2] Resident-friendly list + detail + PDF download on NoticesPage (role-aware)

**Checkpoint**: Resident visibility correct

---

## Phase 5: User Story 3 - Unpublish / archive (P2)

**Goal**: Unpublish/archive retains PDF; republish restores visibility  
**Independent Test**: Unpublish hides from residents; admin retains PDF

- [x] T013 [US3] Add unpublish + archive (+ republish via publish) actions in API
- [x] T014 [US3] Admin action buttons + status badges on NoticesPage

**Checkpoint**: Lifecycle complete

---

## Phase 6: Polish

- [x] T015 Ensure uploads dir `uploads/` gitignored (already)
- [ ] T016 Smoke quickstart.md flows (manual — restart inventory-service after prisma generate if locked)

---

## Dependencies

- Setup → Foundational → US1 → US2 → US3 → Polish
- US2 depends on US1 list/pdf endpoints
- US3 depends on US1 publish path

## Implementation Strategy

MVP = Phase 1–3 (draft + publish + PDF). Then resident view, then unpublish/archive.
