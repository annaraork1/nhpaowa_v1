import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { RowActions } from '../components/RowActions.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../components/ResponsiveList.jsx';
import { EmptyState, PageHeader, inr } from '../components/ui.jsx';

const blank = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
};

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({ queryKey: ['suppliers'], queryFn: api.suppliers.list });
  const save = useMutation({
    mutationFn: (body) =>
      editing ? api.suppliers.update(editing, body) : api.suppliers.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setOpen(false);
      setEditing(null);
      setForm(blank);
    },
  });
  const remove = useMutation({
    mutationFn: api.suppliers.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Vendors and spend totals"
        actions={
          <Can resource="suppliers" action="createEdit">
            <button
              className="btn-primary"
              type="button"
              onClick={() => setOpen(true)}
            >
              Add Supplier
            </button>
          </Can>
        }
      />

      {open ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          {Object.keys(blank).map((key) => (
            <label key={key}>
              <span className="label">{key}</span>
              <input
                className="input"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === 'name'}
              />
            </label>
          ))}
          <div className="flex gap-2 md:col-span-2">
            <button className="btn-primary" type="submit">
              Save
            </button>
            <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!list.data?.length ? (
        <EmptyState message="No suppliers yet." />
      ) : (
        <div className="panel p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={list.data.map((s) => {
              const actions = (
                <RowActions
                  resource="suppliers"
                  entityLabel={s.name}
                  onEdit={() => {
                    setEditing(s.id);
                    setForm({
                      name: s.name,
                      contactPerson: s.contactPerson || '',
                      phone: s.phone || '',
                      email: s.email || '',
                      address: s.address || '',
                      gstNumber: s.gstNumber || '',
                    });
                    setOpen(true);
                  }}
                  onDelete={() => remove.mutate(s.id)}
                  deletePending={remove.isPending}
                  viewContent={
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-muted">Name</dt>
                        <dd className="font-medium">{s.name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Contact</dt>
                        <dd>
                          {s.contactPerson || '—'}
                          {s.phone ? ` · ${s.phone}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Email</dt>
                        <dd>{s.email || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Spend</dt>
                        <dd>
                          {s.orderCount} orders · {inr(s.totalValue)}
                        </dd>
                      </div>
                    </dl>
                  }
                />
              );
              return (
                <EntityCard
                  key={s.id}
                  title={s.name}
                  subtitle={
                    [s.contactPerson, s.phone].filter(Boolean).join(' · ') ||
                    undefined
                  }
                  fields={[
                    { label: 'Orders', value: s.orderCount },
                    { label: 'Total value', value: inr(s.totalValue) },
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
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3">Total value</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.map((s) => (
                      <tr key={s.id} className="border-b border-line">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3">
                          {s.contactPerson}
                          <div className="text-xs text-muted">{s.phone}</div>
                        </td>
                        <td className="px-4 py-3">{s.orderCount}</td>
                        <td className="px-4 py-3">{inr(s.totalValue)}</td>
                        <td className="px-4 py-3 text-right">
                          <RowActions
                            resource="suppliers"
                            entityLabel={s.name}
                            onEdit={() => {
                              setEditing(s.id);
                              setForm({
                                name: s.name,
                                contactPerson: s.contactPerson || '',
                                phone: s.phone || '',
                                email: s.email || '',
                                address: s.address || '',
                                gstNumber: s.gstNumber || '',
                              });
                              setOpen(true);
                            }}
                            onDelete={() => remove.mutate(s.id)}
                            deletePending={remove.isPending}
                            viewContent={
                              <dl className="space-y-2">
                                <div>
                                  <dt className="text-xs text-muted">Name</dt>
                                  <dd className="font-medium">{s.name}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Contact</dt>
                                  <dd>
                                    {s.contactPerson || '—'}
                                    {s.phone ? ` · ${s.phone}` : ''}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Email</dt>
                                  <dd>{s.email || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Spend</dt>
                                  <dd>
                                    {s.orderCount} orders · {inr(s.totalValue)}
                                  </dd>
                                </div>
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
        </div>
      )}
    </div>
  );
}
