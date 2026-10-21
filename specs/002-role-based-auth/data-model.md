# Data Model: Role-Based Auth

## Existing entities (no schema change required for matrix)

### User
- `id`, `associationId`, `email`, `passwordHash`, `name`, `role`, `supplierId?`, `active`, timestamps
- Unique `(associationId, email)`

### Session (ephemeral)
- JWT claims: `sub`, `role`, `association_id`, `name`, `email`, `supplier_id?`
- Not stored server-side in v1

## Logical permission resources

| Resource key | Covers |
|--------------|--------|
| `items` | Item catalog |
| `categories` | Categories |
| `suppliers` | Suppliers |
| `warehouses` | Warehouses |
| `stock` | Stock transactions / receive |
| `purchaseOrders` | PO lifecycle |
| `purchaseRequisitions` | PRs |
| `amc` | AMC contracts |
| `reports` | Reports export |
| `settings` | Association settings |
| `vendor` | Vendor portal |
| `users` | User registration (Secretary) |

## Actions
- `view`
- `createEdit`
- `delete`
- `approve` (PO / post-approve only)

## Validation rules
- Inactive users cannot obtain a session
- Vendor without `supplierId` cannot pass vendor guards
- Soft-delete endpoints require `delete` on that resource
