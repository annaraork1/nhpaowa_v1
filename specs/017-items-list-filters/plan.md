# Plan: 017 Items List Filters

1. Spec / research / contracts / tasks (this feature + 001 cross-link).
2. Extend `items.js` GET `/` with `q`, `categoryId`, `status`, `unit`.
3. Client `api.items.list(params)` + ItemsPage filter bar (debounced q).
4. Smoke + mark tasks.
