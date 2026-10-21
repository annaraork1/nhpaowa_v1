import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { IconButton } from '../components/IconButton.jsx';
import { RowActions } from '../components/RowActions.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../components/ResponsiveList.jsx';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui.jsx';

const blank = {
  itemId: '',
  vendorId: '',
  description: '',
  startDate: '',
  endDate: '',
  reminderLeadDays: 15,
  status: 'ACTIVE',
};

export default function AmcPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [renewId, setRenewId] = useState(null);
  const [renewEnd, setRenewEnd] = useState('');

  const list = useQuery({ queryKey: ['amc'], queryFn: api.amc.list });
  const items = useQuery({ queryKey: ['items'], queryFn: api.items.list });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: api.suppliers.list });

  const save = useMutation({
    mutationFn: (body) =>
      editing ? api.amc.update(editing, body) : api.amc.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amc'] });
      setOpen(false);
      setEditing(null);
      setForm(blank);
    },
  });

  const renew = useMutation({
    mutationFn: ({ id, endDate }) => api.amc.renew(id, { endDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amc'] });
      setRenewId(null);
      setRenewEnd('');
    },
  });

  const expire = useMutation({
    mutationFn: api.amc.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['amc'] }),
  });

  return (
    <div>
      <PageHeader
        title="AMC Contracts"
        subtitle="Annual maintenance contracts with expiry reminders"
        actions={
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(blank);
              setOpen(true);
            }}
          >
            Register AMC
          </button>
        }
      />

      {open ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              ...form,
              itemId: form.itemId || null,
              reminderLeadDays: Number(form.reminderLeadDays),
            });
          }}
        >
          <label className="md:col-span-2">
            <span className="label">Description</span>
            <input
              className="input"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Vendor</span>
            <select
              className="input"
              required
              value={form.vendorId}
              onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
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
            <span className="label">Linked item (optional)</span>
            <select
              className="input"
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
            >
              <option value="">None</option>
              {(items.data || []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Start date</span>
            <input
              type="date"
              className="input"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </label>
          <label>
            <span className="label">End date</span>
            <input
              type="date"
              className="input"
              required
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Reminder lead days</span>
            <input
              type="number"
              className="input"
              min="1"
              value={form.reminderLeadDays}
              onChange={(e) =>
                setForm({ ...form, reminderLeadDays: e.target.value })
              }
            />
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={save.isPending}>
              Save
            </button>
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            {save.isError ? (
              <p className="text-sm text-err">{save.error.message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      {!list.data?.length ? (
        <EmptyState message="No AMC contracts yet." />
      ) : (
        <div className="panel p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={list.data.map((a) => {
              const actions = (
                <div className="inline-flex items-center justify-end gap-0.5">
                  {a.status === 'ACTIVE' ? (
                    <Can resource="amc" action="createEdit">
                      <IconButton
                        label="Renew"
                        tone="brand"
                        onClick={() => {
                          setRenewId(a.id);
                          setRenewEnd('');
                        }}
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </IconButton>
                    </Can>
                  ) : null}
                  <RowActions
                    resource="amc"
                    entityLabel={a.description}
                    onEdit={
                      a.status === 'ACTIVE'
                        ? () => {
                            setEditing(a.id);
                            setForm({
                              itemId: a.itemId || '',
                              vendorId: a.vendorId,
                              description: a.description,
                              startDate: String(a.startDate).slice(0, 10),
                              endDate: String(a.endDate).slice(0, 10),
                              reminderLeadDays: a.reminderLeadDays,
                              status: a.status,
                            });
                            setOpen(true);
                          }
                        : undefined
                    }
                    onDelete={
                      a.status === 'ACTIVE'
                        ? () => expire.mutate(a.id)
                        : undefined
                    }
                    deletePending={expire.isPending}
                    viewContent={
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-muted">Description</dt>
                          <dd className="font-medium">{a.description}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Vendor</dt>
                          <dd>{a.vendor?.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Item</dt>
                          <dd>{a.item?.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Ends</dt>
                          <dd>
                            {new Date(a.endDate).toLocaleDateString('en-IN')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Status</dt>
                          <dd>
                            <StatusBadge status={a.status} />
                          </dd>
                        </div>
                      </dl>
                    }
                  />
                </div>
              );
              return (
                <EntityCard
                  key={a.id}
                  title={a.description}
                  subtitle={a.vendor?.name}
                  badge={<StatusBadge status={a.status} />}
                  fields={[
                    { label: 'Item', value: a.item?.name || '—' },
                    {
                      label: 'End',
                      value: new Date(a.endDate).toLocaleDateString('en-IN'),
                    },
                    { label: 'Lead', value: `${a.reminderLeadDays}d` },
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
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">End</th>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.map((a) => (
                      <tr key={a.id} className="border-b border-line">
                        <td className="px-4 py-3 font-medium">
                          {a.description}
                        </td>
                        <td className="px-4 py-3">{a.vendor?.name}</td>
                        <td className="px-4 py-3">{a.item?.name || '—'}</td>
                        <td className="px-4 py-3">
                          {new Date(a.endDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">{a.reminderLeadDays}d</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-0.5">
                            {a.status === 'ACTIVE' ? (
                              <Can resource="amc" action="createEdit">
                                <IconButton
                                  label="Renew"
                                  tone="brand"
                                  onClick={() => {
                                    setRenewId(a.id);
                                    setRenewEnd('');
                                  }}
                                >
                                  <ArrowPathIcon className="h-5 w-5" />
                                </IconButton>
                              </Can>
                            ) : null}
                            <RowActions
                              resource="amc"
                              entityLabel={a.description}
                              onEdit={
                                a.status === 'ACTIVE'
                                  ? () => {
                                      setEditing(a.id);
                                      setForm({
                                        itemId: a.itemId || '',
                                        vendorId: a.vendorId,
                                        description: a.description,
                                        startDate: String(a.startDate).slice(
                                          0,
                                          10,
                                        ),
                                        endDate: String(a.endDate).slice(0, 10),
                                        reminderLeadDays: a.reminderLeadDays,
                                        status: a.status,
                                      });
                                      setOpen(true);
                                    }
                                  : undefined
                              }
                              onDelete={
                                a.status === 'ACTIVE'
                                  ? () => expire.mutate(a.id)
                                  : undefined
                              }
                              deletePending={expire.isPending}
                              viewContent={
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-muted">
                                      Description
                                    </dt>
                                    <dd className="font-medium">
                                      {a.description}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Vendor</dt>
                                    <dd>{a.vendor?.name}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Item</dt>
                                    <dd>{a.item?.name || '—'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Ends</dt>
                                    <dd>
                                      {new Date(a.endDate).toLocaleDateString(
                                        'en-IN',
                                      )}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Status</dt>
                                    <dd>
                                      <StatusBadge status={a.status} />
                                    </dd>
                                  </div>
                                </dl>
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />
        </div>
      )}

      {renewId ? (
        <form
          className="panel mt-4 max-w-md space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            renew.mutate({ id: renewId, endDate: renewEnd });
          }}
        >
          <h3 className="font-semibold">Renew AMC</h3>
          <label>
            <span className="label">New end date</span>
            <input
              type="date"
              className="input"
              required
              value={renewEnd}
              onChange={(e) => setRenewEnd(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button className="btn-primary" type="submit">
              Confirm renew
            </button>
            <button className="btn-ghost" type="button" onClick={() => setRenewId(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
