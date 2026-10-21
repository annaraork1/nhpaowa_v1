import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { StatusBadge, inr } from './ui.jsx';
import { StockTransactionsTable } from './StockTransactionsTable.jsx';

/** Item details for the Items page view modal, including last 5 stock moves. */
export function ItemViewDetails({ item }) {
  const txns = useQuery({
    queryKey: ['stock', 'by-item', item.id, 5],
    queryFn: () => api.stock.list({ itemId: item.id, limit: 5 }),
    staleTime: 15_000,
  });

  const rows = txns.data || [];

  return (
    <div className="space-y-4">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Name</dt>
          <dd className="font-medium">{item.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">SKU / Barcode</dt>
          <dd>
            {item.sku}
            {item.barcode ? ` · ${item.barcode}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Category</dt>
          <dd>{item.category?.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Stock</dt>
          <dd>
            {Number(item.currentStock)} {item.unit} (min{' '}
            {Number(item.minStockLevel)})
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Price</dt>
          <dd>{inr(item.unitPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Status</dt>
          <dd>
            <StatusBadge status={item.status} />
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Last 5 transactions
        </h3>
        {txns.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <StockTransactionsTable
            rows={rows}
            showItem={false}
            emptyMessage="No stock movements yet."
          />
        )}
      </div>
    </div>
  );
}
