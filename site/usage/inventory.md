# Inventory

Inventory tracks the association's shared supplies — electrical, plumbing, housekeeping, safety, garden, and maintenance — so the office knows what's in stock, what's been used, and what to reorder.

## Dashboard

<img class="screenshot" src="/screenshots/dashboard.png" alt="Inventory dashboard" />

- **Total items**, **total stock value**, **pending purchase orders**, and **low-stock items** at a glance
- Stock value by category and the top five consumed items over the last three months
- Recent alerts and quick actions: add item, create purchase order, record stock in or out

## Items

The master catalogue. Each item has a name, SKU, optional barcode and photo, category, unit, minimum stock level, and unit price.

<img class="screenshot" src="/screenshots/items.png" alt="Items catalogue" />

Stock status is calculated automatically and can't be set by hand:

| Status | Rule |
|--------|------|
| In stock | Current stock above the minimum |
| Low stock | At or below the minimum |
| Out of stock | Zero |

Search by name, SKU, barcode, category, or unit, and filter by category, status, and unit.

## Categories, suppliers, warehouses

| Screen | Holds |
|--------|-------|
| **Categories** | Item groups such as Electrical, Plumbing, Housekeeping, Safety, Garden, Maintenance |
| **Suppliers** | Vendor name, contact, phone, email, GST and address. Suppliers can get a [vendor portal](/usage/vendor-portal) login |
| **Warehouses** | Store rooms, for example Main Store and Annex Store. Stock is tracked per warehouse; one is the default |

<div class="screenshot-row">
  <img class="screenshot" style="flex: 1 1 420px; min-width: 0" src="/screenshots/suppliers.png" alt="Suppliers" />
  <img class="screenshot" style="flex: 1 1 420px; min-width: 0" src="/screenshots/warehouses.png" alt="Warehouses" />
</div>

## Stock in and stock out

**Stock Management** records every movement. Choose **Stock In** or **Stock Out**, pick the warehouse, search the item by name, SKU, or barcode, enter the quantity and notes, and save.

<img class="screenshot" src="/screenshots/stock.png" alt="Stock management" />

- **Needs replenishment** lists out-of-stock and low-stock items; **Use** fills the form for that item.
- Every movement is a permanent transaction with before and after quantities, who recorded it, and the warehouse. Mistakes are corrected with a new adjusting transaction, not by editing history.
- Stock out can't take more than the warehouse holds.

## Transactions

The full movement log. Search by item, SKU, person, warehouse, or notes, and filter by type, warehouse, and date range.

<img class="screenshot" src="/screenshots/transactions.png" alt="Stock transactions" />

## Barcodes

Look up an item by scanning or typing its barcode, and print Code 128 labels for shelves and bins.

<img class="screenshot" src="/screenshots/barcodes.png" alt="Barcodes" />

## Who can do what

| Role | Items, categories, suppliers | Warehouses | Stock in/out | Barcodes |
|------|------|------|------|------|
| Superadmin, Secretary | Full | Edit | ✓ | Edit |
| Committee | Edit | Edit | ✓ | View |
| Treasurer | View | View | ✓ | View |
| Staff | View | View | ✓ | Edit |
