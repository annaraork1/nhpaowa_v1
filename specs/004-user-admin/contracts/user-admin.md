# Contract: User Administration API

Base: identity-service (`/api/auth`). All routes below require JWT. User admin mutations require role `SUPERADMIN`.

## Roles enum (shared-auth)

`SUPERADMIN` | `SECRETARY` | `TREASURER` | `COMMITTEE` | `STAFF` | `RESIDENT` | `VENDOR`

## Permissions

| Resource | SUPERADMIN | Others |
|----------|------------|--------|
| users | view, createEdit | none |

SUPERADMIN also receives full inventory permissions equivalent to Secretary (or broader) so they can operate the association.

## GET `/api/auth/users`

**Auth**: Superadmin  
**Response 200**: array of `{ id, email, name, role, supplierId, active, createdAt }`  
**403**: non-Superadmin

## POST `/api/auth/users`

**Auth**: Superadmin  
**Body**: `{ email, password, name, role, supplierId?, active? }`  
**Response 201**: created user (no password)  
**400**: validation / vendor without supplier  
**409**: duplicate email  
**403**: non-Superadmin

> Note: Prefer `/api/auth/users` over legacy `/api/auth/register` for Superadmin UI; keep `register` as alias restricted to Superadmin for compatibility or deprecate to Superadmin-only.

## PATCH `/api/auth/users/:id`

**Auth**: Superadmin  
**Body** (all optional): `{ email, name, role, supplierId, active, password }`  
**Response 200**: updated user (no password)  
**400**: validation / last Superadmin safeguard / vendor rules  
**404**: not found in association  
**409**: duplicate email  

## GET `/api/auth/roles`

**Auth**: Superadmin (or any authenticated for display lists)  
**Response 200**: `{ roles: string[] }` — known assignable roles for UI dropdowns.

## Login behavior

Inactive users (`active=false`) → `401 Invalid credentials` (same as bad password; optional distinct message “Account inactive”).
