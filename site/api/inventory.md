# Inventory API

Base path: `/api/inventory` (inventory-service, port 4001).

## Catalogue

| Resource | Endpoints |
|----------|-----------|
| Items | `GET /items`, `GET /items/:id`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id` |
| Categories | `GET /categories`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` |
| Suppliers | `GET /suppliers`, `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id` |
| Warehouses | `GET /warehouses`, `GET /warehouses/:id/stock`, `POST /warehouses`, `PUT /warehouses/:id` |
| Barcodes | `GET /barcodes/lookup/:code`, `GET /barcodes/:itemId.png` (Code 128 label image) |
| Uploads | `POST /uploads` (multipart image; served back from `/uploads/…`) |

## Stock

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stock-transactions` | Movement log (filters: search, type, warehouse, date range) |
| POST | `/stock-transactions` | Record a stock in or out |

```http
POST /api/inventory/stock-transactions
Authorization: Bearer <token>

{
  "itemId": "…",
  "warehouseId": "…",
  "type": "OUT",
  "quantity": 4,
  "referenceType": "ISSUE",
  "department": "Tower 7 lobby",
  "notes": "LED tubes replaced"
}
```

`referenceType` is one of `PURCHASE_ORDER`, `MANUAL`, `ADJUSTMENT`, `ISSUE`. Stock out beyond what the warehouse holds returns `400 Insufficient stock at warehouse`.

## Purchase orders

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/purchase-orders` · `/purchase-orders/:id` | List or view |
| POST | `/purchase-orders` | Create a draft (set `isEmergency` and `emergencyReason` for emergencies) |
| POST | `/purchase-orders/:id/submit` | Submit — auto-approves at or below the threshold |
| POST | `/purchase-orders/:id/approve` | Approve (Secretary, Treasurer, Superadmin) |
| POST | `/purchase-orders/:id/post-approve` | Sign off an emergency PO after the fact |
| POST | `/purchase-orders/:id/mark-ordered` | Mark as sent to the supplier |
| POST | `/purchase-orders/:id/receive` | Receive lines into a warehouse; closes the PO when fully received |
| POST | `/purchase-orders/:id/cancel` | Cancel |
| POST | `/purchase-orders/:id/close` | Close a received PO |

## Requisitions and AMC

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/purchase-requisitions` | List or raise a requisition |
| POST | `/purchase-requisitions/:id/convert-to-po` | Convert into a draft PO |
| POST | `/purchase-requisitions/:id/cancel` | Cancel |
| GET/POST | `/amc` | List or add contracts |
| PUT/DELETE | `/amc/:id` | Edit or delete |
| POST | `/amc/:id/renew` | Renew for a new period |

## Dashboard, reports, alerts, search, settings

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/summary` · `/dashboard/widgets` | KPI cards |
| GET | `/dashboard/stock-value-by-category` · `/dashboard/top-consumed` | Charts |
| GET | `/reports/valuation` · `/reports/consumption` · `/reports/supplier-spend` | Reports |
| GET | `/alerts` | Alerts for the association |
| PATCH | `/alerts/:id/read` | Mark read |
| GET | `/search?q=…` | Global search across items, suppliers, POs |
| GET/PUT | `/settings` | `poApprovalThreshold`, `autoPrOnLowStock`, `defaultWarehouseId` |
| GET | `/me` | Current user as seen by this service |

## Vendor portal

Vendor tokens can only call these, and only see their own supplier's data:

| Method | Path |
|--------|------|
| GET | `/vendor/me` |
| GET | `/vendor/purchase-orders` |
| GET | `/vendor/purchase-orders/:id` |
