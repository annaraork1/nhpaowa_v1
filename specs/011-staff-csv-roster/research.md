# Research: Staff CSV & Multi-Tower RWA Roster

## Decision: Expand categories beyond Security/HK/Maintenance/Office

**Rationale**: Peenya-style campuses need distinct gardening, electrical, plumbing, and clubhouse desk roles for payroll and gate accountability. Collapsing into OTHER loses reporting value.  
**Alternatives**: Free-text category only — weaker filters.

## Decision: Optional tower + designation, not mandatory FK to Flat.tower

**Rationale**: Posts like “Main Gate” and “Clubhouse Desk” are not towers; security may cover one tower lobby. String tower (`1`–`8`) + free designation covers both.  
**Alternatives**: Mandatory tower enum — rejects gate/clubhouse rows.

## Decision: Partial-success CSV import

**Rationale**: Vendor sends 40-row files with 1–2 typos; all-or-nothing frustrates Secretaries.  
**Alternatives**: Transactional all-or-nothing — deferred as optional mode.

## Decision: Extend 007 rather than new attendance product

**Rationale**: Same roster entity; CSV is an ingestion path. Spec 011 documents the enhancement; 007 remains the attendance parent.
