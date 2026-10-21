# Feature Specification: Board & Office Bearers Register

**Feature Branch**: `010-board-office-bearers`  
**Created**: 2026-09-20  
**Status**: Draft  
**Depends on**: Shared auth (`002-role-based-auth`); letterhead consumers (`009-resident-notices`, NOC print, report PDFs)  
**Input**: Superadmin manages association office-bearer roles and member details (President, Secretary, Treasurer, Joint Secretary, Vice President, Committee Members, Estate Manager). These records drive PDF/print letterheads (board list on the left, President signature at bottom).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Superadmin manages office-bearer roles (Priority: P1)

Superadmin opens **Board / Office bearers**, defines or edits **roles** (e.g. President, Secretary, Estate Manager) with display order and whether the role appears on letterhead and/or is the signing President role. Soft-deactivated roles no longer appear on new documents.

**Why this priority**: Roles are the taxonomy; members hang off roles.

**Independent Test**: Create role “Joint Secretary” with sort order 4 → list shows it; deactivate → new letterhead omits it.

**Acceptance Scenarios**:

1. **Given** Superadmin is logged in, **When** they create a role with name and sort order, **Then** it appears in the role list ordered by sort.
2. **Given** a role exists, **When** Superadmin marks it inactive, **Then** active member lists and letterheads exclude that role.
3. **Given** a non-Superadmin user, **When** they call create/update role APIs, **Then** they receive 403.

---

### User Story 2 - Superadmin adds / updates members & details (Priority: P1)

Superadmin assigns people to roles with details: full name, optional phone, email, flat/tower reference note, and active flag. One person may hold one primary office-bearer role at a time for letterhead purposes (v1). Changing President updates the name used on the signature block of new PDFs.

**Why this priority**: Correct names on circulars/NOCs is the business outcome.

**Independent Test**: Set President to “V. G. Jayaramaiah”, publish a notice → PDF left column and signature show that name.

**Acceptance Scenarios**:

1. **Given** roles exist, **When** Superadmin adds a member to President with name and contact, **Then** the member appears under that role.
2. **Given** an existing member, **When** Superadmin updates name/phone, **Then** subsequent letterheads use the new details.
3. **Given** Estate Manager role, **When** Superadmin adds “Mariyayya Swamy”, **Then** the person appears in board register (letterhead inclusion configurable per role).

---

### User Story 3 - Letterheads consume live board register (Priority: P1)

Notice PDFs, report PDFs, and NOC print views load **active** office bearers ordered by role sort, with President signature name from the active President member. Hardcoded brand names are replaced by this register (with a safe fallback if empty).

**Why this priority**: Without live consumption, Superadmin edits do not fix documents.

**Independent Test**: Update Secretary name → regenerate/publish notice → PDF left column shows new Secretary.

---

### Edge Cases

- Two members marked President — system allows only one active President (or uses lowest sort / most recently updated); warn in UI.
- Empty board register — letterhead falls back to association name only; signature shows “President, NHPAOWA” without a personal name.
- Soft-delete member vs hard-delete — soft deactivate; history of past PDFs unchanged.
- Unauthorized roles (Secretary etc.) cannot mutate board register in v1 (view-only optional for Secretary later).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Superadmin MUST be able to CRUD office-bearer **roles** (name, code/slug, sortOrder, showOnLetterhead, isPresidentSigner, active).
- **FR-002**: Superadmin MUST be able to CRUD office-bearer **members** (roleId, fullName, phone?, email?, notes?, active, sortOrder within role if needed).
- **FR-003**: Platform permission resource `board` — Superadmin `view` + `createEdit` (+ `delete` soft); other roles no mutate in v1; Secretary MAY `view` (read-only).
- **FR-004**: Seed / default NHPAOWA board MUST include: President V. G. Jayaramaiah; Vice President Lokesh Kumar Gupta; Secretary Adarsh A Patil; Joint Secretary Moushimi Chakraborty; Treasurer Praveen Danagowdru; Committee Members Vikas, Saurabh, Ranjitha; Estate Manager Mariyayya Swamy.
- **FR-005**: Notice PDF, report PDF, and NOC print letterheads MUST read active letterhead-visible members from the register.
- **FR-006**: President signature block MUST use the active member whose role has `isPresidentSigner=true`.
- **FR-007**: List UI for Superadmin MUST support search by name and filter by role/active.
- **FR-008**: Soft lifecycle — inactive members/roles retained for audit; no hard delete of referenced records in v1.

### Key Entities

- **OfficeBearerRole**: Named office (President, Secretary, …) with letterhead flags.
- **OfficeBearerMember**: Person holding a role with contact details.
- **Association brand assets**: Logo/signature image files remain file-based in v1; member name for signature is data-driven.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Superadmin can add or correct a board member in under 2 minutes.
- **SC-002**: 100% of newly generated notice PDFs show the current active President name on the signature block.
- **SC-003**: Non-Superadmin cannot create/edit board roles or members (API 403).
- **SC-004**: Seeded NHPAOWA board matches the association’s named office bearers above.

## Assumptions

- This is the **association managing committee / office bearers** register, distinct from flat owners (`005`) and login users (`004`).
- Estate Manager is an office-bearer role for letterhead/ops visibility; not the same as Staff attendance roster.
- Signature **image** remains a shared asset file in v1; only the printed name is driven by the register (upload-per-president deferred).
- Full names “Vikas”, “Saurabh”, “Ranjitha” are stored as provided; Superadmin can expand surnames later.
- Karnataka RWA practice: Managing Committee typically has President, Secretary, Treasurer; Joint Secretary / Vice President / Estate Manager are common extensions — product supports configurable roles rather than a fixed enum only.
