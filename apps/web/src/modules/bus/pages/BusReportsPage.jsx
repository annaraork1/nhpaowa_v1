import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { associationCalendarYmd } from '@nhpaowa/shared-ui';
import { busApi } from '../api.js';
import { can } from '../../inventory/auth/permissions.js';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';

export default function BusReportsPage() {
  const allowed = can('schoolBus', 'view');
  const [date, setDate] = useState(associationCalendarYmd());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const daily = useQuery({
    queryKey: ['bus-daily-trips', date],
    queryFn: () => busApi.reports.dailyTrips(date),
    enabled: allowed && Boolean(date),
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view school buses." />;
  }

  async function run(name, fn) {
    setBusy(name);
    setErr('');
    try {
      await fn(date);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  const buses = daily.data?.buses || [];
  const totals = daily.data?.totals;

  return (
    <div>
      <PageHeader
        title="Bus reports"
        subtitle="Daily bus & child counts (view for all gate roles); registry stays under Schools & buses"
      />
      <label className="mb-4 block max-w-xs">
        <span className="label">Date</span>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            All buses — child counts ({date})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={Boolean(busy)}
              onClick={() => run('daily-csv', busApi.reports.dailyTripsCsv)}
            >
              {busy === 'daily-csv' ? '…' : 'Daily CSV'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={Boolean(busy)}
              onClick={() => run('daily-pdf', busApi.reports.dailyTripsPdf)}
            >
              {busy === 'daily-pdf' ? '…' : 'Daily PDF'}
            </button>
          </div>
        </div>
        {totals ? (
          <p className="mb-3 text-sm text-muted">
            {totals.trips} trip(s) · children {totals.children}
            {totals.countMismatches
              ? ` · ${totals.countMismatches} pickup/drop-off count mismatch(es)`
              : ''}
          </p>
        ) : null}
        {daily.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : daily.isError ? (
          <p className="text-sm text-danger">{daily.error.message}</p>
        ) : (
          <div className="panel overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">School</th>
                  <th className="px-3 py-2">Pickup IN/OUT</th>
                  <th className="px-3 py-2">Pickup children</th>
                  <th className="px-3 py-2">Drop-off IN/OUT</th>
                  <th className="px-3 py-2">Drop-off children</th>
                  <th className="px-3 py-2">Check</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((b) => (
                  <tr
                    key={b.busId}
                    className={`border-b border-border/60 ${
                      b.countMismatch ? 'bg-danger/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium">{b.vehicle}</td>
                    <td className="px-3 py-2">{b.schoolName}</td>
                    <td className="px-3 py-2">
                      {b.pickupIn || '—'}
                      {b.pickupOut ? ` → ${b.pickupOut}` : ''}
                    </td>
                    <td
                      className={`px-3 py-2 ${
                        b.countMismatch ? 'font-semibold text-danger' : ''
                      }`}
                    >
                      {b.pickupChildren != null ? b.pickupChildren : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {b.dropoffIn || '—'}
                      {b.dropoffOut ? ` → ${b.dropoffOut}` : ''}
                    </td>
                    <td
                      className={`px-3 py-2 ${
                        b.countMismatch ? 'font-semibold text-danger' : ''
                      }`}
                    >
                      {b.dropoffChildren != null ? b.dropoffChildren : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {b.countMismatch ? (
                        <span className="font-semibold text-danger">
                          {b.countMismatchMessage || 'Verify counts'}
                        </span>
                      ) : b.pickupChildren != null &&
                        b.dropoffChildren != null ? (
                        <span className="text-muted">OK</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!buses.length ? (
              <p className="px-3 py-4 text-sm text-muted">No active buses.</p>
            ) : null}
          </div>
        )}
      </section>

      <h2 className="mb-2 text-base font-semibold text-ink">Other exports</h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={Boolean(busy)}
          onClick={() => run('rec', busApi.reports.reconciliationCsv)}
        >
          {busy === 'rec' ? '…' : 'Reconciliation CSV'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => run('wait', busApi.reports.waitTimesCsv)}
        >
          {busy === 'wait' ? '…' : 'Wait-times CSV'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => run('cong', busApi.reports.congestionCsv)}
        >
          {busy === 'cong' ? '…' : 'Congestion CSV'}
        </button>
      </div>
    </div>
  );
}
