# Research: Role-Based Auth & Access Control

## Decision 1: Code-defined permission matrix (not DB ACL rows)

**Decision**: Encode view / create-edit / delete / approve grants per role×resource in `packages/shared-auth`.

**Rationale**: Six fixed platform roles already in constitution; matrix is small and must stay consistent FE+BE. DB ACL adds migration/admin UI without v1 need.

**Alternatives considered**: Per-user ACL table; CASL library — rejected as heavier than needed for fixed roles.

## Decision 2: JWT session is source of truth for web

**Decision**: After login, web stores JWT + user; role comes from token/user payload. Dev `X-Dev-Role` dropdown only when no JWT and `AUTH_STRICT` is false.

**Rationale**: Spec FR-002 — client must not pick role when a real session exists.

## Decision 3: AuthGate redirect vs optional login

**Decision**: Web inventory shell requires login (redirect unauthenticated users to `/login`). API may still accept stub headers when `AUTH_STRICT=false` for scripts/tests.

**Rationale**: Meets FR-007 without breaking e2e smoke that uses headers.

## Decision 4: Treasurer “limited” create-edit

**Decision**: Treasurer gets create-edit on purchase orders + stock receive; **not** on categories/items/suppliers delete; **not** settings. May create/edit PO lines; cannot soft-delete master data.

**Rationale**: Matches constitution Treasurer focus (approvals/financial) and spec matrix.

## Decision 5: Resident view set

**Decision**: Resident can view dashboard, items (read), alerts, reports (read). No PO write, no stock write, no settings, no AMC write, no warehouses write.

**Rationale**: Constitution: residents are self-service view; inventory write forbidden.
