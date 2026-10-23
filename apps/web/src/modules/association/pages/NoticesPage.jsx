import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../inventory/api/client.js';
import { Can } from '../../inventory/auth/Can.jsx';
import { can } from '../../inventory/auth/permissions.js';
import { IconButton } from '../../inventory/components/IconButton.jsx';
import { RowActions } from '../../inventory/components/RowActions.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../../inventory/components/ResponsiveList.jsx';
import {
  EmptyState,
  PageHeader,
  QueryStatus,
  pendingLabel,
} from '../../inventory/components/ui.jsx';

const CATEGORIES = ['Security', 'Compliance', 'General', 'Maintenance', 'Other'];

const blank = { title: '', body: '', category: 'General' };

export default function NoticesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);

  const allowed = can('notices', 'view');
  const canEdit = can('notices', 'createEdit');

  const list = useQuery({
    queryKey: ['notices', statusFilter, q],
    queryFn: () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (q.trim()) params.q = q.trim();
      return api.association.notices.list(params);
    },
    enabled: allowed,
  });

  const save = useMutation({
    mutationFn: (body) =>
      editingId
        ? api.association.notices.update(editingId, body)
        : api.association.notices.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      setOpen(false);
      setEditingId(null);
      setForm(blank);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const act = useMutation({
    mutationFn: ({ id, action }) => api.association.notices[action](id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      setSelected(null);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view notices." />;
  }

  function startEdit(n) {
    setEditingId(n.id);
    setForm({
      title: n.title,
      body: n.body,
      category: n.category || 'General',
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Resident notices"
        subtitle="Official circulars published as PDF for residents"
        actions={
          <Can resource="notices" action="createEdit">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditingId(null);
                setForm(blank);
                setOpen(true);
              }}
            >
              New notice
            </button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {canEdit ? (
          <select
            className="input max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : null}
        <input
          className="input max-w-sm"
          placeholder="Search title or body"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      {open && canEdit ? (
        <form
          className="panel mb-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              title: form.title,
              body: form.body,
              category: form.category || null,
            });
          }}
        >
          <label>
            <span className="label">Title</span>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label>
            <span className="label">Category</span>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Body</span>
            <textarea
              className="input min-h-[160px]"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {pendingLabel(
                save.isPending,
                editingId ? 'Save changes' : 'Save draft',
              )}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="panel p-0">
        {!list.data?.length ? (
          <div className="p-6">
            <QueryStatus query={list} empty="No notices yet." />
          </div>
        ) : (
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={list.data.map((n) => {
              const noticeActions = (
                <RowActions
                  resource="notices"
                  entityLabel={n.title}
                  viewWide
                  onView={() => setSelected(n)}
                  onEdit={
                    canEdit && ['DRAFT', 'UNPUBLISHED'].includes(n.status)
                      ? () => startEdit(n)
                      : undefined
                  }
                  onDeactivate={
                    canEdit && n.status !== 'ARCHIVED'
                      ? () => act.mutate({ id: n.id, action: 'archive' })
                      : undefined
                  }
                  deactivatePending={act.isPending}
                  deactivateLabel="Archive"
                  extras={
                    <>
                      {n.pdfFileName ? (
                        <IconButton
                          label="Download PDF"
                          onClick={() =>
                            api.association.notices.downloadPdf(
                              n.id,
                              n.pdfFileName || 'notice.pdf'
                            )
                          }
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </IconButton>
                      ) : null}
                      {canEdit && ['DRAFT', 'UNPUBLISHED'].includes(n.status) ? (
                        <IconButton
                          label="Publish"
                          tone="brand"
                          onClick={() =>
                            act.mutate({ id: n.id, action: 'publish' })
                          }
                        >
                          <CloudArrowUpIcon className="h-5 w-5" />
                        </IconButton>
                      ) : null}
                      {canEdit && n.status === 'PUBLISHED' ? (
                        <IconButton
                          label="Unpublish"
                          onClick={() =>
                            act.mutate({ id: n.id, action: 'unpublish' })
                          }
                        >
                          <CloudArrowDownIcon className="h-5 w-5" />
                        </IconButton>
                      ) : null}
                    </>
                  }
                />
              );
              return (
                <EntityCard
                  key={n.id}
                  title={
                    <button
                      type="button"
                      className="text-left font-medium text-ink hover:underline"
                      onClick={() => setSelected(n)}
                    >
                      {n.title}
                    </button>
                  }
                  badge={n.status}
                  fields={[
                    { label: 'Category', value: n.category || '—' },
                    {
                      label: 'Published',
                      value: n.publishedAt
                        ? new Date(n.publishedAt).toLocaleDateString('en-IN')
                        : '—',
                    },
                  ]}
                  actions={noticeActions}
                />
              );
            })}
            desktop={
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Published</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(list.data || []).map((n) => (
                      <tr key={n.id} className="border-b border-border/60">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-left font-medium hover:underline"
                            onClick={() => setSelected(n)}
                          >
                            {n.title}
                          </button>
                        </td>
                        <td className="px-3 py-2">{n.category || '—'}</td>
                        <td className="px-3 py-2">{n.status}</td>
                        <td className="px-3 py-2">
                          {n.publishedAt
                            ? new Date(n.publishedAt).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <RowActions
                            resource="notices"
                            entityLabel={n.title}
                            onView={() => setSelected(n)}
                            onEdit={
                              canEdit &&
                              ['DRAFT', 'UNPUBLISHED'].includes(n.status)
                                ? () => startEdit(n)
                                : undefined
                            }
                            onDeactivate={
                              canEdit && n.status !== 'ARCHIVED'
                                ? () =>
                                    act.mutate({ id: n.id, action: 'archive' })
                                : undefined
                            }
                            deactivatePending={act.isPending}
                            deactivateLabel="Archive"
                            extras={
                              <>
                                {n.pdfFileName ? (
                                  <IconButton
                                    label="Download PDF"
                                    onClick={() =>
                                      api.association.notices.downloadPdf(
                                        n.id,
                                        n.pdfFileName || 'notice.pdf'
                                      )
                                    }
                                  >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                  </IconButton>
                                ) : null}
                                {canEdit &&
                                ['DRAFT', 'UNPUBLISHED'].includes(n.status) ? (
                                  <IconButton
                                    label="Publish"
                                    tone="brand"
                                    onClick={() =>
                                      act.mutate({
                                        id: n.id,
                                        action: 'publish',
                                      })
                                    }
                                  >
                                    <CloudArrowUpIcon className="h-5 w-5" />
                                  </IconButton>
                                ) : null}
                                {canEdit && n.status === 'PUBLISHED' ? (
                                  <IconButton
                                    label="Unpublish"
                                    onClick={() =>
                                      act.mutate({
                                        id: n.id,
                                        action: 'unpublish',
                                      })
                                    }
                                  >
                                    <CloudArrowDownIcon className="h-5 w-5" />
                                  </IconButton>
                                ) : null}
                              </>
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

      {selected ? (
        <div className="panel mt-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <p className="text-sm text-muted">
                {selected.category || 'General'} · {selected.status}
                {selected.publishedAt
                  ? ` · ${new Date(selected.publishedAt).toLocaleString('en-IN')}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {selected.body}
          </pre>
          {selected.publishedByName ? (
            <p className="mt-4 text-sm text-muted">
              Issuer: {selected.publishedByName}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
