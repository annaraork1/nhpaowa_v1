import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArchiveBoxArrowDownIcon,
  CheckBadgeIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api, getDevRole } from '../api/client.js';
import { IconButton } from '../components/IconButton.jsx';
import { RowActions } from '../components/RowActions.jsx';
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

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const role = getDevRole();
  const canApprove = role === 'SECRETARY' || role === 'TREASURER';
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    supplierId: '',
    expectedDate: '',
    isEmergency: false,
    emergencyReason: '',
    lines: [{ itemId: '', quantity: 1, unitPrice: 0 }],
  });

  const pos = useQuery({ queryKey: ['pos'], queryFn: api.purchaseOrders.list });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: api.suppliers.list });
  const items = useQuery({ queryKey: ['items'], queryFn: api.items.list });
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings.get });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pos'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['items'] });
    qc.invalidateQueries({ queryKey: ['alerts'] });
    qc.invalidateQueries({ queryKey: ['stock'] });
  };

  const create = useMutation({
    mutationFn: api.purchaseOrders.create,
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, type, body }) => {
      if (type === 'submit') return api.purchaseOrders.submit(id);
      if (type === 'approve') return api.purchaseOrders.approve(id);
      if (type === 'postApprove') return api.purchaseOrders.postApprove(id);
      if (type === 'order') return api.purchaseOrders.markOrdered(id);
      if (type === 'cancel') return api.purchaseOrders.cancel(id);
      if (type === 'close') return api.purchaseOrders.close(id);
      if (type === 'receive') return api.purchaseOrders.receive(id, body);
    },
    onSuccess: (data) => {
      invalidate();
      if (data?.id) setSelected(data);
    },
  });

  const detail = useMemo(
    () => pos.data?.find((p) => p.id === selected?.id) || selected,
    [pos.data, selected]
  );

  const threshold = Number(settings.data?.poApprovalThreshold || 10000);

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle={`Approval required above ${inr(threshold)} (Secretary / Treasurer)`}
        actions={
          <button className="btn-primary" type="button" onClick={() => setOpen(true)}>
            Create PO
          </button>
        }
      />

      {open ? (
        <form
          className="panel mb-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              supplierId: form.supplierId,
              expectedDate: form.expectedDate || null,
              isEmergency: form.isEmergency,
              emergencyReason: form.isEmergency ? form.emergencyReason : null,
              items: form.lines.map((l) => ({
                itemId: l.itemId,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unitPrice),
              })),
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="label">Supplier</span>
              <select
                className="input"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {(suppliers.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Expected date</span>
              <input
                type="date"
                className="input"
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={form.isEmergency}
                onChange={(e) =>
                  setForm({ ...form, isEmergency: e.target.checked })
                }
              />
              <span className="text-sm font-medium">
                Emergency PO (bypass pre-approval; requires post-approval)
              </span>
            </label>
            {form.isEmergency ? (
              <label className="md:col-span-2">
                <span className="label">Emergency reason</span>
                <input
                  className="input"
                  required
                  value={form.emergencyReason}
                  onChange={(e) =>
                    setForm({ ...form, emergencyReason: e.target.value })
                  }
                />
              </label>
            ) : null}
          </div>

          {form.lines.map((line, idx) => (
            <div key={idx} className="grid gap-3 md:grid-cols-4">
              <label className="md:col-span-2">
                <span className="label">Item</span>
                <select
                  className="input"
                  value={line.itemId}
                  onChange={(e) => {
                    const item = items.data?.find((i) => i.id === e.target.value);
                    const lines = [...form.lines];
                    lines[idx] = {
                      ...line,
                      itemId: e.target.value,
                      unitPrice: item ? Number(item.unitPrice) : 0,
                    };
                    setForm({ ...form, lines });
                  }}
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
                <span className="label">Qty</span>
                <input
                  className="input"
                  type="number"
                  min="0.001"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => {
                    const lines = [...form.lines];
                    lines[idx] = { ...line, quantity: e.target.value };
                    setForm({ ...form, lines });
                  }}
                  required
                />
              </label>
              <label>
                <span className="label">Unit price</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  value={line.unitPrice}
                  onChange={(e) => {
                    const lines = [...form.lines];
                    lines[idx] = { ...line, unitPrice: e.target.value };
                    setForm({ ...form, lines });
                  }}
                  required
                />
              </label>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setForm({
                  ...form,
                  lines: [...form.lines, { itemId: '', quantity: 1, unitPrice: 0 }],
                })
              }
            >
              Add line
            </button>
            <button className="btn-primary" type="submit" disabled={create.isPending}>
              {pendingLabel(create.isPending, 'Create draft', 'Creating…')}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={create.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            {create.isError ? (
              <p className="text-sm text-err">{create.error.message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-0">
          {!pos.data?.length ? (
            <div className="p-6">
              <QueryStatus query={pos} empty="No purchase orders yet." />
            </div>
          ) : (
            <ResponsiveList
              className="p-3 md:p-0"
              mobile={pos.data.map((po) => {
                const actions = (
                  <RowActions
                    resource="purchaseOrders"
                    entityLabel={po.poNumber}
                    onView={() => setSelected(po)}
                    viewTitle={po.poNumber}
                    viewContent={
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-muted">Supplier</dt>
                          <dd className="font-medium">{po.supplier?.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Total</dt>
                          <dd>{inr(po.totalAmount)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Status</dt>
                          <dd>
                            <StatusBadge status={po.status} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Lines</dt>
                          <dd>
                            <ul className="mt-1 space-y-1">
                              {(po.items || []).map((line) => (
                                <li key={line.id}>
                                  {line.item?.name} · {Number(line.quantity)} ×{' '}
                                  {inr(line.unitPrice)}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                        <p className="pt-2 text-xs text-muted">
                          Tip: close this dialog and use the detail panel for
                          workflow actions.
                        </p>
                      </dl>
                    }
                  />
                );
                return (
                  <EntityCard
                    key={po.id}
                    title={po.poNumber}
                    subtitle={po.supplier?.name}
                    badge={<StatusBadge status={po.status} />}
                    fields={[{ label: 'Total', value: inr(po.totalAmount) }]}
                    actions={actions}
                  />
                );
              })}
              desktop={
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-ink">
                    <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
                      <tr>
                        <th className="px-4 py-3">PO</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {pos.data.map((po) => (
                        <tr
                          key={po.id}
                          className="border-b border-line hover:bg-surface"
                        >
                          <td className="px-4 py-3 font-medium">
                            {po.poNumber}
                          </td>
                          <td className="px-4 py-3">{po.supplier?.name}</td>
                          <td className="px-4 py-3">{inr(po.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={po.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <RowActions
                              resource="purchaseOrders"
                              entityLabel={po.poNumber}
                              onView={() => setSelected(po)}
                              viewTitle={po.poNumber}
                              viewContent={
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-muted">
                                      Supplier
                                    </dt>
                                    <dd className="font-medium">
                                      {po.supplier?.name}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Total</dt>
                                    <dd>{inr(po.totalAmount)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">
                                      Status
                                    </dt>
                                    <dd>
                                      <StatusBadge status={po.status} />
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Lines</dt>
                                    <dd>
                                      <ul className="mt-1 space-y-1">
                                        {(po.items || []).map((line) => (
                                          <li key={line.id}>
                                            {line.item?.name} ·{' '}
                                            {Number(line.quantity)} ×{' '}
                                            {inr(line.unitPrice)}
                                          </li>
                                        ))}
                                      </ul>
                                    </dd>
                                  </div>
                                  <p className="pt-2 text-xs text-muted">
                                    Tip: close this dialog and use the detail
                                    panel for workflow actions.
                                  </p>
                                </dl>
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          )}
        </div>

        <div className="panel">
          {!detail ? (
            <p className="text-muted">Select a PO to view actions.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-2xl text-ink">{detail.poNumber}</h3>
                <p className="text-sm text-muted">{detail.supplier?.name}</p>
                <div className="mt-2">
                  <StatusBadge status={detail.status} />
                </div>
                <p className="mt-2 font-semibold">{inr(detail.totalAmount)}</p>
                {detail.isEmergency ? (
                  <p className="mt-1 text-sm text-danger">
                    Emergency PO{detail.pendingPostApproval ? ' — post-approval pending' : ' — post-approved'}
                    {detail.emergencyReason ? `: ${detail.emergencyReason}` : ''}
                  </p>
                ) : Number(detail.totalAmount) > threshold ? (
                  <p className="mt-1 text-sm text-warn">
                    Above approval threshold — Secretary/Treasurer must approve after submit.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ok">
                    At/under threshold — submit auto-approves.
                  </p>
                )}
              </div>

              <ul className="space-y-2 text-sm">
                {(detail.items || []).map((line) => (
                  <li key={line.id} className="flex justify-between gap-2 border-b border-line pb-2">
                    <span>
                      {line.item?.name} × {Number(line.quantity)}
                      <span className="block text-xs text-muted">
                        received {Number(line.quantityReceived)}
                      </span>
                    </span>
                    <span>{inr(line.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="inline-flex flex-wrap items-center gap-0.5">
                {detail.status === 'DRAFT' ? (
                  <IconButton
                    label="Submit"
                    tone="brand"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: detail.id, type: 'submit' })
                    }
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {detail.status === 'PENDING_APPROVAL' && canApprove ? (
                  <IconButton
                    label="Approve"
                    tone="brand"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: detail.id, type: 'approve' })
                    }
                  >
                    <CheckIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {detail.pendingPostApproval && canApprove ? (
                  <IconButton
                    label="Post-approve emergency"
                    tone="brand"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: detail.id, type: 'postApprove' })
                    }
                  >
                    <ExclamationTriangleIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {detail.status === 'APPROVED' ? (
                  <IconButton
                    label="Mark ordered"
                    tone="brand"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: detail.id, type: 'order' })
                    }
                  >
                    <ShoppingCartIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {['ORDERED', 'PARTIALLY_RECEIVED'].includes(detail.status) ? (
                  <IconButton
                    label="Receive remaining"
                    tone="brand"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({
                        id: detail.id,
                        type: 'receive',
                        body: {
                          lines: (detail.items || [])
                            .map((line) => ({
                              purchaseOrderItemId: line.id,
                              quantity: Math.max(
                                0,
                                Number(line.quantity) -
                                  Number(line.quantityReceived)
                              ),
                            }))
                            .filter((l) => l.quantity > 0),
                        },
                      })
                    }
                  >
                    <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {detail.status === 'RECEIVED' ? (
                  <IconButton
                    label="Close"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: detail.id, type: 'close' })
                    }
                  >
                    <CheckBadgeIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {!['RECEIVED', 'CLOSED', 'CANCELLED'].includes(detail.status) ? (
                  <IconButton
                    label="Cancel"
                    tone="danger"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: detail.id, type: 'cancel' })
                    }
                  >
                    <NoSymbolIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                <IconButton
                  label="Dismiss"
                  disabled={action.isPending}
                  onClick={() => setSelected(null)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </IconButton>
              </div>
              {action.isPending ? (
                <p className="text-sm text-muted">Processing…</p>
              ) : null}
              {action.isError ? (
                <p className="text-sm text-err">{action.error.message}</p>
              ) : null}
              {action.isError ? (
                <p className="text-sm text-err">{action.error.message}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
