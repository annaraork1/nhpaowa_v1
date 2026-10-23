import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { busApi } from '../api.js';
import { can } from '../../inventory/auth/permissions.js';
import {
  EmptyState,
  PageHeader,
  QueryStatus,
} from '../../inventory/components/ui.jsx';

export default function GatePage() {
  const qc = useQueryClient();
  const allowed = can('schoolBus', 'view');
  const canEdit = can('schoolBus', 'createEdit');
  const [direction, setDirection] = useState('');
  const [countsByBus, setCountsByBus] = useState({});
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const today = useQuery({
    queryKey: ['bus-gate-today', direction],
    queryFn: () => busApi.gate.today(direction),
    enabled: allowed && Boolean(direction),
    refetchInterval: 15000,
  });
  const live = useQuery({
    queryKey: ['bus-gate-live'],
    queryFn: () => busApi.gate.live(),
    enabled: allowed,
    refetchInterval: 10000,
  });

  const rows = today.data?.rows || [];

  const checkIn = useMutation({
    mutationFn: ({ busId, childCount }) =>
      busApi.gate.checkIn({
        busId,
        tripDirection: direction,
        ...(childCount !== undefined ? { childCount } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-gate-today'] });
      qc.invalidateQueries({ queryKey: ['bus-gate-live'] });
      setErr('');
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusyId(null),
  });

  const checkOut = useMutation({
    mutationFn: ({ tripId, childCount }) =>
      busApi.gate.checkOut(
        tripId,
        childCount !== undefined ? { childCount } : {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-gate-today'] });
      qc.invalidateQueries({ queryKey: ['bus-gate-live'] });
      setErr('');
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusyId(null),
  });

  const occupancyLabel = useMemo(() => {
    if (!live.data) return null;
    return `${live.data.occupancy}/${live.data.bayCapacity} bays`;
  }, [live.data]);

  function countFor(busId) {
    const v = countsByBus[busId];
    return v === undefined || v === '' ? '0' : v;
  }

  if (!allowed) {
    return <EmptyState message="You do not have permission to view school buses." />;
  }

  return (
    <div>
      <PageHeader
        title="School bus gate"
        subtitle={
          direction === 'PICKUP'
            ? 'PICKUP: tap IN, then enter children and tap OUT'
            : direction === 'DROPOFF'
              ? 'DROP-OFF: enter children and tap IN, then tap OUT'
              : 'Select PICKUP or DROP-OFF — child count once per trip'
        }
      />

      {live.data?.holdAtApproach ? (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
          Gate at capacity ({occupancyLabel}). Hold next buses at the approach road.
        </div>
      ) : live.data ? (
        <p className="mb-4 text-sm text-muted">Live occupancy: {occupancyLabel}</p>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3">
        {['PICKUP', 'DROPOFF'].map((d) => (
          <button
            key={d}
            type="button"
            className={`rounded-xl border px-4 py-6 text-lg font-bold ${
              direction === d
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-panel text-ink hover:border-brand'
            }`}
            onClick={() => setDirection(d)}
          >
            {d === 'PICKUP' ? 'PICKUP' : 'DROP-OFF'}
          </button>
        ))}
      </div>

      {!direction ? (
        <p className="text-sm text-muted">
          Choose PICKUP or DROP-OFF to unlock gate logging.
        </p>
      ) : (
        <>
          {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
              const bus = r.bus;
              const open = r.openTrip;
              const punching = busyId === bus.id;
              const canIn = r.status !== 'IN_GATE' && r.status !== 'LEFT';
              return (
                <article
                  key={bus.id}
                  className={`rounded-xl border p-4 shadow-sm ${
                    r.countMismatch
                      ? 'border-danger/50 bg-danger/5'
                      : 'border-line bg-panel'
                  }`}
                >
                  <p className="text-lg font-bold text-ink">
                    {bus.vehicleRegistrationNumber}
                  </p>
                  <p className="text-sm text-muted">{bus.school?.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    Slot {r.slot?.assignedTime || '—'} · {r.status}
                    {open && direction === 'DROPOFF'
                      ? ` · children: ${open.childCount}`
                      : ''}
                    {r.status === 'LEFT' && r.closedTrip
                      ? ` · children: ${r.closedTrip.childCount}`
                      : ''}
                  </p>
                  {r.pickupChildren != null || r.dropoffChildren != null ? (
                    <p className="mt-1 text-xs text-muted">
                      Today: Pickup OUT{' '}
                      {r.pickupChildren != null ? r.pickupChildren : '—'}
                      {' · '}
                      Drop-off IN{' '}
                      {r.dropoffChildren != null ? r.dropoffChildren : '—'}
                    </p>
                  ) : null}
                  {r.countMismatch ? (
                    <p className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
                      {r.countMismatchMessage ||
                        'Pickup OUT ≠ Drop-off IN — verify'}
                    </p>
                  ) : null}
                  {canEdit ? (
                    <div className="mt-3 space-y-2">
                      {canIn ? (
                        direction === 'DROPOFF' ? (
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="min-w-[5.5rem] flex-1">
                              <span className="label">Children</span>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                value={countFor(bus.id)}
                                onChange={(e) =>
                                  setCountsByBus({
                                    ...countsByBus,
                                    [bus.id]: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <button
                              type="button"
                              className="btn-primary flex-1"
                              disabled={punching || checkIn.isPending}
                              onClick={() => {
                                setBusyId(bus.id);
                                checkIn.mutate({
                                  busId: bus.id,
                                  childCount: Number(countFor(bus.id)) || 0,
                                });
                              }}
                            >
                              IN
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary w-full"
                            disabled={punching || checkIn.isPending}
                            onClick={() => {
                              setBusyId(bus.id);
                              checkIn.mutate({ busId: bus.id });
                            }}
                          >
                            IN
                          </button>
                        )
                      ) : null}
                      {open ? (
                        direction === 'PICKUP' ? (
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="min-w-[5.5rem] flex-1">
                              <span className="label">Children</span>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                value={countFor(bus.id)}
                                onChange={(e) =>
                                  setCountsByBus({
                                    ...countsByBus,
                                    [bus.id]: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <button
                              type="button"
                              className="btn-primary flex-1"
                              disabled={punching || checkOut.isPending}
                              onClick={() => {
                                setBusyId(bus.id);
                                checkOut.mutate({
                                  tripId: open.id,
                                  childCount: Number(countFor(bus.id)) || 0,
                                });
                              }}
                            >
                              OUT
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary w-full"
                            disabled={punching || checkOut.isPending}
                            onClick={() => {
                              setBusyId(bus.id);
                              checkOut.mutate({ tripId: open.id });
                            }}
                          >
                            OUT
                          </button>
                        )
                      ) : null}
                      {r.status === 'LEFT' ? (
                        <span className="text-xs text-muted">Shift logged</span>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          {!rows.length ? (
            <QueryStatus
              query={today}
              empty="No active buses for this direction."
              isEmpty={() => !rows.length}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
