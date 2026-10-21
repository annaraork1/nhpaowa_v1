import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { can } from '../auth/permissions.js';
import { RowActions } from '../components/RowActions.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../components/ResponsiveList.jsx';
import { EmptyState, PageHeader } from '../components/ui.jsx';
import {
  ROLES,
  ROLE_LABELS,
  CUSTOMIZABLE_ROLES,
  MENU_FEATURE_RESOURCES,
} from '@nhpaowa/shared-auth/permissions';
import { Modal } from '../components/Modal.jsx';

const blank = {
  name: '',
  email: '',
  password: '',
  role: ROLES.SECURITY_STAFF,
  supplierId: '',
  active: true,
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [featuresRole, setFeaturesRole] = useState(CUSTOMIZABLE_ROLES[0]);
  const [featureSet, setFeatureSet] = useState([]);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const allowed = can('users', 'view');

  const users = useQuery({
    queryKey: ['auth-users'],
    queryFn: api.auth.users.list,
    enabled: allowed,
  });
  const roles = useQuery({
    queryKey: ['auth-roles'],
    queryFn: api.auth.roles,
    enabled: allowed,
  });
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.suppliers.list,
    enabled: allowed,
  });

  const save = useMutation({
    mutationFn: (body) =>
      editing
        ? api.auth.users.update(editing, body)
        : api.auth.users.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-users'] });
      setOpen(false);
      setEditing(null);
      setForm(blank);
    },
  });

  const roleFeatures = useQuery({
    queryKey: ['role-menu-features', featuresRole],
    queryFn: () => api.auth.roleMenuFeatures(featuresRole),
    enabled: allowed && featuresOpen,
  });

  useEffect(() => {
    if (roleFeatures.data?.features) {
      setFeatureSet(roleFeatures.data.features);
    }
  }, [roleFeatures.data]);

  const saveFeatures = useMutation({
    mutationFn: () =>
      api.auth.saveRoleMenuFeatures({
        role: featuresRole,
        features: featureSet,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-menu-features', featuresRole] });
      setFeaturesOpen(false);
    },
  });

  function startCreate() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  }

  function startEdit(u) {
    setEditing(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      supplierId: u.supplierId || '',
      active: u.active,
    });
    setOpen(true);
  }

  function onSubmit(e) {
    e.preventDefault();
    const body = {
      name: form.name,
      email: form.email,
      role: form.role,
      active: form.active,
      supplierId:
        form.role === ROLES.VENDOR ? form.supplierId || null : null,
    };
    if (!editing) {
      body.password = form.password;
    } else if (form.password.trim()) {
      body.password = form.password;
    }
    save.mutate(body);
  }

  if (!allowed) {
    return (
      <EmptyState message="You do not have permission to manage users." />
    );
  }

  const roleOptions = roles.data?.roles || Object.values(ROLES);

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Add people, pick a role (including Security Head, Estate Manager, Security Staff), and choose which menu features each ops role can see."
        actions={
          <div className="flex flex-wrap gap-2">
            <Can resource="users" action="createEdit">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setFeaturesOpen(true)}
              >
                Role menu features
              </button>
              <button type="button" className="btn-primary" onClick={startCreate}>
                Add user
              </button>
            </Can>
          </div>
        }
      />

      {featuresOpen ? (
        <Modal
          title="Role menu features"
          onClose={() => setFeaturesOpen(false)}
          wide
          footer={
            <>
              <button
                type="button"
                className="btn-primary"
                disabled={saveFeatures.isPending}
                onClick={() => saveFeatures.mutate()}
              >
                {saveFeatures.isPending ? 'Saving…' : 'Save features'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setFeaturesOpen(false)}
              >
                Cancel
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-muted">
            Tick the left-menu screens this role may open. Home stays available.
            Users must sign in again to pick up changes.
          </p>
          <label className="mb-4 block">
            <span className="label">Role</span>
            <select
              className="input max-w-sm"
              value={featuresRole}
              onChange={(e) => setFeaturesRole(e.target.value)}
            >
              {CUSTOMIZABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] || r}
                </option>
              ))}
            </select>
          </label>
          {roleFeatures.isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {MENU_FEATURE_RESOURCES.map((m) => (
                <label
                  key={m.resource}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={featureSet.includes(m.resource)}
                    disabled={m.resource === 'home'}
                    onChange={(e) => {
                      setFeatureSet((prev) => {
                        if (e.target.checked) {
                          return [...new Set([...prev, m.resource])];
                        }
                        return prev.filter((x) => x !== m.resource);
                      });
                    }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {open ? (
        <Can resource="users" action="createEdit">
          <form className="panel mb-6 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label>
              <span className="label">Name</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label>
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label>
              <span className="label">
                {editing ? 'New password (optional)' : 'Password'}
              </span>
              <input
                className="input"
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                required={!editing}
              />
            </label>
            <label>
              <span className="label">Role</span>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </label>
            {form.role === ROLES.VENDOR ? (
              <label className="md:col-span-2">
                <span className="label">Supplier</span>
                <select
                  className="input"
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supplierId: e.target.value }))
                  }
                  required
                >
                  <option value="">Select supplier…</option>
                  {(suppliers.data || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {editing ? (
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Active (can sign in)
              </label>
            ) : null}
            <div className="flex gap-2 md:col-span-2">
              <button className="btn-primary" type="submit" disabled={save.isPending}>
                {editing ? 'Save changes' : 'Create user'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                  setForm(blank);
                }}
              >
                Cancel
              </button>
            </div>
            {save.isError ? (
              <p className="text-sm text-err md:col-span-2">
                {save.error.message}
              </p>
            ) : null}
          </form>
        </Can>
      ) : null}

      {!users.data?.length ? (
        <EmptyState message="No users yet. Add the first account above." />
      ) : (
        <div className="panel p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={users.data.map((u) => {
              const actions = (
                <RowActions
                  resource="users"
                  entityLabel={u.name || u.email}
                  onEdit={() => startEdit(u)}
                  viewContent={
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-muted">Name</dt>
                        <dd className="font-medium">{u.name || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Email</dt>
                        <dd>{u.email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Role</dt>
                        <dd>{ROLE_LABELS[u.role] || u.role}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Status</dt>
                        <dd>{u.active ? 'Active' : 'Inactive'}</dd>
                      </div>
                    </dl>
                  }
                />
              );
              return (
                <EntityCard
                  key={u.id}
                  title={u.name || u.email}
                  subtitle={u.email}
                  badge={
                    u.active ? (
                      <span className="text-xs text-ok">Active</span>
                    ) : (
                      <span className="text-xs text-err">Inactive</span>
                    )
                  }
                  fields={[
                    {
                      label: 'Role',
                      value: ROLE_LABELS[u.role] || u.role,
                    },
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
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.data.map((u) => (
                      <tr key={u.id} className="border-b border-line">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          {ROLE_LABELS[u.role] || u.role}
                        </td>
                        <td className="px-4 py-3">
                          {u.active ? (
                            <span className="text-ok">Active</span>
                          ) : (
                            <span className="text-err">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RowActions
                            resource="users"
                            entityLabel={u.name || u.email}
                            onEdit={() => startEdit(u)}
                            viewContent={
                              <dl className="space-y-2">
                                <div>
                                  <dt className="text-xs text-muted">Name</dt>
                                  <dd className="font-medium">
                                    {u.name || '—'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Email</dt>
                                  <dd>{u.email}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Role</dt>
                                  <dd>{ROLE_LABELS[u.role] || u.role}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Status</dt>
                                  <dd>{u.active ? 'Active' : 'Inactive'}</dd>
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
