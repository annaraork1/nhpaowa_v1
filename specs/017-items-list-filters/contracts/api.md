# API Contract: Items List Filters

Base: `/api/inventory/items` — permission `items` view.

## GET `/`

Query params (all optional):

| Param | Type | Behaviour |
|-------|------|-----------|
| `q` | string | Case-insensitive contains on `name`, `sku`, `barcode`, `unit`, or related `category.name` |
| `categoryId` | uuid | Exact category |
| `status` | enum | `IN_STOCK` \| `LOW_STOCK` \| `OUT_OF_STOCK` — same rules as derived status |
| `unit` | string | Exact unit match (trim, case-insensitive) |

Response: array of items with `category` and derived `status` (unchanged shape). Soft-deleted excluded. Default order: `updatedAt` desc.
