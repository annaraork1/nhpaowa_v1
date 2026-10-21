import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { RowActions } from '../components/RowActions.jsx';
import { EmptyState, PageHeader } from '../components/ui.jsx';

const blank = { code: '', name: '', address: '', isDefault: false };

export default function WarehousesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [selected, setSelected] = useState(null);

  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: api.warehouses.list,
  });
  const stock = useQuery({
    queryKey: ['warehouses', selected, 'stock'],
    queryFn: () => api.warehouses.stock(selected),
    enabled: Boolean(selected),
  });

  const save = useMutation({
    mutationFn: api.warehouses.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setForm(blank);
    },
  });

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Multi-location stock — MAIN is the default store"
      />

      <Can resource="warehouses" action="createEdit">
      <form
        className="panel mb-6 grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            ...form,
            address: form.address || null,
            isDefault: Boolean(form.isDefault),
          });
        }}
      >
        <label>
          <span className="label">Code</span>
          <input
            className="input"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </label>
        <label>
          <span className="label">Name</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">Address</span>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Default warehouse
        </label>
        <div className="md:col-span-2">
          <button className="btn-primary" type="submit" disabled={save.isPending}>
            Add warehouse
          </button>
          {save.isError ? (
            <p className="mt-2 text-sm text-err">{save.error.message}</p>
          ) : null}
        </div>
      </form>
      </Can>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h3 className="mb-3 font-semibold">Locations</h3>
          {(warehouses.data || []).length === 0 ? (
            <EmptyState message="No warehouses yet" />
          ) : (
            <ul className="space-y-2">
              {(warehouses.data || []).map((w) => (
                <li
                  key={w.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    selected === w.id
                      ? 'border-brand tint-brand'
                      : 'border-line'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelected(w.id)}
                  >
                    <span className="font-semibold text-ink">{w.name}</span>
                    <span className="text-muted"> · {w.code}</span>
                    {w.isDefault ? (
                      <span className="ml-2 text-xs text-brand">default</span>
                    ) : null}
                  </button>
                  <RowActions
                    resource="warehouses"
                    entityLabel={w.name}
                    viewTitle={w.name}
                    viewContent={
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-muted">Code</dt>
                          <dd className="font-medium">{w.code}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Name</dt>
                          <dd>{w.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Address</dt>
                          <dd>{w.address || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Default</dt>
                          <dd>{w.isDefault ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h3 className="mb-3 font-semibold">Stock at location</h3>
          {!selected ? (
            <p className="text-sm text-muted">Select a warehouse</p>
          ) : stock.isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (stock.data || []).length === 0 ? (
            <EmptyState message="No stock rows for this warehouse" />
          ) : (
            <ul className="space-y-2 text-sm">
              {(stock.data || []).map((row) => (
                <li key={row.id} className="flex justify-between gap-2">
                  <span>{row.item?.name}</span>
                  <span>
                    {Number(row.quantity)} {row.item?.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
