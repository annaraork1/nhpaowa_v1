# Implementation Plan: Resident Notices (PDF)

**Branch**: `009-resident-notices` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-resident-notices/spec.md`

## Summary

Association-wide circulars: Secretary drafts/publishes notices; on publish the API generates a PDF; residents list/view/download published notices only. Follows the existing `/api/association/*` + React association module pattern used by NOC/flats.

## Technical Context

**Language/Version**: Node 20 ESM, React 18  
**Primary Dependencies**: Express, Prisma, Zod, TanStack Query, PDFKit (server-side PDF)  
**Storage**: PostgreSQL via inventory-service Prisma (`Notice`, `NoticeStatusEvent`); PDF bytes stored on disk under service `uploads/notices/` (or DB bytea if preferred — research chooses disk + path)  
**Testing**: Manual UI + API smoke per quickstart; Jest optional  
**Target Platform**: Web admin/resident shell (Netlify + inventory-service API)  
**Project Type**: Modular monorepo — association routes on inventory-service  
**Performance Goals**: Publish + PDF under a few seconds for typical circular length  
**Constraints**: Residents never receive draft/unpublished; PDF required at publish  
**Scale/Scope**: Single association, dozens of notices/year typical

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo | PASS | Namespaced under `/api/association/notices` |
| Schema-per-module | PARTIAL | Same inventory Prisma DB; future `association` schema OK |
| Shared roles | PASS | New `notices` permission resource |
| Soft-delete / audit | PASS | Status events + retain PDF after unpublish |
| Shared notifications | PASS | Emit on publish via shared-notifications |
| Spec-driven | PASS | This folder |

## Project Structure

### Documentation (this feature)

```text
specs/009-resident-notices/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code

```text
packages/shared-auth/src/permissions.js          # notices resource
services/inventory-service/prisma/schema.prisma  # Notice, NoticeStatusEvent
services/inventory-service/src/routes/association.js  # /notices routes
services/inventory-service/src/lib/noticePdf.js  # PDFKit generator
apps/web/src/modules/association/pages/NoticesPage.jsx
apps/web/src/modules/inventory/api/client.js     # association.notices
apps/web/src/App.jsx                             # nav + route
```

**Structure Decision**: Mirror NOC — same association router and web module; PDF generation is a small server lib (not a separate service).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Schema co-location | Speed; matches 005–008 | New association-service premature |
| Disk PDF files | Spec requires PDF artifact | HTML-print-only fails FR-003 |
