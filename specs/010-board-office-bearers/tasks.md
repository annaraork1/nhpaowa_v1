# Tasks: Board & Office Bearers

**Input**: `/specs/010-board-office-bearers/`

## Phase 1: Setup

- [x] T001 Add `board` permissions in `packages/shared-auth/src/permissions.js`
- [x] T002 Prisma models `OfficeBearerRole` + `OfficeBearerMember`; db push

## Phase 2: Foundational

- [x] T003 Seed NHPAOWA board (FR-004 names) in `prisma/seed.js`
- [x] T004 `loadLetterheadBoard(prisma, associationId)` in `associationBrand.js`; use in notice + report PDFs

## Phase 3: US1–US2 API + Superadmin UI

- [x] T005 Routes `/board/roles`, `/board/members`, `/board/letterhead` in `association.js`
- [x] T006 Client API `association.board.*` in `client.js`
- [x] T007 `BoardPage.jsx` Superadmin CRUD for roles + members
- [x] T008 Nav `/board` for Superadmin (and Secretary view)

## Phase 4: US3 Letterhead consumers

- [x] T009 NOC print + web `brand.js` load `/board/letterhead`
- [x] T010 Regenerate published notice PDFs after seed

## Phase 5: Polish

- [x] T011 Update ASSOCIATION-ROADMAP.md + 009 letterhead assumption note
- [ ] T012 Smoke quickstart
