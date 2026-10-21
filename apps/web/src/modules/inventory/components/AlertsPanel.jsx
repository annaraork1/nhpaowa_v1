import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { relativeTime } from './ui.jsx';

const TYPE_ICON = {
  LOW_STOCK: '⚠️',
  PO_DUE: '📋',
  AMC_EXPIRY: '🛠️',
  STOCK_RECEIVED: '✅',
  NEW_SUPPLIER: '🏢',
  NOTICE_PUBLISHED: '📢',
};

export function AlertsPanel({ compact }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => api.alerts.list(true),
  });
  const mark = useMutation({
    mutationFn: (id) => api.alerts.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  if (compact) {
    return (
      <div className="relative group">
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-muted hover:text-ink"
          type="button"
          aria-label="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {data.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {data.length}
            </span>
          ) : null}
        </button>
        <div className="invisible absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line bg-panel p-3 opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <Link to="/alerts" className="text-xs font-medium text-brand">
              View All
            </Link>
          </div>
          <AlertList data={data.slice(0, 6)} onRead={(id) => mark.mutate(id)} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel !p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Alerts & Notifications</h3>
        <Link to="/alerts" className="text-xs font-semibold text-brand">
          View All
        </Link>
      </div>
      <AlertList data={data.slice(0, 5)} onRead={(id) => mark.mutate(id)} />
    </div>
  );
}

function AlertList({ data, onRead }) {
  if (!data.length) {
    return <p className="py-4 text-sm text-muted">No unread alerts</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((a) => (
        <li key={a.id} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
          <span className="mt-0.5 text-base leading-none">{TYPE_ICON[a.type] || '🔔'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{a.type.replaceAll('_', ' ')}</p>
            <p className="truncate text-xs text-muted">{a.message}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-muted">{relativeTime(a.createdAt)}</span>
              <button
                type="button"
                className="text-[11px] font-medium text-brand"
                onClick={() => onRead(a.id)}
              >
                Mark read
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
