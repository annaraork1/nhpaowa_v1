# Implementation Plan: Flat Owners & Unit Register

**Branch**: `005-flat-owners` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Add association flat + member register in the monorepo (Prisma models + `/api/association/flats` routes + React pages), gated by shared-auth permissions. Foundation for NOC and move-in/out.

## Technical Context

**Language/Version**: Node 20 ESM, React 18  
**Primary Dependencies**: Express, Prisma, Zod, TanStack Query  
**Storage**: PostgreSQL (v1 tables in inventory Prisma schema; future `association` schema split OK)  
**Testing**: Jest list/create uniqueness; manual UI  
**Project Type**: Modular monorepo — routes under inventory-service as `/api/association/*` until dedicated service extracted  

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo | PASS | Association APIs namespaced; can split service later |
| Schema-per-module | PARTIAL | v1 same DB public schema; plan notes future `association` schema |
| Shared roles | PASS | flatOwners permissions for Superadmin/Secretary/Committee view |
| Soft-delete | PASS | deletedAt on Flat / FlatMember |
| Spec-driven | PASS | This folder |

## Project Structure

```text
services/inventory-service/prisma/schema.prisma  # Flat, FlatMember
services/inventory-service/src/routes/association/
apps/web/src/modules/association/pages/FlatsPage.jsx
packages/shared-auth/.../permissions.js          # flatOwners
```

## Complexity Tracking

Schema co-location justified for speed; extract association-service when dues/resident chatbot land.
