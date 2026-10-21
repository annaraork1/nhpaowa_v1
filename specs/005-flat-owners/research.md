# Research: Flat Owners

## Decision: Embed person fields on FlatMember (v1)

**Rationale**: Avoid premature Person/User coupling; optional `userId` later.  
**Alternatives**: Mandatory User accounts for every owner — rejected (many owners never log in).

## Decision: Host association APIs on inventory-service under `/api/association`

**Rationale**: Fastest path; constitution allows later service split.  
**Alternatives**: New association-service now — deferred.

## Decision: Unique (associationId, wing, flatNumber)

**Rationale**: Matches society addressing (e.g. A-101).
