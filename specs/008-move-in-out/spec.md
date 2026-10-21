# Feature Specification: Move-In / Move-Out / Internal Shift & Handover

**Feature Branch**: `008-move-in-out`  
**Created**: 2026-09-20  
**Updated**: 2026-09-21  
**Status**: Draft  
**Depends on**: `005-flat-owners`  
**Input**: Move in, move out, **internal flat-to-flat shifting** (same society, ~1705 flats), and handover — distinct from sale NOC and builder→RWA HOTO.

## User Scenarios & Testing

### User Story 1 - Raise move-in or move-out request (Priority: P1)

Secretary **or a linked Resident** creates a MOVE_IN or MOVE_OUT request for a flat with scheduled date/window, party type (Owner / Tenant), contact, vehicle/mover notes, and required document checklist flags (ID submitted, agreement copy, police verification ack). Residents may create only for flats linked via FlatMember.userId; they cannot approve/start/complete (see `014-resident-portal`).

**Independent Test**: Create MOVE_IN for A-101 on a date; status REQUESTED. Resident create for linked flat succeeds; for unlinked flat fails.

### User Story 2 - Approve and complete handover (Priority: P1)

Approver advances status: REQUESTED → APPROVED → IN_PROGRESS → COMPLETED (or REJECTED/CANCELLED). On completion, capture meter readings (electricity/water), keys/access cards count, parking tag, and free-text handover notes. Occupancy status on the flat updates (e.g. Tenant occupied on move-in complete).

**Independent Test**: Complete MOVE_IN → flat occupancy TENANT_OCCUPIED; meters stored.

### User Story 3 - Gate / security view of today’s moves (Priority: P2)

Staff/Security sees today’s **APPROVED** and **IN_PROGRESS** moves (flat, window, contact) for gate control — read-only list. **Internal shifts** appear with origin → destination labels. “Today” is the **association campus calendar day** (Asia/Kolkata), matching the stored `scheduledDate` date (not the server’s UTC midnight window).

**Independent Test**: Schedule and approve/start a move for today’s campus date → it appears under “Today at the gate”; COMPLETED/REQUESTED for the same date do not.

**Acceptance Scenarios**:

1. **Given** an APPROVED or IN_PROGRESS move with `scheduledDate` = campus today, **When** the gate list loads (`date=today`), **Then** the move is listed.
2. **Given** only COMPLETED moves for campus today, **When** the gate list loads, **Then** the list may be empty (active gate work is done).
3. **Given** a move scheduled for another calendar day, **When** the gate list loads, **Then** it is not listed.

### User Story 4 - Internal shift between flats (Priority: P1)

Residents often relocate from one unit to another within the same association (e.g. NHPAOWA’s large flat count). Secretary creates an **INTERNAL_SHIFT** request with **origin flat** and **destination flat**, scheduled date, party type, and contact. Workflow matches other moves. On completion:

- Origin flat occupancy becomes **VACANT**
- Destination flat occupancy becomes **OWNER_OCCUPIED** or **TENANT_OCCUPIED** per party type
- Active flat members on the origin are **transferred** to the destination flat
- **APPROVED** household register rows for the origin (parking allotments, vehicles, pets, emergency contacts, access devices) are **transferred** to the destination flat; PENDING/REJECTED rows stay on origin for staff cleanup
- Handover checklist is recorded (meters/keys for the destination context; notes may mention origin)

**Why this priority**: Common operational case; without it Secretaries track shifts offline.

**Independent Test**: INTERNAL_SHIFT from T1-101 → T2-305; complete → 101 VACANT, 305 occupied; members and APPROVED household items now on 305.

**Acceptance Scenarios**:

1. **Given** two distinct flats, **When** Secretary creates INTERNAL_SHIFT with origin and destination, **Then** status is REQUESTED and both flats are stored.
2. **Given** INTERNAL_SHIFT with same origin and destination, **When** save, **Then** the system rejects it.
3. **Given** IN_PROGRESS move on origin or destination, **When** starting another move involving that flat, **Then** the system rejects the overlap.
4. **Given** an INTERNAL_SHIFT IN_PROGRESS with APPROVED vehicles/pets/parking on origin, **When** completed with handover, **Then** origin is VACANT, destination occupied, active members and APPROVED household rows moved to destination.

### User Story 5 - Download approved move as PDF gate pass (Priority: P1)

After a move request is **APPROVED** (and while IN_PROGRESS / COMPLETED), Secretary (or Staff with view) downloads an official **PDF authorization / gate pass** for the resident and Security team. The PDF uses the association letterhead (logo, board rail, president signature) so it is clearly signed and authorized by NHPAOWA.

**Why this priority**: Gate and residents need a shareable paper/digital pass after approval; verbal approval is not enough at a large society.

**Independent Test**: Approve a MOVE_IN → Download PDF → file opens with logo, move type, flat, date, contact, APPROVED status, and president signature block.

**Acceptance Scenarios**:

1. **Given** a REQUESTED move, **When** Download PDF is attempted, **Then** the system rejects (PDF only after approval).
2. **Given** an APPROVED (or IN_PROGRESS / COMPLETED) move, **When** Download PDF is chosen, **Then** a PDF streams with association branding and move details.
3. **Given** an INTERNAL_SHIFT, **When** PDF is downloaded, **Then** origin → destination flats are both shown.

### User Story 6 - Move details: progress history and attachments (Priority: P1)

Security, residents (with view), and Secretary open a move’s **details** to see the full **status history** (REQUESTED → APPROVED → …) with timestamps/notes, plus **attachments** (ID scan, agreement copy, police ack, gate photos, etc.). Secretary/Superadmin **and linked residents on their own moves** upload attachments; viewers download them. Progress is always visible from the tracked status events.

**Why this priority**: Gate and residents need one place to confirm where a move stands and supporting documents without chasing WhatsApp threads.

**Independent Test**: Approve a move → open Details → timeline shows REQUESTED then APPROVED; resident or staff upload a PDF → attachment listed and downloadable.

**Acceptance Scenarios**:

1. **Given** a move with status events, **When** Details is opened, **Then** the timeline lists each status transition in order with time.
2. **Given** createEdit permission, **When** a file (image/PDF) is attached, **Then** it appears on Details for all users with moves view.
3. **Given** view-only (Staff/Resident), **When** they open Details, **Then** they see status progress and can download attachments but cannot delete them.

### Edge Cases

- Move-out without prior move-in record — allowed (legacy residents).
- Overlapping IN_PROGRESS moves on same flat (as origin **or** destination) — reject second.
- Cancel after APPROVED — status CANCELLED; flat occupancy unchanged.
- Destination already OWNER/TENANT occupied — allowed with handover notes (Secretary responsibility); v1 does not hard-block.
- PENDING household submissions on origin are **not** transferred (staff approve/reject on origin first, or discard).

## Requirements

- **FR-001**: System MUST support request types MOVE_IN, MOVE_OUT, and **INTERNAL_SHIFT**.
- **FR-002**: Each request MUST reference an origin flat and scheduled date; INTERNAL_SHIFT MUST also reference a distinct destination flat in the same association.
- **FR-003**: Statuses: REQUESTED, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED.
- **FR-004**: Completion MUST allow recording utility meter readings and key/card counts.
- **FR-005**: Completing MOVE_IN/MOVE_OUT MUST update flat occupancy status per rules (tenant/owner/vacant). Completing INTERNAL_SHIFT MUST set origin VACANT and destination occupied per party type, and transfer active FlatMembers from origin to destination.
- **FR-006**: Document checklist items MUST be trackable (boolean flags + notes).
- **FR-007**: Authorized Staff MAY view today’s **APPROVED** and **IN_PROGRESS** moves including internal shifts. “Today” MUST be the association timezone calendar date (default `Asia/Kolkata` / `ASSOCIATION_TZ`).
- **FR-008**: Builder-to-association asset HOTO is OUT OF SCOPE (separate future feature).
- **FR-009**: Completing INTERNAL_SHIFT MUST transfer APPROVED parking allotments, vehicles, pets, emergency contacts, and access devices from origin to destination (PENDING/REJECTED unchanged on origin).
- **FR-010**: Flat pickers for origin/destination MUST use typeahead search (not a raw 1700+ option `<select>`).
- **FR-011**: Once a move is APPROVED (also IN_PROGRESS / COMPLETED), authorized users MUST be able to download an official PDF authorization/gate pass with association logo letterhead and president signature block, suitable to share with the resident and Security.
- **FR-012**: PDF MUST include move type, flat(s), party type, scheduled date, contact, status, reference id, and mover notes when present; REQUESTED / REJECTED / CANCELLED MUST NOT produce a downloadable pass.
- **FR-013**: System MUST expose move **details** including ordered status-event history so Security/residents can see progress.
- **FR-014**: System MUST support file **attachments** on a move (images/PDF, max size per file as implemented); users with `moves` view MAY list/download; users with `moves` createEdit who own the move context (staff editors, or RESIDENT linked to the origin/destination flat) MAY upload/delete.
- **FR-015**: Attachment metadata MUST include original filename, mime type, uploader, and uploaded-at; soft-delete MUST hide from default lists.

## Key Entities

- **MoveRequest**: Move-in/out/internal-shift case (origin flat + optional destination).
- **MoveHandover**: Completion payload (meters, keys, notes).
- **MoveStatusEvent**: Audit trail / progress history.
- **MoveAttachment**: Supporting files linked to a move (ID, agreement, photos).
- **Flat** / **FlatMember**: From 005.
- **Household** (013): parking/vehicles/pets/contacts/devices transferred on INTERNAL_SHIFT complete when APPROVED.

## Success Criteria

- **SC-001**: Secretary can complete a tenant move-in handover in under 5 minutes.
- **SC-002**: Overlapping in-progress moves on one flat (as origin or destination) are blocked.
- **SC-003**: Gate list for “today” matches APPROVED/IN_PROGRESS moves whose scheduled date equals the campus calendar day, including internal shifts with both flat labels.
- **SC-004**: Completing an internal shift updates both flats’ occupancy and relocates active members in under 5 minutes of Secretary work including form entry.
- **SC-005**: Approved-move PDF downloads within one click from the Moves UI and includes NHPAOWA branding + signature block.
- **SC-006**: From Details, status history is visible for any move with events; attaching one PDF appears for Staff view within the same session.

## Assumptions

- Lift booking / deposit fee collection are notes fields in v1 (no payment gateway).
- Police verification is an acknowledgement checkbox, not an external integration.
- “Handle” means operational handover of access & meters, not legal conveyance.
- Internal shift is within one association campus only.
- Ownership title transfer between flats is legal paperwork outside this module; this feature tracks **occupancy / gate / handover** for residents relocating units.
