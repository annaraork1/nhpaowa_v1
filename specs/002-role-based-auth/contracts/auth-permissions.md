# Contract: Auth & Permissions

## Identity

### `POST /api/auth/login`
Request: `{ "email": string, "password": string }`  
Response 200: `{ "token": string, "user": { id, email, name, role, supplierId, associationId } }`  
Errors: 401 invalid credentials; 401 inactive

### `GET /api/auth/me`
Auth: Bearer JWT  
Response: `{ "user": { ... } }`

## Inventory permission enforcement

All `/api/inventory/*` routes require auth middleware.

| Method pattern | Resource | Action |
|----------------|----------|--------|
| GET lists/details | matching resource | `view` |
| POST / PUT create-update | matching resource | `createEdit` |
| DELETE soft-delete | matching resource | `delete` |
| PO approve / post-approve | `purchaseOrders` | `approve` |
| Settings PUT | `settings` | `createEdit` (Secretary only in matrix) |
| `/vendor/*` | `vendor` | `view` + vendor supplier scope |

Denial: **403** `{ "error": "Forbidden: <action> <resource>" }`

## Web session contract

- LocalStorage: `nhpaowa_token`, `nhpaowa_user`
- Authorization header: `Bearer <token>`
- On 401 from inventory/identity: clear session → `/login`
