# Tasks: Resident Portal

**Feature**: `014-resident-portal`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1 — Specs & permissions

- [x] T001 Write spec / plan / research / data-model / contracts / quickstart / checklist
- [x] T002 Tighten RESIDENT permissions in `packages/shared-auth/src/permissions.js`
- [x] T003 Update ASSOCIATION-ROADMAP + 002 / 005 / 006 / 008 / 013 notes for resident self-service

## Phase 2 — API & seed

- [x] T004 Add `residentScope.js` helpers; scope flats / noc / moves lists & creates; block flat CRUD + staff transitions for RESIDENT
- [x] T005 Seed: link `resident@nhpaowa.local` → Tower 1 Flat 101 PRIMARY_OWNER via `userId`

## Phase 3 — UI

- [x] T006 Resident home page + App nav labels / route for RESIDENT
- [x] T007 FlatsPage resident mode (my flats only chrome; no create / pending queue)
- [x] T008 NocPage / MovesPage: allow create; hide staff workflow actions for RESIDENT
- [x] T009 Login demo hint for tower sample resident

## Phase 5 — Members + request attachments (delta)

- [x] T011 Spec: resident add Associate/Tenant members; NOC + move attachments (014/005/006/008)
- [x] T012 API: member create for linked residents; NocAttachment model + routes; resident move attachments
- [x] T013 UI: My flat + Add member; NOC paperclip attachments; Moves details upload for residents
- [x] T014 Smoke SMOKE_PASS (member TENANT, PRIMARY denied, NOC+move attachments 201)
