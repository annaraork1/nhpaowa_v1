# API Contract: Stock Management UX

No new endpoints. Reuses:

- `GET /api/inventory/items?q=&status=` (017)
- `GET /api/inventory/stock-transactions` (existing list)
- `POST /api/inventory/stock-transactions` (unchanged create body)

UI-only composition on Stock page.
