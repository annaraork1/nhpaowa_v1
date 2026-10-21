# API Contract: Transactions List Filters

Base: `/api/inventory/stock-transactions` — permission `stock` view.

## GET `/`

Query params (all optional):

| Param | Type | Behaviour |
|-------|------|-----------|
| `q` | string | Case-insensitive contains on `item.name`, `item.sku`, `performedByName`, `department`, `notes`, `warehouse.name`; also matches `referenceType` enum values when the query is a substring of the enum / spaced label (e.g. `manual`, `purchase`) |
| `type` | enum | `IN` \| `OUT` |
| `warehouseId` | uuid | Exact warehouse |
| `itemId` | uuid | Exact item (existing) |
| `from` | `YYYY-MM-DD` | `transactionDate` ≥ start of that calendar day (UTC) |
| `to` | `YYYY-MM-DD` | `transactionDate` ≤ end of that calendar day (UTC) |
| `limit` | int | 1–200 (default 200) |

Response: array of stock transactions with `item` and `warehouse` (unchanged shape). Order: `transactionDate` desc.
