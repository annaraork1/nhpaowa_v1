# Feature Specification: Flat Self-Update Link (login-free collection)

**Feature Branch**: `028-flat-self-update-link`  
**Created**: 2026-09-24  
**Status**: Active  
**Input**: Collect owner/tenant/household data for ~1705 flats without requiring web login; multi-channel drive (QR/link + paper + captains + CSV). Channel decision: login-free **tower number** lookup (e.g. `21031` / `T21031`); no phone last-4 (phones often not seeded).

## Out of scope (v1)

WhatsApp Business API bots, SMS OTP, Resident account auto-provisioning, Kannada UI i18n pack (English-first with simple wording), per-flat door sticker print vendor integration. Login-free P2 household fields on `/flat-update` (use Flats household / CSV / paper instead).

## User Scenarios & Testing

### User Story 1 - Login-free P1 verify form (Priority: P1)

Resident opens `/flat-update` (or QR), enters **tower number** (familiar full unit code such as `21031` or `T21031`), then confirms or corrects occupancy and owner/tenant contacts. Existing register details are pre-filled. No password.

**Acceptance**: Unknown tower number rejected; known tower number shows flat summary with pre-filled contacts; submit creates a PENDING self-update for staff.

### User Story 2 - Staff approve self-updates (Priority: P1)

Secretary reviews PENDING self-updates (queue at top of Flat self-updates) and approves (apply to flat/members) or rejects with reason.

**Acceptance**: Approve updates occupancy + primary / secondary / tenant contacts; rejection leaves register unchanged.

### User Story 3 - Completion dashboard (Priority: P1)

Flats list / Flat self-updates shows collection phase (SEED / P1_VERIFIED / P2_HOUSEHOLD) and tower completion % for chase lists.

**Acceptance**: Filter by incomplete P1; export CSV includes phase column.

### User Story 4 - QR / share link sheet (Priority: P2)

Staff downloads a printable notice PDF or CSV of per-unit update URLs for WhatsApp/notice boards.

**Acceptance**: Link opens public form; optional `?flat=21031` or `?towerNumber=T21031` prefill.

### User Story 5 - Paper form aligned to CSV (Priority: P2)

Downloadable multi-flat A4 sheets (`/flat-update/paper`) with density options (4 / 6 / 8 / 10 / 12 card blocks per page, or a **12+ table**). Captains collect offline; office imports via existing 015 import.

**Acceptance**: One A4 can capture multiple flats; fields cover tower number + P1 contacts; maps to CSV / register.

## Requirements

- **FR-001**: Public (unauthenticated) verify + submit endpoints scoped to association.
- **FR-002**: Verify with **tower number** (`towerNumber`, e.g. `21031` / `T21031`) resolving to tower + flatNumber. Legacy `{ tower, flatNumber }` and `campusFlatId` alias accepted. No phone check.
- **FR-003**: Successful verify issues a short-lived opaque token (≤30 min) bound to flatId; response includes existing primary / secondary / tenant fields when present.
- **FR-004**: P1 submit stores FlatSelfUpdate PENDING with occupancy + primary / secondary / tenant contacts payload.
- **FR-005**: Staff with flatOwners createEdit can list/approve/reject PENDING self-updates.
- **FR-006**: Flat.collectionPhase: SEED | P1_VERIFIED | P2_HOUSEHOLD; auto SEED on create; set P1_VERIFIED on approve of P1; P2 via Flats household / CSV (not public P1 form).
- **FR-007**: Completion summary API by tower (counts per phase).
- **FR-008**: Public form UI labels the lookup field **Tower number** (not “campus flat id”); large controls; English plain language; no Resident JWT required.
- **FR-009**: Ops docs for P0 CSV seed before the drive (INSTALL + quickstart).

## Success Criteria

- **SC-001**: Resident without an account can submit P1 for a seeded flat in under 3 minutes on a phone browser using tower number alone.
- **SC-002**: Secretary can clear a PENDING queue of 50 submissions in a working session.
- **SC-003**: Staff can see which towers are below 70% P1_VERIFIED.
- **SC-004**: Paper → CSV import path remains documented and works with existing 015 template.

## Assumptions

- Single association deployment (ASSOCIATION_ID).
- Residents know their tower number as the full unit code (e.g. 21031), not separate tower vs flat fields.
- OTP-to-phone remains a later enhancement if needed.
