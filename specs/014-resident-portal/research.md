# Research: Resident Portal

## Decision 1 — Link via FlatMember.userId

**Choice**: Reuse existing optional `FlatMember.userId` (013).  
**Rationale**: Household submit already gates on this; no schema migration.  
**Alternative rejected**: Separate ResidentFlat table (extra join, duplicate truth).

## Decision 2 — Strip inventory from RESIDENT

**Choice**: Set RESIDENT actions to `[]` on inventory resources.  
**Rationale**: Roadmap positions Resident as association self-service; current inventory view cluttered the shell and confused demo.  
**Impact**: Spec 002 acceptance that mentioned “Resident view Items” is updated to resident portal modules.

## Decision 3 — createEdit ≠ staff workflow

**Choice**: Keep `createEdit` permission for NOC/moves create; enforce staff-only on transition routes by role check.  
**Rationale**: Avoid a new permission action for v1; mirrors household PENDING vs staff APPROVED pattern.

## Decision 4 — Sample flat Tower 1 / 101

**Choice**: Link `resident@nhpaowa.local` to PRIMARY_OWNER on T1-101 (existing household demo flat).  
**Rationale**: One seed path exercises household + notices + NOC + moves together.
