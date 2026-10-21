# Identity API

Base path: `/api/auth` (identity-service, port 4000).

## Sign in

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "secretary@nhpaowa.local", "password": "password123" }
```

Response:

```json
{
  "token": "eyJhbGciOi…",
  "user": {
    "id": "…",
    "email": "secretary@nhpaowa.local",
    "name": "…",
    "role": "SECRETARY",
    "supplierId": null,
    "associationId": "…",
    "menuFeatures": null
  }
}
```

Wrong email or password returns `401 Invalid credentials`. Deactivated users can't sign in.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| POST | `/login` | Public | Sign in and get a token |
| GET | `/me` | Any signed-in user | Current user, including menu features |
| GET | `/roles` | users: view | Role codes and display labels |
| GET | `/users` | users: view | List users |
| POST | `/users` | users: edit | Create a user |
| POST | `/register` | users: edit | Same as `POST /users` |
| PATCH | `/users/:id` | users: edit | Update name, email, role, supplier, password, or active flag |
| GET | `/role-menu-features?role=…` | users: view | Enabled menu features for a customizable role |
| PUT | `/role-menu-features` | users: edit | Set the menu features for a customizable role |

In the default matrix only **Superadmin** has the `users` permission.

### Create a user

```http
POST /api/auth/users
Authorization: Bearer <token>

{
  "email": "guard2@nhpaowa.local",
  "name": "Gate Guard 2",
  "password": "ChangeMe!2026",
  "role": "SECURITY_STAFF"
}
```

For the `VENDOR` role, include `supplierId`. A duplicate email returns `409`.

### Menu features

Only Staff, Security Head, Estate Manager, and Security Staff are customizable. Other roles return `400 Role is not customizable for menu features`.

```http
PUT /api/auth/role-menu-features

{ "role": "SECURITY_STAFF", "features": ["home", "schoolBus", "attendance"] }
```

Feature keys: `home`, `dashboard`, `flatOwners`, `noc`, `notices`, `board`, `attendance`, `schoolBus` (bus gate), `schoolBusAdmin`, `moves`, `items`, `categories`, `suppliers`, `warehouses`, `barcodes`, `purchaseOrders`, `purchaseRequisitions`, `stock`, `amc`, `reports`, `settings`.

Users pick up the change at their next sign-in.
