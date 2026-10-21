import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { ItemSearchSelect } from '../components/ItemSearchSelect.jsx';
import { StockTransactionsTable } from '../components/StockTransactionsTable.jsx';
import { PageHeader, StatusBadge } from '../components/ui.jsx';

export default function StockPage() {
  const qc = useQueryClient();
  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: api.warehouses.list,
  });
  const [mode, setMode] = useState('IN');
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({
    itemId: '',
    warehouseId: '',
    quantity: 1,
    notes: '',
    department: 'Maintenance Team',
  });

  const needsReplenish = useQuery({
    queryKey: ['items', 'needs-replenish'],
    queryFn: async () => {
      const [out, low] = await Promise.all([
        api.items.list({ status: 'OUT_OF_STOCK' }),
        api.items.list({ status: 'LOW_STOCK' }),
      ]);
      const seen = new Set();
      const merged = [];
      for (const i of [...out, ...low]) {
        if (seen.has(i.id)) continue;
        seen.add(i.id);
        merged.push(i);
      }
      return merged;
    },
    enabled: mode === 'IN',
    staleTime: 20_000,
  });

  const availableIssue = useQuery({
    queryKey: ['items', 'ready-to-issue'],
    queryFn: async () => {
      // Stock Out panel: healthy IN_STOCK only — not the same low/out list as Stock In
      const rows = await api.items.list({ status: 'IN_STOCK' });
      return [...rows].sort(
        (a, b) =>
          Number(b.currentStock) - Number(a.currentStock) ||
          a.name.localeCompare(b.name)
      );
    },
    enabled: mode === 'OUT',
    staleTime: 20_000,
  });

  const recent = useQuery({
    queryKey: ['stock'],
    queryFn: api.stock.list,
  });

  const attentionRows = useMemo(() => {
    if (mode === 'IN') return (needsReplenish.data || []).slice(0, 12);
    return (availableIssue.data || []).slice(0, 12);
  }, [mode, needsReplenish.data, availableIssue.data]);

  const save = useMutation({
    mutationFn: api.stock.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['prs'] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setForm((f) => ({ ...f, quantity: 1, notes: '' }));
    },
  });

  function useAttentionItem(item) {
    setSelectedItem(item);
    setForm((f) => ({ ...f, itemId: item.id }));
  }

  function onItemChange(id, item) {
    setForm((f) => ({ ...f, itemId: id }));
    setSelectedItem(item || null);
  }

  const recentRows = (recent.data || []).slice(0, 15);

  return (
    <div>
      <PageHeader
        title="Stock Management"
        subtitle="Search items, see what needs stock or can be issued, then record immutable in/out"
      />
      <Can
        resource="stock"
        action="createEdit"
        fallback={
          <p className="panel text-sm text-warn">
            Your role can view stock history but cannot record in/out.
          </p>
        }
      >
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={mode === 'IN' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => {
              setMode('IN');
              setSelectedItem(null);
              setForm((f) => ({ ...f, itemId: '' }));
            }}
          >
            Stock In
          </button>
          <button
            type="button"
            className={mode === 'OUT' ? 'btn-accent' : 'btn-ghost'}
            onClick={() => {
              setMode('OUT');
              setSelectedItem(null);
              setForm((f) => ({ ...f, itemId: '' }));
            }}
          >
            Stock Out
          </button>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          <div className="panel lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold text-ink">
              {mode === 'IN' ? 'Needs replenishment' : 'Ready to issue'}
            </h2>
            <p className="mb-3 text-xs text-muted">
              {mode === 'IN'
                ? 'Out of stock and low stock — click Use to stock in.'
                : 'Healthy in-stock items (above minimum). Use search if you must issue the last units of a low-stock SKU.'}
            </p>
            {(mode === 'IN' ? needsReplenish.isLoading : availableIssue.isLoading) ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : !attentionRows.length ? (
              <p className="text-sm text-muted">
                {mode === 'IN'
                  ? 'Nothing below minimum — catalog looks healthy.'
                  : 'No healthy in-stock items — use search or switch to Stock In.'}
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {attentionRows.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-line/70 px-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {i.name}
                      </p>
                      <p className="text-xs text-muted">
                        {i.sku} · {Number(i.currentStock)} {i.unit}
                        {mode === 'IN'
                          ? ` (min ${Number(i.minStockLevel)})`
                          : ` · min ${Number(i.minStockLevel)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={i.status} />
                      <button
                        type="button"
                        className="btn-ghost !px-2 text-xs"
                        onClick={() => useAttentionItem(i)}
                      >
                        Use
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            className="panel grid gap-3 lg:col-span-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                itemId: form.itemId,
                warehouseId: form.warehouseId || null,
                type: mode,
                quantity: Number(form.quantity),
                referenceType: mode === 'IN' ? 'MANUAL' : 'ISSUE',
                notes: form.notes,
                department: mode === 'OUT' ? form.department : null,
              });
            }}
          >
            <label>
              <span className="label">Warehouse</span>
              <select
                className="input"
                value={form.warehouseId}
                onChange={(e) =>
                  setForm({ ...form, warehouseId: e.target.value })
                }
              >
                <option value="">Default warehouse</option>
                {(warehouses.data || []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </label>

            <ItemSearchSelect
              value={form.itemId}
              selectedItem={selectedItem}
              onChange={onItemChange}
              required
            />

            {selectedItem ? (
              <div className="rounded-md border border-line bg-surface/50 px-3 py-2 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{selectedItem.name}</span>
                  <StatusBadge status={selectedItem.status} />
                </div>
                <p className="text-muted">
                  On hand{' '}
                  <span className="font-semibold text-ink">
                    {Number(selectedItem.currentStock)} {selectedItem.unit}
                  </span>
                  {' · '}
                  Min {Number(selectedItem.minStockLevel)}
                  {selectedItem.category?.name
                    ? ` · ${selectedItem.category.name}`
                    : ''}
                  {selectedItem.sku ? ` · ${selectedItem.sku}` : ''}
                </p>
                {mode === 'OUT' && Number(selectedItem.currentStock) <= 0 ? (
                  <p className="mt-1 text-xs text-err">
                    No stock on hand — switch to Stock In or pick another item.
                  </p>
                ) : null}
                {mode === 'IN' &&
                (selectedItem.status === 'OUT_OF_STOCK' ||
                  selectedItem.status === 'LOW_STOCK') ? (
                  <p className="mt-1 text-xs text-warn">
                    This item needs replenishment (at or below minimum).
                  </p>
                ) : null}
              </div>
            ) : null}

            <label>
              <span className="label">Quantity</span>
              <input
                className="input"
                type="number"
                min="0.001"
                step="any"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                required
              />
            </label>
            {mode === 'OUT' ? (
              <label>
                <span className="label">Department / purpose</span>
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </label>
            ) : null}
            <label>
              <span className="label">Notes</span>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <button
              className="btn-primary w-fit"
              type="submit"
              disabled={save.isPending || !form.itemId}
            >
              Record {mode === 'IN' ? 'Stock In' : 'Stock Out'}
            </button>
            {save.isError ? (
              <p className="text-sm text-err">{save.error.message}</p>
            ) : null}
            {save.isSuccess ? (
              <p className="text-sm text-ok">Transaction recorded.</p>
            ) : null}
          </form>
        </div>

        <div className="panel">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Recent transactions
          </h2>
          <StockTransactionsTable rows={recentRows} />
        </div>
      </Can>
    </div>
  );
}
