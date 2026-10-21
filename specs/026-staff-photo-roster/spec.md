# Feature Specification: Staff Photo on Check-in Roster

**Feature Branch**: `026-staff-photo-roster`  
**Created**: 2026-09-24  
**Status**: Implemented  
**Extends**: `007-staff-attendance`, `011-staff-csv-roster`, `016-attendance-daily-punch`, `019-mobile-responsive-lists`  
**Input**: On Staff Check-in screens, show each person’s photo for easy recognition; allow uploading photos when adding staff; work on both web desktop and mobile-responsive layouts. Tap photo to view; separate control to upload/change (not the same gesture).

## Research summary (association ops)

Gate and facility teams punch dozens of security / housekeeping staff per shift. Names alone are slow to match at the desk; a **face thumbnail** on the roster speeds recognition (same pattern as inventory item photos). Photos are optional identity aids — not biometric authentication.

**Decision:** Store optional `photoUrl` on `AssociationStaff`; upload images under `/uploads/staff/` with attendance createEdit permission; show avatars on desktop table + mobile cards; **view** opens a preview dialog; **change** uses a distinct camera control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add staff with photo (Priority: P1)

Authorized attendance editor opens **Add staff**, optionally picks/captures a photo, sees a preview, and saves. The new roster row shows that photo.

**Independent Test**: Add staff with JPG → roster row shows face; add without photo → initials placeholder.

**Acceptance Scenarios**:

1. **Given** createEdit on attendance, **When** Add staff includes an image file, **Then** staff is created with `photoUrl` and thumbnail appears on roster (desktop + mobile).
2. **Given** Add staff without a photo, **When** saved, **Then** roster shows initials (or placeholder), not a broken image.
3. **Given** upload in progress, **When** Save is clicked, **Then** Save is disabled until upload finishes (or photo may be omitted).

---

### User Story 2 - Recognize staff at check-in (Priority: P1)

On the Attendance **Roster** (check-in screen), each staff row/card shows a photo (or initials) next to the name so Security / Estate staff can confirm the person before Check in / Check out / Mark absent.

**Independent Test**: Phone and desktop viewports — photos visible beside name without breaking punch actions.

**Acceptance Scenarios**:

1. **Given** staff with `photoUrl`, **When** roster loads, **Then** thumbnail is visible on desktop Staff column and mobile `EntityCard` avatar.
2. **Given** staff without photo, **When** roster loads, **Then** initials placeholder is shown.
3. **Given** punch actions, **When** layout is mobile, **Then** photo does not obscure Check in / Check out controls.

---

### User Story 3 - View photo without opening upload (Priority: P1)

Tapping/clicking a staff photo opens a **full preview**. Upload/change is a **separate** control (camera badge and/or “Change photo” inside the preview). Viewing must not open the file picker.

**Independent Test**: Click photo → preview; camera badge → file picker only.

**Acceptance Scenarios**:

1. **Given** a photo exists, **When** user taps the avatar, **Then** a preview dialog shows the image and name; file picker does **not** open.
2. **Given** createEdit permission, **When** user taps the camera badge (or Change photo in preview), **Then** file picker opens for replace.
3. **Given** no photo yet and createEdit, **When** user taps camera badge, **Then** they can add a photo to existing staff (PATCH).

---

### User Story 4 - Mobile capture (Priority: P2)

On phones, Add staff / change photo file inputs allow `image/*` and camera capture where the browser supports it.

**Independent Test**: Mobile browser — file input offers camera/gallery; uploaded image displays after save.

---

## Requirements *(mandatory)*

- **FR-001**: `AssociationStaff` MUST support optional `photoUrl` (nullable string path/URL).
- **FR-002**: System MUST accept staff photo uploads via `POST /api/association/staff/photo` (multipart `photo`, images only, size-capped) for `attendance` createEdit; returns `{ url }` under `/uploads/staff/…`.
- **FR-003**: `POST /staff` and `PATCH /staff/:id` MUST accept optional `photoUrl` (validated path/URL).
- **FR-004**: Roster UI (desktop + mobile) MUST show photo or initials beside staff name on the check-in roster.
- **FR-005**: Tap/click on an existing photo MUST open a view preview; MUST NOT open the upload picker.
- **FR-006**: Upload/change MUST use a distinct control (camera badge and/or preview “Change photo”).
- **FR-007**: CSV import (`011`) MAY leave `photoUrl` null; photos are not required for import.
- **FR-008**: Serving photos uses existing static `/uploads` + client `mediaUrl` (same as items/NOC attachments).

## Success Criteria

- **SC-001**: Secretary can add a guard with a photo and see them on check-in within one save cycle.
- **SC-002**: Ops users can identify ≥90% of photographed staff from the roster without reading the full name first (manual desk check).
- **SC-003**: View gesture never opens the OS file picker; change gesture does.

## Assumptions

- Photos are recognition aids only — not biometric verification or access control.
- Max upload ~5 MB; image MIME only (no PDF).
- Existing staff without photos remain valid; camera badge allows later attach.
- PWA install (`027` if specified separately) does not change photo API; same relative `/uploads` host.

## Cross-links

- Parent roster: [007-staff-attendance](../007-staff-attendance/)
- Punch UX: [016-attendance-daily-punch](../016-attendance-daily-punch/), [021-attendance-punch-detail](../021-attendance-punch-detail/)
- Mobile lists: [019-mobile-responsive-lists](../019-mobile-responsive-lists/)
