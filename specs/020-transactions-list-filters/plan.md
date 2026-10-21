# Plan: 020 Transactions List Filters

1. Spec / research / contracts / tasks + cross-link 001 / 018 / 019.
2. Extend `stock.js` GET `/` with `q`, `type`, `warehouseId`, `from`, `to` (keep `itemId`, `limit`).
3. TransactionsPage filter bar (debounced q) mirroring Items filters UX; reuse `StockTransactionsTable`.
4. Smoke + mark tasks.
