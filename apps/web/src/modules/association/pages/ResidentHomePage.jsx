import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatFlatLabel } from '@nhpaowa/shared-ui';
import { api, getAuthUser } from '../../inventory/api/client.js';
import { can } from '../../inventory/auth/permissions.js';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';

export default function ResidentHomePage() {
  const user = getAuthUser();
  const allowed = can('home', 'view');

  const flats = useQuery({
    queryKey: ['resident-flats'],
    queryFn: () => api.association.flats.list({ limit: 50 }),
    enabled: allowed && can('flatOwners', 'view'),
  });
  const noc = useQuery({
    queryKey: ['resident-noc'],
    queryFn: () => api.association.noc.list({}),
    enabled: allowed && can('noc', 'view'),
  });
  const moves = useQuery({
    queryKey: ['resident-moves'],
    queryFn: () => api.association.moves.list({}),
    enabled: allowed && can('moves', 'view'),
  });
  const notices = useQuery({
    queryKey: ['resident-notices'],
    queryFn: () => api.association.notices.list({}),
    enabled: allowed && can('notices', 'view'),
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view the home page." />;
  }

  const myFlats = flats.data?.items || [];
  const openNoc = (noc.data || []).filter((n) =>
    ['SUBMITTED', 'DRAFT'].includes(n.status)
  ).length;
  const openMoves = (moves.data || []).filter((m) =>
    ['REQUESTED', 'APPROVED', 'IN_PROGRESS'].includes(m.status)
  ).length;
  const noticeCount = (notices.data || []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name || 'Resident'}`}
        subtitle="Your tower flat, household submissions, notices, NOC and move requests"
      />

      <section className="panel space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          My flats
        </h2>
        {flats.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : myFlats.length ? (
          <ul className="space-y-2">
            {myFlats.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{formatFlatLabel(f)}</p>
                  <p className="text-sm text-muted">
                    {f.apartmentType} · {f.configuration} · {f.occupancyStatus}
                  </p>
                </div>
                <Link to="/flats" className="btn-primary text-sm">
                  Open household
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No flat is linked to this login yet. Ask the Secretary to link your
            account to your tower unit.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="panel">
          <p className="text-xs uppercase text-muted">Open NOCs</p>
          <p className="mt-1 text-2xl font-bold text-ink">{openNoc}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase text-muted">Active moves</p>
          <p className="mt-1 text-2xl font-bold text-ink">{openMoves}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase text-muted">Published notices</p>
          <p className="mt-1 text-2xl font-bold text-ink">{noticeCount}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link to="/flats" className="btn-primary">
          My flat &amp; household
        </Link>
        <Link to="/noc" className="btn-ghost">
          Request NOC
        </Link>
        <Link to="/moves" className="btn-ghost">
          Request move
        </Link>
        <Link to="/notices" className="btn-ghost">
          Notices
        </Link>
        {can('schoolBus', 'view') ? (
          <Link to="/buses/today" className="btn-ghost">
            Today’s buses
          </Link>
        ) : null}
      </section>
    </div>
  );
}
