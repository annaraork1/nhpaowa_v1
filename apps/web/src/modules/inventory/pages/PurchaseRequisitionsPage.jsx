import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { api } from '../api/client.js';
import { IconButton } from '../components/IconButton.jsx';
import { RowActions } from '../components/RowActions.jsx';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui.jsx';

export default function PurchaseRequisitionsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    itemId: '',
    quantity: 1,
    preferredSupplierId: '',
    notes: '',
  });

  const prs = useQuery({
    queryKey: ['prs'],
    queryFn: api.purchaseRequisitions.list,
  });
  const items = useQuery({ queryKey: ['items'], queryFn: api.items.list });
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.suppliers.list,
  });

  const create = useMutation({
    mutationFn: api.purchaseRequisitions.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prs'] });
      setForm({ itemId: '', quantity: 1, preferredSupplierId: '', notes: '' });
    },
  });

  const convert = useMutation({
    mutationFn: ({ id, supplierId }) =>
      api.purchaseRequisitions.convert(id, { supplierId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prs'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const cancel = useMutation({
    mutationFn: api.purchaseRequisitions.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prs'] }),
  });

  return (
    <div>
      <PageHeader
        title="Purchase requisitions"
        subtitle="Manual PRs and auto-PRs from low stock (when enabled in Settings)"
      />

      <form
        className="panel mb-6 grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            itemId: form.itemId,
            quantity: Number(form.quantity),
            preferredSupplierId: form.preferredSupplierId || null,
            notes: form.notes || null,
          });
        }}
      >
        <label>
          <span className="label">Item</span>
          <select
            className="input"
            value={form.itemId}
            onChange={(e) => setForm({ ...form, itemId: e.target.value })}
            required
          >
            <option value="">Select…</option>
            {(items.data || []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Quantity</span>
          <input
            className="input"
            type="number"
            min="0.001"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
        </label>
        <label>
          <span className="label">Preferred supplier</span>
          <select
            className="input"
            value={form.preferredSupplierId}
            onChange={(e) =>
              setForm({ ...form, preferredSupplierId: e.target.value })
            }
          >
            <option value="">Optional…</option>
            {(suppliers.data || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Notes</span>
          <input
            className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <div className="md:col-span-2">
          <button className="btn-primary" type="submit" disabled={create.isPending}>
            Create PR
          </button>
          {create.isError ? (
            <p className="mt-2 text-sm text-err">{create.error.message}</p>
          ) : null}
        </div>
      </form>

      {(prs.data || []).length === 0 ? (
        <EmptyState message="No purchase requisitions yet" />
      ) : (
        <ul className="space-y-3">
          {(prs.data || []).map((pr) => (
            <li key={pr.id} className="panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {pr.prNumber}{' '}
                    <span className="text-xs font-normal text-muted">
                      · {pr.source}
                    </span>
                  </p>
                  <p className="text-sm">
                    {pr.item?.name} · {Number(pr.quantity)} {pr.item?.unit}
                  </p>
                  {pr.preferredSupplier ? (
                    <p className="text-xs text-muted">
                      Preferred: {pr.preferredSupplier.name}
                    </p>
                  ) : null}
                  {pr.notes ? (
                    <p className="mt-1 text-xs text-muted">{pr.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={pr.status} />
                  <RowActions
                    resource="purchaseRequisitions"
                    entityLabel={pr.prNumber}
                    viewTitle={pr.prNumber}
                    viewContent={
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-muted">Item</dt>
                          <dd className="font-medium">{pr.item?.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Quantity</dt>
                          <dd>
                            {Number(pr.quantity)} {pr.item?.unit}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Source</dt>
                          <dd>{pr.source}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Supplier</dt>
                          <dd>{pr.preferredSupplier?.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Notes</dt>
                          <dd>{pr.notes || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Status</dt>
                          <dd>
                            <StatusBadge status={pr.status} />
                          </dd>
                        </div>
                      </dl>
                    }
                  />
                  {pr.status === 'DRAFT' ? (
                    <>
                      <select
                        className="input !w-auto !py-1 text-sm"
                        id={`sup-${pr.id}`}
                        defaultValue={pr.preferredSupplierId || ''}
                      >
                        <option value="">Supplier…</option>
                        {(suppliers.data || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <IconButton
                        label="Convert to PO"
                        tone="brand"
                        onClick={() => {
                          const el = document.getElementById(`sup-${pr.id}`);
                          const supplierId = el?.value;
                          if (!supplierId) {
                            alert('Select a supplier');
                            return;
                          }
                          convert.mutate({ id: pr.id, supplierId });
                        }}
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </IconButton>
                      <IconButton
                        label="Cancel"
                        tone="danger"
                        onClick={() => cancel.mutate(pr.id)}
                      >
                        <NoSymbolIcon className="h-5 w-5" />
                      </IconButton>
                    </>
                  ) : null}
                </div>
              </div>
              {convert.isError ? (
                <p className="mt-2 text-sm text-err">{convert.error.message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
