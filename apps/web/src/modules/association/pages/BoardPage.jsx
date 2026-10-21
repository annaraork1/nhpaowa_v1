import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../inventory/api/client.js';
import { can } from '../../inventory/auth/permissions.js';
import { RowActions } from '../../inventory/components/RowActions.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../../inventory/components/ResponsiveList.jsx';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';

const blankRole = {
  name: '',
  code: '',
  sortOrder: 0,
  showOnLetterhead: true,
  isPresidentSigner: false,
  active: true,
};

const blankMember = {
  roleId: '',
  fullName: '',
  phone: '',
  email: '',
  notes: '',
  sortOrder: 0,
  active: true,
};

export default function BoardPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('members');
  const [roleForm, setRoleForm] = useState(blankRole);
  const [memberForm, setMemberForm] = useState(blankMember);
  const [editingRole, setEditingRole] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [openRole, setOpenRole] = useState(false);
  const [openMember, setOpenMember] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const allowed = can('board', 'view');
  const canEdit = can('board', 'createEdit');

  const roles = useQuery({
    queryKey: ['board-roles'],
    queryFn: () => api.association.board.roles.list(true),
    enabled: allowed,
  });
  const members = useQuery({
    queryKey: ['board-members', q],
    queryFn: () =>
      api.association.board.members.list(q.trim() ? { q: q.trim() } : {}),
    enabled: allowed,
  });

  const saveRole = useMutation({
    mutationFn: (body) =>
      editingRole
        ? api.association.board.roles.update(editingRole, body)
        : api.association.board.roles.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-roles'] });
      qc.invalidateQueries({ queryKey: ['board-members'] });
      setOpenRole(false);
      setEditingRole(null);
      setRoleForm(blankRole);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const saveMember = useMutation({
    mutationFn: (body) =>
      editingMember
        ? api.association.board.members.update(editingMember, body)
        : api.association.board.members.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members'] });
      qc.invalidateQueries({ queryKey: ['board-roles'] });
      setOpenMember(false);
      setEditingMember(null);
      setMemberForm(blankMember);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const removeRole = useMutation({
    mutationFn: api.association.board.roles.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-roles'] }),
    onError: (e) => setErr(e.message),
  });

  const removeMember = useMutation({
    mutationFn: api.association.board.members.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members'] });
      qc.invalidateQueries({ queryKey: ['board-roles'] });
    },
    onError: (e) => setErr(e.message),
  });

  if (!allowed) {
    return (
      <EmptyState message="You do not have permission to view the board register." />
    );
  }

  return (
    <div>
      <PageHeader
        title="Board & office bearers"
        subtitle="Managing committee roles and members — used on notice/NOC letterheads"
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEditingRole(null);
                  setRoleForm(blankRole);
                  setOpenRole(true);
                  setTab('roles');
                }}
              >
                Add role
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setEditingMember(null);
                  setMemberForm({
                    ...blankMember,
                    roleId: roles.data?.[0]?.id || '',
                  });
                  setOpenMember(true);
                  setTab('members');
                }}
              >
                Add member
              </button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={tab === 'members' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('members')}
        >
          Members
        </button>
        <button
          type="button"
          className={tab === 'roles' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('roles')}
        >
          Roles
        </button>
        {tab === 'members' ? (
          <input
            className="input max-w-sm"
            placeholder="Search by name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        ) : null}
      </div>

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      {openRole && canEdit ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveRole.mutate({
              ...roleForm,
              code:
                roleForm.code ||
                roleForm.name.toUpperCase().replace(/\s+/g, '_'),
              sortOrder: Number(roleForm.sortOrder) || 0,
            });
          }}
        >
          <label>
            <span className="label">Role name</span>
            <input
              className="input"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              required
            />
          </label>
          <label>
            <span className="label">Code</span>
            <input
              className="input"
              value={roleForm.code}
              placeholder="PRESIDENT"
              onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Sort order</span>
            <input
              className="input"
              type="number"
              value={roleForm.sortOrder}
              onChange={(e) =>
                setRoleForm({ ...roleForm, sortOrder: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={roleForm.showOnLetterhead}
              onChange={(e) =>
                setRoleForm({ ...roleForm, showOnLetterhead: e.target.checked })
              }
            />
            Show on letterhead
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={roleForm.isPresidentSigner}
              onChange={(e) =>
                setRoleForm({ ...roleForm, isPresidentSigner: e.target.checked })
              }
            />
            President signer (PDF signature)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={roleForm.active}
              onChange={(e) =>
                setRoleForm({ ...roleForm, active: e.target.checked })
              }
            />
            Active
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">
              {editingRole ? 'Save role' : 'Create role'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenRole(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {openMember && canEdit ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveMember.mutate({
              ...memberForm,
              phone: memberForm.phone || null,
              email: memberForm.email || null,
              notes: memberForm.notes || null,
              sortOrder: Number(memberForm.sortOrder) || 0,
            });
          }}
        >
          <label>
            <span className="label">Role</span>
            <select
              className="input"
              value={memberForm.roleId}
              onChange={(e) =>
                setMemberForm({ ...memberForm, roleId: e.target.value })
              }
              required
            >
              <option value="">Select role</option>
              {(roles.data || [])
                .filter((r) => r.active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="label">Full name</span>
            <input
              className="input"
              value={memberForm.fullName}
              onChange={(e) =>
                setMemberForm({ ...memberForm, fullName: e.target.value })
              }
              required
            />
          </label>
          <label>
            <span className="label">Phone</span>
            <input
              className="input"
              value={memberForm.phone}
              onChange={(e) =>
                setMemberForm({ ...memberForm, phone: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={memberForm.email}
              onChange={(e) =>
                setMemberForm({ ...memberForm, email: e.target.value })
              }
            />
          </label>
          <label className="md:col-span-2">
            <span className="label">Notes</span>
            <input
              className="input"
              value={memberForm.notes}
              onChange={(e) =>
                setMemberForm({ ...memberForm, notes: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={memberForm.active}
              onChange={(e) =>
                setMemberForm({ ...memberForm, active: e.target.checked })
              }
            />
            Active
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">
              {editingMember ? 'Save member' : 'Add member'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenMember(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'roles' ? (
        <div className="panel p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={(roles.data || []).map((r) => {
              const roleActions = (
                <RowActions
                  resource="board"
                  entityLabel={r.name}
                  viewWide
                  onEdit={() => {
                    setEditingRole(r.id);
                    setRoleForm({
                      name: r.name,
                      code: r.code,
                      sortOrder: r.sortOrder,
                      showOnLetterhead: r.showOnLetterhead,
                      isPresidentSigner: r.isPresidentSigner,
                      active: r.active,
                    });
                    setOpenRole(true);
                  }}
                  onDeactivate={() => removeRole.mutate(r.id)}
                  deactivatePending={removeRole.isPending}
                  viewContent={
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-muted">Role</dt>
                        <dd className="font-medium">{r.name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Code</dt>
                        <dd>{r.code}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Letterhead</dt>
                        <dd>{r.showOnLetterhead ? 'Yes' : 'No'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">President signer</dt>
                        <dd>{r.isPresidentSigner ? 'Yes' : 'No'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Active</dt>
                        <dd>{r.active ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                  }
                />
              );
              return (
                <EntityCard
                  key={r.id}
                  title={r.name}
                  subtitle={r.code}
                  fields={[
                    { label: 'Order', value: r.sortOrder },
                    {
                      label: 'Letterhead',
                      value: r.showOnLetterhead ? 'Yes' : 'No',
                    },
                    {
                      label: 'Signer',
                      value: r.isPresidentSigner ? 'Yes' : '—',
                    },
                    { label: 'Active', value: r.active ? 'Yes' : 'No' },
                  ]}
                  actions={roleActions}
                />
              );
            })}
            desktop={
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Letterhead</th>
                      <th className="px-3 py-2">Signer</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(roles.data || []).map((r) => (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-3 py-2">{r.sortOrder}</td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2">{r.code}</td>
                        <td className="px-3 py-2">
                          {r.showOnLetterhead ? 'Yes' : 'No'}
                        </td>
                        <td className="px-3 py-2">
                          {r.isPresidentSigner ? 'Yes' : '—'}
                        </td>
                        <td className="px-3 py-2">{r.active ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 text-right">
                          <RowActions
                            resource="board"
                            entityLabel={r.name}
                            onEdit={() => {
                              setEditingRole(r.id);
                              setRoleForm({
                                name: r.name,
                                code: r.code,
                                sortOrder: r.sortOrder,
                                showOnLetterhead: r.showOnLetterhead,
                                isPresidentSigner: r.isPresidentSigner,
                                active: r.active,
                              });
                              setOpenRole(true);
                            }}
                            onDeactivate={() => removeRole.mutate(r.id)}
                            deactivatePending={removeRole.isPending}
                            viewContent={
                              <dl className="space-y-2">
                                <div>
                                  <dt className="text-xs text-muted">Role</dt>
                                  <dd className="font-medium">{r.name}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Code</dt>
                                  <dd>{r.code}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Letterhead</dt>
                                  <dd>{r.showOnLetterhead ? 'Yes' : 'No'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">
                                    President signer
                                  </dt>
                                  <dd>{r.isPresidentSigner ? 'Yes' : 'No'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-muted">Active</dt>
                                  <dd>{r.active ? 'Yes' : 'No'}</dd>
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
      ) : (
        <div className="panel p-0">
          {!members.isLoading && !(members.data || []).length ? (
            <EmptyState message="No board members yet." />
          ) : (members.data || []).length ? (
            <ResponsiveList
              className="p-3 md:p-0"
              mobile={(members.data || []).map((m) => {
                const memberActions = (
                  <RowActions
                    resource="board"
                    entityLabel={m.fullName}
                    viewWide
                    onEdit={() => {
                      setEditingMember(m.id);
                      setMemberForm({
                        roleId: m.roleId,
                        fullName: m.fullName,
                        phone: m.phone || '',
                        email: m.email || '',
                        notes: m.notes || '',
                        sortOrder: m.sortOrder,
                        active: m.active,
                      });
                      setOpenMember(true);
                    }}
                    onDeactivate={() => removeMember.mutate(m.id)}
                    deactivatePending={removeMember.isPending}
                    viewContent={
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-muted">Name</dt>
                          <dd className="font-medium">{m.fullName}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Role</dt>
                          <dd>{m.role?.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Phone</dt>
                          <dd>{m.phone || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Email</dt>
                          <dd>{m.email || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Active</dt>
                          <dd>{m.active ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                    }
                  />
                );
                return (
                  <EntityCard
                    key={m.id}
                    title={m.fullName}
                    subtitle={m.role?.name}
                    fields={[
                      { label: 'Phone', value: m.phone || '—' },
                      { label: 'Email', value: m.email || '—' },
                      { label: 'Active', value: m.active ? 'Yes' : 'No' },
                    ]}
                    actions={memberActions}
                  />
                );
              })}
              desktop={
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Active</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(members.data || []).map((m) => (
                        <tr key={m.id} className="border-b border-border/60">
                          <td className="px-3 py-2">{m.role?.name}</td>
                          <td className="px-3 py-2 font-medium">{m.fullName}</td>
                          <td className="px-3 py-2">{m.phone || '—'}</td>
                          <td className="px-3 py-2">{m.email || '—'}</td>
                          <td className="px-3 py-2">{m.active ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2 text-right">
                            <RowActions
                              resource="board"
                              entityLabel={m.fullName}
                              onEdit={() => {
                                setEditingMember(m.id);
                                setMemberForm({
                                  roleId: m.roleId,
                                  fullName: m.fullName,
                                  phone: m.phone || '',
                                  email: m.email || '',
                                  notes: m.notes || '',
                                  sortOrder: m.sortOrder,
                                  active: m.active,
                                });
                                setOpenMember(true);
                              }}
                              onDeactivate={() => removeMember.mutate(m.id)}
                              deactivatePending={removeMember.isPending}
                              viewContent={
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-muted">Name</dt>
                                    <dd className="font-medium">{m.fullName}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Role</dt>
                                    <dd>{m.role?.name || '—'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Phone</dt>
                                    <dd>{m.phone || '—'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Email</dt>
                                    <dd>{m.email || '—'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Active</dt>
                                    <dd>{m.active ? 'Yes' : 'No'}</dd>
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
          ) : null}
        </div>
      )}
    </div>
  );
}
