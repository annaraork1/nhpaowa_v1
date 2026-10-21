# Research: Board & Office Bearers (India RWA)

## Decision: Configurable roles, not hard-coded enum only

**Rationale**: Karnataka apartment associations typically elect a Managing Committee with President, Secretary, Treasurer; many also appoint Vice President, Joint Secretary, Estate Manager / Facility Manager, and additional committee members. NHPAOWA’s roster matches this pattern.  
**Alternatives**: Fixed enum of 3 officers — too rigid for Joint Secretary / Estate Manager.

## Decision: Distinct from login Users and Flat Members

**Rationale**: Office bearers are governance identities for letterheads and association records; they may or may not have platform logins (`004-user-admin`) and are not the same as flat owners (`005`). Optional `userId` link deferred.  
**Alternatives**: Reuse Users table with COMMITTEE role — conflates access control with letterhead roster.

## Decision: Superadmin-only mutate in v1

**Rationale**: Changing President/Secretary on official stationery is sensitive; Superadmin gate matches existing Users page pattern. Secretary may view later.  
**Alternatives**: Secretary edit — deferred.

## Decision: Letterhead reads DB at generation time

**Rationale**: Spec requires live consumption; cache in-process OK with short TTL or per-request load.  
**Alternatives**: Keep hardcoded brand.js — rejected by FR-005.

## Decision: One active President signer flag on role

**Rationale**: Signature block needs a single name; `isPresidentSigner` on role + one active member.  
**Alternatives**: Per-member “isSigner” — more UI; same outcome.
