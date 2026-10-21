# Implementation Plan: Board & Office Bearers Register

**Branch**: `010-board-office-bearers` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Superadmin-managed office-bearer roles + members, consumed by PDF/print letterheads. Replaces hardcoded board arrays in association brand helpers.

## Technical Context

**Language/Version**: Node 20 ESM, React 18  
**Primary Dependencies**: Express, Prisma, Zod, TanStack Query  
**Storage**: PostgreSQL via inventory-service (`OfficeBearerRole`, `OfficeBearerMember`)  
**Testing**: Manual Superadmin UI + API smoke; regenerate notice PDF  
**Project Type**: Association module on inventory-service + web shell  

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo | PASS | `/api/association/board/*` |
| Shared roles | PASS | `board` permission; Superadmin mutate |
| Soft-delete / audit | PASS | `active` / `deletedAt` flags |
| Spec-driven | PASS | This folder |
| Letterhead single source | PASS | Brand helpers load from DB |

## Project Structure

```text
packages/shared-auth/src/permissions.js          # board resource
services/inventory-service/prisma/schema.prisma
services/inventory-service/src/routes/association.js  # /board/roles, /board/members
services/inventory-service/src/lib/associationBrand.js  # async loadBoardForLetterhead
apps/web/.../pages/BoardPage.jsx
apps/web/.../App.jsx  # Superadmin nav
apps/web/.../association/brand.js  # fetch for NOC print
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate from User accounts | Many office bearers never log in | Linking every bearer to User premature |
