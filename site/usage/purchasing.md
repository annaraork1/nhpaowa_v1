# Purchasing & AMC

## Purchase orders

<img class="screenshot" src="/screenshots/purchase-orders.png" alt="Purchase orders" />

### Lifecycle

```txt
DRAFT → (submit) → APPROVED ─────────────→ ORDERED → PARTIALLY_RECEIVED → CLOSED
              ↘ PENDING_APPROVAL → APPROVED ↗
```

1. **Create PO** — supplier, line items, quantities, prices, expected date.
2. **Submit.**
   - Total at or below the **approval threshold** → approved automatically.
   - Above the threshold → **Pending approval** until a Secretary, Treasurer, or Superadmin approves it.
3. **Mark ordered** once the order has been sent to the supplier.
4. **Receive** goods into a warehouse, fully or in part. Each receipt creates stock-in transactions automatically and raises a *stock received* alert.
5. When every line is fully received, the PO **closes** automatically.

A PO can be cancelled before it's received.

The threshold is set by the Secretary in **Settings** (default ₹10,000). The page header shows the current value.

### Emergency purchase orders

For urgent repairs, mark a PO as **emergency**. It's approved immediately so work can start, but stays flagged as **pending post-approval** until a Secretary or Treasurer reviews it afterwards.

## Purchase requisitions

A requisition is a request to buy, raised before a supplier is chosen.

<img class="screenshot" src="/screenshots/requisitions.png" alt="Purchase requisitions" />

- **Manual** — staff pick an item, quantity, optional preferred supplier, and notes.
- **Automatic** — when **auto-PR on low stock** is enabled in Settings, an item falling to its minimum creates a requisition.
- Choose a supplier and **convert** (🔄) the requisition into a draft purchase order, or cancel it (⊘).

## AMC contracts

Annual maintenance contracts for equipment — fire extinguishers, lifts, pumps, generators.

<img class="screenshot" src="/screenshots/amc.png" alt="AMC contracts" />

Each contract records the description, vendor, linked item, start and end dates, and a **lead time** in days. An expiry alert is raised that many days before the end date. **Renew** (🔄) rolls the contract to a new period and keeps the history.

## Who can do what

| Role | Purchase orders | Requisitions | AMC |
|------|-----------------|--------------|-----|
| Superadmin, Secretary | Create, approve | Create, convert | Full |
| Treasurer | Create, approve | Create, convert | View |
| Committee | Create | Create, convert | Edit |
| Staff | Create | Create, convert | View |
