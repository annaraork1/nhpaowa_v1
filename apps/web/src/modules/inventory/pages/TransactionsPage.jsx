import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { PageHeader, QueryStatus } from '../components/ui.jsx';
import { StockTransactionsTable } from '../components/StockTransactionsTable.jsx';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'IN', label: 'Stock In' },
  { value: 'OUT', label: 'Stock Out' },
];

export default function TransactionsPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [type, setType] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const listParams = useMemo(
    () => ({
      q: debouncedQ,
      type,
      warehouseId,
      from,
      to,
      limit: 200,
    }),
    [debouncedQ, type, warehouseId, from, to],
  );

  const filtersActive = Boolean(
    debouncedQ || type || warehouseId || from || to || q.trim(),
  );

  function clearFilters() {
    setQ('');
    setDebouncedQ('');
    setType('');
    setWarehouseId('');
    setFrom('');
    setTo('');
  }

  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: api.warehouses.list,
  });

  const list = useQuery({
    queryKey: ['stock', listParams],
    queryFn: () => api.stock.list(listParams),
  });

  const rows = list.data || [];

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Immutable stock movement log — before/after levels, who, and when"
      />

      <div className="panel mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="label">Search</span>
          <input
            className="input"
            placeholder="Item, SKU, who, warehouse, notes, department…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q !== debouncedQ ? (
            <p className="mt-1 text-xs text-muted">Searching…</p>
          ) : null}
        </label>
        <label>
          <span className="label">Type</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Warehouse</span>
          <select
            className="input"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">All warehouses</option>
            {(warehouses.data || []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">From</span>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          <span className="label">To</span>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="button"
            className="btn-ghost"
            disabled={!filtersActive}
            onClick={clearFilters}
          >
            Clear filters
          </button>
          <p className="ml-3 text-xs text-muted">
            {list.isFetching
              ? 'Updating…'
              : `${rows.length} transaction(s)`}
          </p>
        </div>
      </div>

      <QueryStatus
        query={list}
        empty={
          filtersActive
            ? 'No transactions match these filters.'
            : 'No transactions yet.'
        }
        isEmpty={() => !rows.length}
      />
      {rows.length ? (
        <div className="panel p-0 sm:p-3 md:p-0">
          <StockTransactionsTable
            rows={rows}
            emptyMessage={
              filtersActive
                ? 'No transactions match these filters.'
                : 'No transactions yet.'
            }
          />
        </div>
      ) : null}
    </div>
  );
}
