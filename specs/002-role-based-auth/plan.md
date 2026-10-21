# Implementation Plan: Role-Based Auth & Access Control

**Branch**: `002-role-based-auth` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-role-based-auth/spec.md`

## Summary

Harden the existing identity + inventory stack so email/password login drives a shared permission matrix (view / create-edit / delete / approve). Enforce the matrix in `packages/shared-auth`, inventory API route guards, and the React shell (login gate + hide Create/Edit/Delete).

## Technical Context

**Language/Version**: Node.js 20+ (ESM JavaScript), React 18  

**Primary Dependencies**: Express, Prisma, bcryptjs, jsonwebtoken, Vite, React Router, TanStack Query  

**Storage**: PostgreSQL `User` (+ existing inventory tables); no new tables required for v1 matrix (code-defined permissions)  

**Testing**: Jest + Supertest for permission denial; manual quickstart for UI  

**Target Platform**: Local web + Netlify SPA later  

**Project Type**: Modular monorepo (identity-service, inventory-service, apps/web, packages/shared-auth)  

**Performance Goals**: Login < 2s local; permission checks O(1) in-process  

**Constraints**: Constitution §2.4 roles; JWT shared across services; soft-delete only  

**Scale/Scope**: One association, ~6 roles, inventory module screens  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo / shared auth package | PASS | Permissions live in `packages/shared-auth`; identity issues JWT; inventory consumes |
| One tech stack (JS Express/React/Prisma) | PASS | No new languages |
| Spec-driven (spec/plan/tasks) | PASS | This feature directory |
| Shared role model | PASS | SECRETARY, TREASURER, COMMITTEE, STAFF, RESIDENT, VENDOR |
| Soft-delete for master data | PASS | Delete permission = soft-delete |
| No cross-service DB reach from web | PASS | Web calls identity + inventory APIs only |

**Post-design re-check**: PASS — matrix is code config in shared-auth; no second IdP.

## Project Structure

### Documentation (this feature)

```text
specs/002-role-based-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-permissions.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared-auth/src/
  index.js                 # extend: permissions matrix, can(), requirePermission
services/identity-service/ # already: login/me/register
services/inventory-service/
  src/middleware/permissions.js   # optional thin wrappers
  src/routes/*.js                 # apply requirePermission
  tests/rbac.test.js
apps/web/src/
  modules/inventory/
    auth/permissions.js           # mirror/consume matrix for UI
    auth/AuthGate.jsx
    pages/LoginPage.jsx           # already exists — harden
    components/Can.jsx            # conditional render
    api/client.js                 # session required
  App.jsx                         # AuthGate + role-aware nav
```

**Structure Decision**: Extend existing monorepo packages/services; no new service.

## Complexity Tracking

> No constitution violations requiring justification.
