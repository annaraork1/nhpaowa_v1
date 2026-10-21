# Research: 026 Staff Photo Roster

## Decision: Store URL on AssociationStaff (not separate attachment table)

**Rationale**: One face per roster person; same pattern as inventory `Item.photoUrl`. No multi-file gallery needed for v1.

**Alternatives rejected**: Per-punch selfie (privacy/ops burden); biometric match (out of roadmap).

## Decision: Dedicated `/staff/photo` upload (not inventory `/uploads`)

**Rationale**: Inventory upload requires `items` createEdit; Security Staff / Estate Manager often have attendance without inventory. Staff photos must use `attendance` createEdit.

## Decision: View vs change as separate gestures

**Rationale**: Desk users need to enlarge a face without accidentally opening the file picker (reported UX issue when avatar click = upload).

## Decision: Optional photos + initials fallback

**Rationale**: CSV-imported rosters and legacy rows have no images; UI must remain usable.
