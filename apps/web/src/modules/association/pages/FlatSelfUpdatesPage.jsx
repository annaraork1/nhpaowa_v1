import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../inventory/api/client.js';
import { can } from '../../inventory/auth/permissions.js';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';

export default function FlatSelfUpdatesPage() {
  const qc = useQueryClient();
  const allowed = can('flatOwners', 'view');
  const canEdit = can('flatOwners', 'createEdit');

  const list = useQuery({
    queryKey: ['flat-self-updates'],
    queryFn: () => api.association.flatSelfUpdates.list('PENDING'),
    enabled: allowed,
  });
  const summary = useQuery({
    queryKey: ['flat-collection-summary'],
    queryFn: () => api.association.flats.collectionSummary(),
    enabled: allowed,
  });

  const approve = useMutation({
    mutationFn: (id) => api.association.flatSelfUpdates.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flat-self-updates'] });
      qc.invalidateQueries({ queryKey: ['flat-collection-summary'] });
    },
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }) =>
      api.association.flatSelfUpdates.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flat-self-updates'] });
    },
  });

  if (!allowed) {
    return <EmptyState message="No permission to manage flat updates." />;
  }

  const rows = list.data || [];
  const totals = summary.data?.totals;

  return (
    <div>
      <PageHeader
        title="Flat self-updates"
        subtitle="Login-free resident submissions awaiting review"
        actions={
          <div className="flex flex-wrap gap-2">
            <a className="btn-ghost" href="/flat-update" target="_blank" rel="noreferrer">
              1. Public form
            </a>
            <a
              className="btn-ghost"
              href="/flat-update/share"
              target="_blank"
              rel="noreferrer"
            >
              2. Share / WhatsApp
            </a>
            <a
              className="btn-ghost"
              href="/flat-update/paper"
              target="_blank"
              rel="noreferrer"
            >
              3. Paper form
            </a>
            <a
              className="btn-ghost"
              href="/flat-update?kiosk=1"
              target="_blank"
              rel="noreferrer"
            >
              4. Kiosk
            </a>
            <Link className="btn-ghost" to="/flats">
              5. Flats / household
            </Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                api.association.flats.downloadUpdateLinksCsv(
                  window.location.origin
                )
              }
            >
              Per-flat links CSV
            </button>
          </div>
        }
      />

      {totals ? (
        <p className="mb-3 text-sm text-muted">
          Collection: {totals.total} flats · SEED {totals.seed} · P1{' '}
          {totals.p1} · P2 {totals.p2} · verified {(totals.p1Pct ?? 0)}%
          {rows.length ? (
            <span className="ml-2 font-medium text-ink">
              · {rows.length} pending approval
              {rows.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </p>
      ) : null}

      <h2 className="mb-2 text-base font-semibold text-ink">
        Pending approvals
      </h2>
      <div className="panel mb-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-2">Flat</th>
              <th className="px-3 py-2">Occupancy</th>
              <th className="px-3 py-2">Primary</th>
              <th className="px-3 py-2">Secondary</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.payload || {};
              return (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-3 py-2 font-medium">
                    {r.flat?.tower}-{r.flat?.flatNumber}
                  </td>
                  <td className="px-3 py-2">{p.occupancyStatus}</td>
                  <td className="px-3 py-2">
                    {p.primaryName}
                    <br />
                    <span className="text-muted">{p.primaryPhone}</span>
                  </td>
                  <td className="px-3 py-2">
                    {p.secondaryName || '—'}
                    {p.secondaryPhone ? (
                      <>
                        <br />
                        <span className="text-muted">{p.secondaryPhone}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {p.tenantName || '—'}
                    {p.tenantPhone ? (
                      <>
                        <br />
                        <span className="text-muted">{p.tenantPhone}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(r.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={reject.isPending}
                          onClick={() => {
                            const reason =
                              window.prompt('Rejection reason') || 'Rejected';
                            reject.mutate({ id: r.id, reason });
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && !list.isLoading ? (
          <p className="px-3 py-4 text-sm text-muted">No pending updates.</p>
        ) : null}
      </div>

      <div className="panel mb-6 space-y-2 p-4 text-sm">
        <p className="font-semibold text-ink">Household data (P2) — how to capture</p>
        <p className="text-muted">
          The public <code className="text-ink">/flat-update</code> form is{' '}
          <strong className="font-medium text-ink">P1 only</strong> (tower
          number + occupancy + owners/tenant contacts). Household fields
          (vehicles, pets, emergency contacts, access devices, parking) use the
          existing register tools:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>
            <Link className="text-brand underline" to="/flats">
              Flat owners
            </Link>{' '}
            → open a flat → <strong className="font-medium text-ink">Edit household</strong>{' '}
            (staff), or resident login → My flat household (submits for approval).
          </li>
          <li>
            Same page: <strong className="font-medium text-ink">Import CSV</strong>{' '}
            with full household columns (015 template).
          </li>
          <li>
            Offline:{' '}
            <a
              className="text-brand underline"
              href="/flat-update/paper"
              target="_blank"
              rel="noreferrer"
            >
              Paper form
            </a>{' '}
            / captains, then office CSV import.
          </li>
          <li>
            Pending household item approvals also appear on{' '}
            <Link className="text-brand underline" to="/flats">
              Flat owners
            </Link>{' '}
            (vehicles / pets / emergency / access).
          </li>
        </ul>
      </div>

      {summary.data?.towers?.length ? (
        <>
          <h2 className="mb-2 text-base font-semibold text-ink">
            Tower completion
          </h2>
          <div className="panel overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-2">Tower</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">SEED</th>
                  <th className="px-3 py-2">P1+</th>
                  <th className="px-3 py-2">P1 %</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.towers.map((t) => (
                  <tr
                    key={t.tower}
                    className={`border-b border-border/60 ${
                      t.p1Pct < 70 ? 'bg-warning/10' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium">{t.tower}</td>
                    <td className="px-3 py-2">{t.total}</td>
                    <td className="px-3 py-2">{t.seed}</td>
                    <td className="px-3 py-2">{t.p1 + t.p2}</td>
                    <td className="px-3 py-2">{t.p1Pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
