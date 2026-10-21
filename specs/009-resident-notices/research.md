# Research: Resident Notices (PDF)

## Decision: Association-wide notices only (v1)

**Rationale**: Spec scopes out per-flat/wing targeting; matches typical RWA circular practice.  
**Alternatives**: Audience filters — deferred.

## Decision: Host APIs on inventory-service `/api/association/notices`

**Rationale**: Same pattern as flats/NOC/moves; constitution allows later split.  
**Alternatives**: Dedicated notices-service — deferred.

## Decision: PDFKit for PDF generation

**Rationale**: Pure Node, no Chromium dependency; enough for title/body/sign-off circulars.  
**Alternatives**: Puppeteer/Playwright HTML→PDF (heavier); client-only print (fails durable PDF artifact + consistent download).

## Decision: Store PDF on local disk with path on Notice

**Rationale**: Simple for v1 single-instance; path in `pdfPath` / `pdfFileName`.  
**Alternatives**: Netlify Blobs / S3 — deferred until multi-instance deploy needs object storage; Postgres bytea — workable but bloated backups.

## Decision: Status machine DRAFT → PUBLISHED ↔ UNPUBLISHED → ARCHIVED

**Rationale**: Matches spec FR-002/FR-006; edit published content requires unpublish first (or soft version later).  
**Alternatives**: Immutable versions on every edit — nicer but more UI; defer.

## Decision: Shared notification on publish only

**Rationale**: Constitution 2.6; in-app bell is enough for v1.  
**Alternatives**: SMS/WhatsApp/NBH sync — out of scope.
