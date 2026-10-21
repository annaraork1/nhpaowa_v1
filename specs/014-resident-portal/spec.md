# Feature Specification: Resident Portal (Tower Sample Login)

**Feature Branch**: `014-resident-portal`  
**Created**: 2026-09-21  
**Status**: Implemented  
**Depends on**: `002-role-based-auth`, `005-flat-owners`, `006-noc-certificates`, `008-move-in-out`, `009-resident-notices`, `013-flat-vehicles-pets-parking`  
**Input**: Provide a working sample resident login linked to a tower flat, with a resident-scoped experience (my flat / household submissions, notices, request NOC, request moves) — not the staff inventory shell. Update related specs accordingly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sample tower resident can sign in (Priority: P1)

Demo seed includes a RESIDENT account linked to a specific tower flat (e.g. Tower 1 / 101). After login, the session shows Resident role and the user’s name; navigation is limited to resident-relevant areas (home, my flat, notices, NOC, moves) — not inventory, attendance, users, or board admin.

**Why this priority**: Without a linked sample user, household submit and self-service stay untestable.

**Independent Test**: Sign in as the seeded resident → nav shows only resident modules → My Flat shows Tower 1 Flat 101 (or the seeded unit).

**Acceptance Scenarios**:

1. **Given** a fresh seed, **When** signing in with the sample resident credentials, **Then** login succeeds and role is RESIDENT.
2. **Given** that session, **When** viewing navigation, **Then** inventory / attendance / users / board admin entries are absent.
3. **Given** that session, **When** opening My Flat, **Then** only flats linked via FlatMember.userId appear (at least the sample tower unit).

---

### User Story 2 - My flat & household self-service (Priority: P1)

The resident opens their flat, views members and household register data, **adds co-residents / tenants as flat members** (associate owner or tenant), and submits vehicles / pets / emergency contacts / access devices for approval (PENDING until Secretary approves). They cannot create/edit/delete flats, parking inventory, change primary owner, or other residents’ flats.

**Why this priority**: Core self-service promised by 013 resident submit.

**Independent Test**: Resident adds an ASSOCIATE_OWNER on their flat; submits a vehicle → PENDING; attempting household write on an unlinked flat fails.

**Acceptance Scenarios**:

1. **Given** a linked resident, **When** they submit a vehicle / pet / contact / device on their flat, **Then** status is PENDING.
2. **Given** an unlinked flat id, **When** they attempt a household write, **Then** the system denies access.
3. **Given** a resident session, **When** they attempt to create or delete a flat, **Then** the action is denied.
4. **Given** a linked resident, **When** they add a member with role Associate owner or Tenant on their flat, **Then** the member appears on that flat.
5. **Given** a linked resident, **When** they attempt to add a Primary owner (or manage another flat’s members), **Then** the system denies it.

---

### User Story 3 - Request NOC for own flat (Priority: P1)

Resident creates an NOC request for a linked flat (purpose, applicant details) and **may attach supporting documents** (images/PDF). They see only their own NOCs with attachments. They cannot issue, reject, or cancel NOCs (staff only).

**Independent Test**: Resident submits Sale NOC for their flat with a PDF attachment → SUBMITTED with downloadable file; issue action is unavailable; API issue returns forbidden.

**Acceptance Scenarios**:

1. **Given** a linked resident, **When** they create an NOC for their flat, **Then** status is SUBMITTED and it appears in their list.
2. **Given** another flat’s NOC, **When** the resident lists NOCs, **Then** it does not appear.
3. **Given** a resident session, **When** they attempt issue/reject/cancel, **Then** the system denies it.
4. **Given** an open NOC for their flat, **When** they upload an attachment, **Then** it is listed and downloadable on that request.

---

### User Story 4 - Request move for own flat (Priority: P1)

Resident creates MOVE_IN / MOVE_OUT / INTERNAL_SHIFT for a linked flat (and destination for shift) and **may upload attachments** (ID, agreement, police ack, etc.) on their own moves. They see only moves involving their linked flats. They cannot approve, start, complete, reject, or cancel moves (staff only). Gate PDF remains available when staff has approved and status allows download.

**Independent Test**: Resident creates MOVE_OUT for their flat → REQUESTED; uploads an attachment → listed; approve controls hidden; API approve forbidden.

**Acceptance Scenarios**:

1. **Given** a linked resident, **When** they create a move for their flat, **Then** status is REQUESTED.
2. **Given** moves for other flats, **When** they list moves, **Then** only moves for their linked flats appear.
3. **Given** a resident session, **When** they attempt approve/start/complete, **Then** the system denies it.
4. **Given** their move request, **When** they upload an attachment, **Then** it appears in move details and is downloadable.

---

### User Story 5 - Browse published notices (Priority: P1)

Resident lists and downloads only PUBLISHED notices (existing 009 behavior), reachable from the resident shell.

**Independent Test**: With published + draft notices, resident sees only published.

---

### User Story 6 - Resident home summary (Priority: P2)

Home / dashboard for residents summarizes their flat label(s), counts of open NOCs / moves, pending household submissions, and shortcuts to Notices / My Flat / Request NOC / Request move — not inventory charts.

**Independent Test**: Resident home shows Tower 1-101 and links; no stock value charts.

---

### Edge Cases

- Resident with no FlatMember.userId link — My Flat empty; writes denied; clear empty state.
- Resident linked to multiple flats — all linked flats visible; requests must pick one of them.
- INTERNAL_SHIFT destination must be a valid association flat; origin must be linked to the resident.
- Staff views remain association-wide (unaffected).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Seed MUST include a RESIDENT user linked via `FlatMember.userId` to a sample tower flat (document credentials in quickstart / login hint).
- **FR-002**: RESIDENT permissions MUST exclude inventory, attendance, users, board admin, settings, and vendor modules; MUST allow dashboard, notices (view), flatOwners (view + household createEdit scoped), noc (view + create for own flat), moves (view + create for own flat).
- **FR-003**: List endpoints for flats, NOCs, and moves MUST scope RESIDENT results to linked flats only.
- **FR-004**: Create NOC / move MUST require the origin flat to be linked to the caller; RESIDENT MUST NOT perform staff transitions (issue/approve/start/complete/reject/cancel) or flat master CRUD (create/edit/delete flats).
- **FR-005**: Household submit rules from 013 remain: PENDING for residents, APPROVED for Secretary/Superadmin; link required.
- **FR-006**: Resident UI MUST present a dedicated shell (nav + home + my flat) without staff register chrome (no association-wide pending queue, no flat create).
- **FR-007**: Login demo text MUST mention the sample resident account and tower flat.
- **FR-008**: Linked residents MUST be able to add FlatMembers with roles ASSOCIATE_OWNER or TENANT on their own flats; MUST NOT add PRIMARY_OWNER or edit other flats’ members; soft-delete of members remains staff-only.
- **FR-009**: NOC and move requests MUST support image/PDF **attachments** for staff and for residents on requests they can access; residents MAY upload/remove attachments on their own NOCs/moves; staff MAY manage all.

### Key Entities

- **User** (role RESIDENT)
- **Flat** / **FlatMember** (userId link)
- **NocRequest** / **NocAttachment**, **MoveRequest** / **MoveAttachment**, household entities (013), **Notice** (009)

## Success Criteria

- **SC-001**: Fresh seed → resident login → open My Flat for the sample tower unit in under 1 minute.
- **SC-002**: Resident can complete household submit + add associate/tenant member + NOC create with attachment + move create with attachment for that flat without staff credentials.
- **SC-003**: Resident cannot see other flats’ register rows or perform staff workflow actions (verified UI + API).
- **SC-004**: Related specs (roadmap, 002/005/006/008/013) document resident self-service consistently.

## Assumptions

- One primary demo resident on Tower 1 Flat 101 is sufficient for v1 sample.
- Destination flat for INTERNAL_SHIFT may be any association flat (resident does not need to be linked to destination).
- Inventory “view” previously granted to RESIDENT is intentionally removed for a clean resident portal.
- Alerts bell may remain if already wired; otherwise optional.
