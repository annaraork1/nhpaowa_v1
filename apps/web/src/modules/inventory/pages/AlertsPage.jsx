import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { EmptyState, PageHeader } from '../components/ui.jsx';

export default function AlertsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['alerts'], queryFn: () => api.alerts.list(false) });
  const mark = useMutation({
    mutationFn: api.alerts.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Low stock, PO due, AMC, receipts, new suppliers" />
      {!list.data?.length ? (
        <EmptyState message="No alerts yet." />
      ) : (
        <div className="space-y-3">
          {list.data.map((a) => (
            <div key={a.id} className={`panel ${a.isRead ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">{a.type}</p>
                  <p className="mt-1">{a.message}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {!a.isRead ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => mark.mutate(a.id)}
                  >
                    Mark read
                  </button>
                ) : (
                  <span className="text-xs text-muted">Read</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
