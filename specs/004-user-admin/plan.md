# Implementation Plan: Superadmin User & Role Administration

**Branch**: `004-user-admin` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-user-admin/spec.md`

## Summary

Introduce a `SUPERADMIN` role and a Users administration UI/API so association Superadmins can create users, assign roles (including Vendor + supplier), update accounts, reset passwords, and activate/deactivate — with safeguards against removing the last Superadmin. Extends identity-service and shared-auth; web shell gets a Users page gated to Superadmin.

## Technical Context

**Language/Version**: Node.js 20+ (ESM JavaScript), React 18  

**Primary Dependencies**: Express, Prisma, bcryptjs, Zod, Vite, React Router, TanStack Query, shared-auth  

**Storage**: Existing PostgreSQL `User` model; no new tables (role string gains `SUPERADMIN`)  

**Testing**: Jest/Supertest for identity user admin rules; manual quickstart for UI  

**Target Platform**: Local web + later Netlify SPA  

**Project Type**: Modular monorepo (identity-service, inventory-service, apps/web, packages/shared-auth)  

**Performance Goals**: User list < 1s local for hundreds of users; create/update < 2s  

**Constraints**: Constitution shared roles; JWT role claim; association-scoped users; no password hashes in API responses  

**Scale/Scope**: One association; ~7 roles; Users admin screen + identity endpoints  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo / shared auth | PASS | `SUPERADMIN` + `users` permissions in shared-auth; identity owns user CRUD |
| One tech stack | PASS | JS Express/React/Prisma only |
| Spec-driven | PASS | This feature directory |
| Shared role model | PASS | Extends ROLES with SUPERADMIN; matrix updated |
| Soft-delete master data | PASS | Users use `active` flag, not hard delete |
| No cross-service DB from web | PASS | Web → identity API only for users |

**Post-design re-check**: PASS — no second user store; seed bootstraps Superadmin.

## Project Structure

### Documentation (this feature)

```text
specs/004-user-admin/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── user-admin.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared-auth/src/
  permissions.js          # SUPERADMIN + users matrix
services/identity-service/src/
  index.js                # list/create/update/password/activate guards
services/inventory-service/prisma/
  seed.js                 # seed SUPERADMIN
apps/web/src/
  modules/inventory/
    pages/UsersPage.jsx   # admin UI
    auth/permissions.js   # mirror matrix
    api/client.js         # users API helpers
  App.jsx                 # nav + route /users
```

**Structure Decision**: Extend identity-service + shared-auth + web; no new microservice.

## Complexity Tracking

> No constitution violations requiring justification.
