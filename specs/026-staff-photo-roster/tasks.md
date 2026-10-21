# Tasks: 026 Staff Photo on Check-in Roster

**Feature**: `026-staff-photo-roster`  
**Depends on**: 007, 011, 016, 019  
**Status**: Implemented — tasks marked complete (retroactive SDD)

## Phase 1 — Spec / design

- [x] T001 Spec, research, plan, data-model, contracts, quickstart; cross-link 007 + roadmap

## Phase 2 — Backend

- [x] T002 Prisma `AssociationStaff.photoUrl` + db push / generate
- [x] T003 Multer `POST /staff/photo` under `uploads/staff`
- [x] T004 Accept `photoUrl` on `POST /staff` and `PATCH /staff/:id`

## Phase 3 — Frontend

- [x] T005 Client `uploadPhoto` + FormData assoc request
- [x] T006 Add staff form photo upload + preview
- [x] T007 Roster desktop + mobile avatars (`EntityCard` avatar)
- [x] T008 View preview dialog vs camera badge for change/upload

## Phase 4 — Verify

- [x] T009 Smoke: create with photo, view, change, punch still works
