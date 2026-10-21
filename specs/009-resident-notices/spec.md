# Feature Specification: Resident Notices (PDF)

**Feature Branch**: `009-resident-notices`  
**Created**: 2026-09-20  
**Status**: Draft  
**Depends on**: Shared auth / roles (`002-role-based-auth`); optional association branding from settings  
**Input**: Association creates and publishes official notices for residents as downloadable/printable PDF documents (e.g. compliance drives, security advisories, general circulars).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Draft and publish a notice (Priority: P1)

An authorized officer (Secretary / Superadmin) creates a notice with title, body content, optional category, and effective date. They save as draft, then publish. On publish, the system produces a PDF suitable for official circulation and retains the published version for residents.

**Why this priority**: Publishing official circulars is the core value; drafts without publish/PDF do not replace WhatsApp/NBH notice boards.

**Independent Test**: Create a notice titled “Vehicle Verification Drive”, publish it, and download/open a PDF that shows association name, title, body, publish date, and issuer role/name.

**Acceptance Scenarios**:

1. **Given** an authorized user, **When** they create a notice with title and body and save as draft, **Then** the notice appears in the admin list as DRAFT and no resident can see it.
2. **Given** a DRAFT notice, **When** the author publishes it, **Then** status becomes PUBLISHED, a PDF artifact is available, and the notice appears in the resident-facing notice list.
3. **Given** a PUBLISHED notice, **When** a resident opens it, **Then** they can view the content and download the PDF.

---

### User Story 2 - Residents browse published notices (Priority: P1)

Residents (and committee) see a chronological list of published notices, open one, and download its PDF. Unpublished drafts never appear in this list.

**Why this priority**: Without resident visibility, PDF generation alone does not deliver association communication value.

**Independent Test**: With two published and one draft notice, resident list shows only the two published items newest-first; draft is absent.

**Acceptance Scenarios**:

1. **Given** published notices exist, **When** a resident opens Notices, **Then** they see title, publish date, and optional category for each published item.
2. **Given** a published notice, **When** the resident downloads PDF, **Then** they receive a file that matches the published content.

---

### User Story 3 - Unpublish or archive a notice (Priority: P2)

Secretary can unpublish (hide from residents) or archive a notice while retaining the historical PDF for committee audit. Republish restores visibility with the same or a regenerated PDF.

**Why this priority**: Corrections and superseded circulars are common; hard-delete would break audit expectations.

**Independent Test**: Unpublish a live notice → disappears from resident list → still visible to admin with status UNPUBLISHED/ARCHIVED and PDF retained.

**Acceptance Scenarios**:

1. **Given** a PUBLISHED notice, **When** Secretary unpublishes it, **Then** residents no longer see it and admin retains access to content + PDF.
2. **Given** an UNPUBLISHED notice, **When** Secretary republishes it, **Then** it reappears for residents.

---

### Edge Cases

- Publish with empty title or empty body — blocked with clear validation.
- Very long body content — PDF still generates and remains readable (pagination OK).
- Unauthorized role attempts create/publish — denied.
- Resident requests PDF for a draft or unpublished notice by id — denied / not found.
- Edit after publish — either create a new version or require unpublish-then-edit; published PDF must not silently diverge from what residents previously downloaded without a clear version/update signal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Authorized roles (Secretary, Superadmin; optionally Committee Admin) MUST be able to create, edit drafts, publish, unpublish, and archive notices.
- **FR-002**: Each notice MUST capture at least: title, body, author, created/updated timestamps, status (DRAFT | PUBLISHED | UNPUBLISHED | ARCHIVED), and publish date when published.
- **FR-003**: System MUST generate a PDF when a notice is published, including association name, notice title, body, publish date, and issuer identity (name/role).
- **FR-004**: Residents MUST be able to list and open only PUBLISHED notices and download the associated PDF.
- **FR-005**: Draft, unpublished, and archived notices MUST NOT appear in the resident notice list.
- **FR-006**: System MUST retain published PDF artifacts for audit even after unpublish/archive (soft lifecycle; no hard delete of published history in v1).
- **FR-007**: Admin MUST be able to list/filter notices by status and search by title.
- **FR-008**: Optional category/tag (e.g. Security, General, Compliance) MAY be supported in v1 for filtering; free-form is acceptable.
- **FR-009**: Publishing MUST emit a notification event via the shared notification path so the dashboard/bell can surface “new notice” (channel delivery beyond in-app MAY be deferred).

### Key Entities

- **Notice**: Official association circular (title, body, status, category, dates, author).
- **NoticePdf**: Generated PDF artifact tied to a published notice (or notice version).
- **NoticeStatusEvent** (optional but preferred): Audit of status transitions (draft → published → unpublished, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Secretary can create and publish a standard circular (title + body) and obtain a downloadable PDF in under 5 minutes.
- **SC-002**: 100% of resident-visible notices have an available PDF at publish time.
- **SC-003**: Unauthorized users cannot create or publish notices (verified in UI and API).
- **SC-004**: Residents never see draft or unpublished notices in the default list (verified with mixed-status dataset).

## Assumptions

- The sample vehicle-verification circular illustrates the *kind* of content (title, greeting, body, association sign-off); the feature is a general notice/circular module, not a vehicle-verification workflow.
- PDF is the official published format for v1; email/WhatsApp blast and NBH sync are out of scope (may use shared notifications later).
- Association legal name/branding and **board office bearers** come from `010-board-office-bearers` register (letterhead left column + President signature name); logo/signature image files remain static assets in v1.
- Digital wet-signature/stamp images are optional/deferred; typed issuer name and role on the PDF are sufficient for v1.
- Rich text may be plain text or simple formatting in v1; complex layout templates are out of scope.
- Flat-owner targeting (per-wing / per-flat audience) is out of scope for v1 — notices are association-wide.
