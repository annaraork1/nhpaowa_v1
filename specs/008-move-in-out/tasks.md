# Tasks: Move-in / Move-out / Internal shift

- [x] Prior 008 baseline (MOVE_IN / MOVE_OUT)
- [x] T020 Add `destinationFlatId` + INTERNAL_SHIFT to Prisma; db push
- [x] T021 API create/validate INTERNAL_SHIFT; overlap on origin or destination; complete transfers members + occupancy
- [x] T022 MovesPage: type Internal shift, destination flat picker, list/gate labels origin → destination
- [x] T023 Seed one sample INTERNAL_SHIFT; update ASSOCIATION-ROADMAP
- [x] T024 Smoke create/complete internal shift

## Phase 6: Household transfer + searchable pickers

- [x] T025 On INTERNAL_SHIFT complete, transfer APPROVED parking/vehicles/pets/contacts/devices to destination
- [x] T026 MovesPage uses FlatSearchSelect for origin + destination (FR-010)
- [x] T027 Update contracts/data-model notes for household transfer; smoke shift with vehicle

## Phase 7: Approved-move PDF gate pass

- [x] T028 `lib/movePdf.js` — letterhead PDF stream (logo, board, president signature)
- [x] T029 `GET /moves/:id/pdf` — only APPROVED | IN_PROGRESS | COMPLETED
- [x] T030 Client `moves.downloadPdf` + MovesPage Download PDF action
- [x] T031 Smoke: approve move → PDF Content-Type application/pdf; REJECTED returns 400

## Phase 8: Details, history, attachments

- [x] T032 Prisma `MoveAttachment` + relation; db push
- [x] T033 `GET /moves/:id` with statusEvents + attachments; upload/delete attachment routes
- [x] T034 MovesPage Details panel: progress timeline + attach/download
- [x] T035 Smoke: approve → details history; upload PDF → listed

## Phase 9: Today-at-gate date fix

- [x] T036 Fix `date=today` to use association calendar day (not local `toDateString` UTC skew)
- [x] T037 Gate today defaults to APPROVED|IN_PROGRESS; update US-3 / FR-007 / SC-003
- [x] T038 Shared `associationCalendarYmd` in `@nhpaowa/shared-ui`; attendance/reports/moves use it
