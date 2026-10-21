import { useQuery } from '@tanstack/react-query';
import { busApi } from '../api.js';
import { can } from '../../inventory/auth/permissions.js';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';

function StatusList({ title, rows }) {
  return (
    <div className="panel">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      <ul className="space-y-2">
        {(rows || []).map((r, i) => (
          <li
            key={`${r.vehicleRegistrationNumber}-${i}`}
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/50 pb-2 text-sm last:border-0"
          >
            <div>
              <p className="font-medium text-ink">
                {r.vehicleRegistrationNumber}
              </p>
              <p className="text-xs text-muted">
                {r.schoolName}
                {r.assignedTime ? ` · ${r.assignedTime}` : ''}
                {r.batchLabel ? ` · ${r.batchLabel}` : ''}
              </p>
            </div>
            <span className="text-xs font-semibold text-brand">{r.status}</span>
          </li>
        ))}
        {!(rows || []).length ? (
          <li className="text-sm text-muted">No buses listed</li>
        ) : null}
      </ul>
    </div>
  );
}

export default function ResidentBusesPage() {
  const allowed = can('schoolBus', 'view');
  const today = useQuery({
    queryKey: ['bus-resident-today'],
    queryFn: () => busApi.resident.today(),
    enabled: allowed,
    refetchInterval: 30000,
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view school buses." />;
  }

  return (
    <div>
      <PageHeader
        title="Today’s buses"
        subtitle={
          today.data?.date
            ? `Campus schedule for ${today.data.date} (status only)`
            : 'Campus school-bus schedule'
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <StatusList title="Morning pickup" rows={today.data?.pickup} />
        <StatusList title="Afternoon drop-off" rows={today.data?.dropoff} />
      </div>
    </div>
  );
}
