# Feature Specification: Action Icons, Brand Tokens & Theme Modes

**Feature Branch**: `003-ui-icons-theme`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User choices — 1A icons+tokens (keep layout); Heroicons; icon-only+tooltip; AlertDialog on delete; purple-only logo tokens; keep Recharts; light + dark modes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Icon actions with tooltips (Priority: P1)

On list screens, View / Edit / Delete appear as icon-only controls using Heroicons. Hover or focus shows a tooltip with the action name. Layout and page structure stay the same.

**Why this priority**: Explicit product decision for action affordances.

**Independent Test**: Open Items as Secretary — see Eye / Pencil / Trash icons with tooltips; no text labels on those row actions.

**Acceptance Scenarios**:

1. **Given** a user with edit permission, **When** they view a master-data row, **Then** Edit is an icon with tooltip “Edit”.
2. **Given** a user with delete permission, **When** they view the row, **Then** Delete is a trash icon with tooltip “Delete”.
3. **Given** a user with view permission only, **When** they view the row, **Then** they see View (eye) if offered and do not see Edit/Delete icons.

---

### User Story 2 - Delete confirmation dialog (Priority: P1)

Deleting master data (or similar destructive soft-deletes) requires confirming in a modal alert dialog. Cancel leaves data unchanged; Confirm proceeds with delete.

**Why this priority**: User explicitly required AlertDialog.

**Independent Test**: Click Delete on an item → dialog appears → Cancel → item remains; Confirm → item removed from list.

**Acceptance Scenarios**:

1. **Given** delete permission, **When** the user clicks Delete, **Then** a confirmation dialog appears before any API call.
2. **Given** the dialog is open, **When** the user cancels, **Then** no delete occurs.
3. **Given** the dialog is open, **When** the user confirms, **Then** the delete runs and the UI refreshes.

---

### User Story 3 - Logo purple brand tokens (Priority: P1)

The app uses a purple-only brand palette derived from the NHPAOWA logo (primary, soft/hover, muted, sidebar), applied consistently to buttons, active nav, focus rings, and accents.

**Why this priority**: Brand consistency with logo.

**Independent Test**: Primary buttons and active nav use brand purple in light mode; no non-purple primary brand color.

**Acceptance Scenarios**:

1. **Given** light mode, **When** the user views primary actions and active nav, **Then** colors match the defined brand tokens.
2. **Given** dark mode, **When** the user views the same controls, **Then** brand purple remains recognizable against dark surfaces.

---

### User Story 4 - Light and dark mode (Priority: P1)

Users can switch between light and dark appearance. Surface, text, borders, sidebar, and panels adapt. Preference persists across reloads. System preference may seed the default on first visit.

**Why this priority**: Explicit dual-mode requirement.

**Independent Test**: Toggle dark → surfaces darken; reload → preference kept; toggle light → restores light tokens.

**Acceptance Scenarios**:

1. **Given** the shell, **When** the user toggles theme, **Then** light/dark styles swap without a full page redesign.
2. **Given** a chosen theme, **When** the user reloads, **Then** the same theme applies.
3. **Given** charts (Recharts), **When** theme changes, **Then** charts remain usable (axis/labels readable in both modes).

### Edge Cases

- User without delete permission never sees Delete icon or dialog.
- Rapid double-confirm should not fire duplicate deletes (disable confirm while pending).
- First visit with no stored preference: follow `prefers-color-scheme`, else light.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present View, Edit, and Delete row actions as icon-only controls with accessible names/tooltips.
- **FR-002**: System MUST use Heroicons for those action icons.
- **FR-003**: System MUST keep existing page layout/structure (no full shadcn/Tremor shell redesign in this feature).
- **FR-004**: System MUST show a confirmation alert dialog before destructive Delete actions on master data.
- **FR-005**: System MUST apply purple-only brand tokens derived from the logo (brand, brand-soft, brand-muted, sidebar family).
- **FR-006**: System MUST support light and dark color modes with mode-appropriate surfaces, text, and borders.
- **FR-007**: System MUST persist the user’s theme preference.
- **FR-008**: System MUST keep Recharts for dashboard/report charts (Tremor charts out of scope).
- **FR-009**: Icon actions MUST still respect role permissions (Can / permission matrix).
- **FR-010**: Dialog and icon buttons MUST be keyboard accessible (focus, Escape to dismiss dialog).

### Key Entities

- **Theme preference**: light | dark (client-persisted).
- **Brand tokens**: named color roles mapped per mode.
- **Destructive action**: soft-delete (or equivalent) requiring confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On Items, Categories, and Suppliers, 100% of Edit/Delete row actions are icon-only with tooltips (no text-only links for those actions).
- **SC-002**: 100% of Delete attempts on those lists show a confirmation dialog before the API call.
- **SC-003**: Theme toggle switches modes in under 1 second without navigation.
- **SC-004**: Brand primary in both modes is recognizably the logo purple family (not blue/green substitutes).
- **SC-005**: Permission-denied roles still never see unauthorized Edit/Delete icons.

## Assumptions

- “View” means an eye icon that opens a simple read-only detail (dialog or inline), where a view action is useful; if a row has no separate view flow yet, View may open the same detail read-only while Edit remains the mutate path.
- AlertDialog style follows shadcn/Radix patterns without migrating the whole app to the shadcn CLI or TypeScript.
- Tremor is deferred; prior request for Tremor charts is superseded by “keep Recharts”.
- Mobile Expo theming is out of scope for this feature (web shell only).
- Scope of Delete confirmation: Items, Categories, Suppliers, AMC (soft-delete / remove actions).
