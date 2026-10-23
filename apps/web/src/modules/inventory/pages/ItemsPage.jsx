import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mediaUrl } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { RowActions } from '../components/RowActions.jsx';
import { ItemViewDetails } from '../components/ItemViewDetails.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../components/ResponsiveList.jsx';
import {
  PageHeader,
  QueryStatus,
  StatusBadge,
  inr,
  pendingLabel,
} from '../components/ui.jsx';

const blank = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  unit: 'pcs',
  currentStock: 0,
  minStockLevel: 0,
  unitPrice: 0,
  photoUrl: '',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
];

export default function ItemsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const listParams = useMemo(
    () => ({
      q: debouncedQ,
      categoryId,
      status,
      unit,
    }),
    [debouncedQ, categoryId, status, unit]
  );

  const filtersActive = Boolean(
    debouncedQ || categoryId || status || unit || q.trim()
  );

  const items = useQuery({
    queryKey: ['items', listParams],
    queryFn: () => api.items.list(listParams),
  });
  const catalogMeta = useQuery({
    queryKey: ['items', 'filter-meta'],
    queryFn: () => api.items.list({}),
    staleTime: 60_000,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const unitOptions = useMemo(() => {
    const set = new Set();
    (catalogMeta.data || []).forEach((i) => {
      if (i.unit) set.add(i.unit);
    });
    if (unit) set.add(unit);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalogMeta.data, unit]);

  const save = useMutation({
    mutationFn: (body) =>
      editing ? api.items.update(editing, body) : api.items.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
      setEditing(null);
      setForm(blank);
    },
  });

  const remove = useMutation({
    mutationFn: api.items.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  function startEdit(item) {
    setEditing(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || '',
      categoryId: item.categoryId,
      unit: item.unit,
      currentStock: Number(item.currentStock),
      minStockLevel: Number(item.minStockLevel),
      unitPrice: Number(item.unitPrice),
      photoUrl: item.photoUrl || '',
    });
    setOpen(true);
  }

  async function onPhotoSelected(file) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadPhoto(file);
      setForm((f) => ({ ...f, photoUrl: res.url }));
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }

  function clearFilters() {
    setQ('');
    setDebouncedQ('');
    setCategoryId('');
    setStatus('');
    setUnit('');
  }

  const rows = items.data || [];

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Master inventory catalog — search and filter the register"
        actions={
          <Can resource="items" action="createEdit">
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setOpen(true);
              }}
            >
              Add Item
            </button>
          </Can>
        }
      />

      <div className="panel mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="label">Search</span>
          <input
            className="input"
            placeholder="Name, SKU, barcode, category, unit…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q !== debouncedQ ? (
            <p className="mt-1 text-xs text-muted">Searching…</p>
          ) : null}
        </label>
        <label>
          <span className="label">Category</span>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {(categories.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Unit</span>
          <select
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="">All units</option>
            {unitOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
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
            {items.isFetching ? 'Updating…' : `${rows.length} item(s)`}
          </p>
        </div>
      </div>

      {open ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              ...form,
              photoUrl: form.photoUrl || null,
              barcode: form.barcode || null,
            };
            if (editing) delete payload.currentStock;
            save.mutate(payload);
          }}
        >
          {[
            ['name', 'Name'],
            ['sku', 'SKU'],
            ['barcode', 'Barcode'],
            ['unit', 'Unit'],
            ['minStockLevel', 'Min stock'],
            ['unitPrice', 'Unit price'],
          ].map(([key, label]) => (
            <label key={key}>
              <span className="label">{label}</span>
              <input
                className="input"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key !== 'barcode'}
              />
            </label>
          ))}
          {!editing ? (
            <label>
              <span className="label">Opening stock</span>
              <input
                className="input"
                type="number"
                value={form.currentStock}
                onChange={(e) =>
                  setForm({ ...form, currentStock: e.target.value })
                }
              />
            </label>
          ) : null}
          <label>
            <span className="label">Category</span>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {(categories.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="label">Photo</span>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => onPhotoSelected(e.target.files?.[0])}
            />
            {uploading ? (
              <p className="mt-1 text-xs text-muted">Uploading…</p>
            ) : null}
            {form.photoUrl ? (
              <img
                src={mediaUrl(form.photoUrl)}
                alt="Preview"
                className="mt-2 h-20 w-20 rounded-lg object-cover border border-line"
              />
            ) : null}
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={save.isPending}>
              {pendingLabel(
                save.isPending,
                editing ? 'Save' : 'Create',
                editing ? 'Saving…' : 'Creating…',
              )}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={save.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            {save.isError ? (
              <p className="text-sm text-err">{save.error.message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      <QueryStatus
        query={items}
        empty={
          filtersActive ? 'No items match these filters.' : 'No items yet.'
        }
        isEmpty={() => !rows.length}
      />
      {rows.length ? (
        <div className="panel p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={rows.map((i) => {
              const actions = (
                <RowActions
                  resource="items"
                  entityLabel={i.name}
                  onEdit={() => startEdit(i)}
                  onDelete={() => remove.mutate(i.id)}
                  deletePending={remove.isPending}
                  viewWide
                  viewContent={<ItemViewDetails item={i} />}
                />
              );
              return (
                <EntityCard
                  key={i.id}
                  title={
                    <div className="flex items-center gap-3">
                      {i.photoUrl ? (
                        <img
                          src={mediaUrl(i.photoUrl)}
                          alt=""
                          className="h-9 w-9 rounded-lg border border-line object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted">
                          {i.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-ink">{i.name}</p>
                        <p className="text-xs text-muted">{i.sku}</p>
                      </div>
                    </div>
                  }
                  badge={<StatusBadge status={i.status} />}
                  fields={[
                    { label: 'Category', value: i.category?.name || '—' },
                    {
                      label: 'Stock',
                      value: `${Number(i.currentStock)} ${i.unit}`,
                    },
                    { label: 'Min', value: Number(i.minStockLevel) },
                    { label: 'Price', value: inr(i.unitPrice) },
                  ]}
                  actions={actions}
                />
              );
            })}
            desktop={
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-ink">
                  <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Min</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => (
                      <tr key={i.id} className="border-b border-line">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-3">
                            {i.photoUrl ? (
                              <img
                                src={mediaUrl(i.photoUrl)}
                                alt=""
                                className="h-9 w-9 rounded-lg border border-line object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted">
                                {i.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              {i.name}
                              <div className="text-xs text-muted">{i.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{i.category?.name}</td>
                        <td className="px-4 py-3">
                          {Number(i.currentStock)} {i.unit}
                        </td>
                        <td className="px-4 py-3">{Number(i.minStockLevel)}</td>
                        <td className="px-4 py-3">{inr(i.unitPrice)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RowActions
                            resource="items"
                            entityLabel={i.name}
                            onEdit={() => startEdit(i)}
                            onDelete={() => remove.mutate(i.id)}
                            deletePending={remove.isPending}
                            viewWide
                            viewContent={<ItemViewDetails item={i} />}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
