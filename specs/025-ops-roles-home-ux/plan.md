# Implementation Plan: 025-ops-roles-home-ux

**Branch**: `025-ops-roles-home-ux` | **Date**: 2026-09-23

## Approach

1. Extend `ROLES` + `PERMISSIONS` in `@nhpaowa/shared-auth` for three ops roles.
2. Prisma `RoleMenuAccess` (associationId, role, resource, enabled).
3. Identity API: list/save role menu features; login returns `menuFeatures: string[]`.
4. Web session stores `menuFeatures`; `can(view)` for ops roles uses it.
5. UsersPage: Role features tab with checkboxes mapped to nav resources.
6. Dashboard/Home: action cards for permitted features (plain labels).
7. FlatSearchSelect: `GET /flats?limit=0` once, client filter, not-found message.
8. App.jsx: reorder nav — Users second for Superadmin.

## Key files

- `packages/shared-auth/src/permissions.js`
- `services/inventory-service/prisma/schema.prisma`
- `services/identity-service/src/index.js`
- `apps/web/.../permissions.js`, `client.js`, `App.jsx`, `UsersPage.jsx`, `DashboardPage.jsx`, `FlatSearchSelect.jsx`
