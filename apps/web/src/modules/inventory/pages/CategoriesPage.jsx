import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { RowActions } from '../components/RowActions.jsx';
import { EmptyState, PageHeader } from '../components/ui.jsx';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState(null);

  const list = useQuery({ queryKey: ['categories'], queryFn: api.categories.list });
  const save = useMutation({
    mutationFn: (body) =>
      editing
        ? api.categories.update(editing, body)
        : api.categories.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      setDescription('');
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: api.categories.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div>
      <PageHeader title="Categories" subtitle="Classify inventory items" />
      <Can resource="categories" action="createEdit">
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ name, description });
          }}
        >
          <label>
            <span className="label">Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="md:col-span-2">
            <span className="label">Description</span>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button className="btn-primary w-fit" type="submit">
            {editing ? 'Save' : 'Add category'}
          </button>
        </form>
      </Can>

      {!list.data?.length ? (
        <EmptyState message="No categories yet." />
      ) : (
        <div className="panel space-y-3">
          {list.data.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-line pb-3"
            >
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-sm text-muted">{c.description}</p>
              </div>
              <RowActions
                resource="categories"
                entityLabel={c.name}
                onEdit={() => {
                  setEditing(c.id);
                  setName(c.name);
                  setDescription(c.description || '');
                }}
                onDelete={() => remove.mutate(c.id)}
                deletePending={remove.isPending}
                viewContent={
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-muted">Name</dt>
                      <dd className="font-medium">{c.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Description</dt>
                      <dd>{c.description || '—'}</dd>
                    </div>
                  </dl>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
