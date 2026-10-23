import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { busApi } from '../api.js';
import { can } from '../../inventory/auth/permissions.js';
import {
  EmptyState,
  PageHeader,
  QueryStatus,
  pendingLabel,
} from '../../inventory/components/ui.jsx';

const blankBatch = {
  label: '',
  startTime: '07:30',
  endTime: '07:50',
  bayCapacity: 3,
  tripDirection: 'PICKUP',
};
const blankSlot = {
  busId: '',
  batchId: '',
  assignedTime: '07:35',
  staggerOrder: 1,
};

export default function BatchesSlotsPage() {
  const qc = useQueryClient();
  const allowed = can('schoolBusAdmin', 'view');
  const canEdit = can('schoolBusAdmin', 'createEdit');
  const [batchForm, setBatchForm] = useState(blankBatch);
  const [slotForm, setSlotForm] = useState(blankSlot);
  const [openBatch, setOpenBatch] = useState(false);
  const [openSlot, setOpenSlot] = useState(false);
  const [err, setErr] = useState('');

  const batches = useQuery({
    queryKey: ['bus-batches'],
    queryFn: () => busApi.batches.list(),
    enabled: allowed,
  });
  const buses = useQuery({
    queryKey: ['bus-vehicles-active'],
    queryFn: () => busApi.buses.list({ activeOnly: 'true' }),
    enabled: allowed,
  });
  const settings = useQuery({
    queryKey: ['bus-settings'],
    queryFn: () => busApi.settings.get(),
    enabled: allowed && canEdit,
  });

  const saveBatch = useMutation({
    mutationFn: (body) =>
      busApi.batches.create({
        ...body,
        bayCapacity: Number(body.bayCapacity) || 3,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-batches'] });
      setOpenBatch(false);
      setBatchForm(blankBatch);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const saveSlot = useMutation({
    mutationFn: (body) =>
      busApi.slots.create({
        ...body,
        staggerOrder: Number(body.staggerOrder) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-batches'] });
      setOpenSlot(false);
      setSlotForm(blankSlot);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const saveSettings = useMutation({
    mutationFn: busApi.settings.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-settings'] });
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view school buses." />;
  }

  return (
    <div>
      <PageHeader
        title="Batches & slots"
        subtitle="Stagger arrivals — bay capacity defaults to 3"
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setOpenBatch(true)}
              >
                Add batch
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setSlotForm({
                    ...blankSlot,
                    busId: buses.data?.[0]?.id || '',
                    batchId: batches.data?.[0]?.id || '',
                  });
                  setOpenSlot(true);
                }}
              >
                Assign slot
              </button>
            </div>
          ) : null
        }
      />

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      {canEdit && settings.data ? (
        <form
          className="panel mb-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveSettings.mutate({
              longWaitMinutes: Number(fd.get('longWaitMinutes')),
              offSlotBufferMinutes: Number(fd.get('offSlotBufferMinutes')),
              unmatchedCutoffTime: String(fd.get('unmatchedCutoffTime')),
            });
          }}
        >
          <label>
            <span className="label">Long-wait alert (min)</span>
            <input
              className="input"
              name="longWaitMinutes"
              type="number"
              defaultValue={settings.data.longWaitMinutes}
            />
          </label>
          <label>
            <span className="label">Off-slot buffer (min)</span>
            <input
              className="input"
              name="offSlotBufferMinutes"
              type="number"
              defaultValue={settings.data.offSlotBufferMinutes}
            />
          </label>
          <label>
            <span className="label">Unmatched OUT cutoff</span>
            <input
              className="input"
              name="unmatchedCutoffTime"
              defaultValue={settings.data.unmatchedCutoffTime || '20:00'}
            />
          </label>
          <button type="submit" className="btn-ghost sm:col-span-3 w-fit">
            Save alert thresholds
          </button>
        </form>
      ) : null}

      {openBatch && canEdit ? (
        <form
          className="panel mb-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveBatch.mutate(batchForm);
          }}
        >
          <label>
            <span className="label">Label</span>
            <input
              className="input"
              required
              value={batchForm.label}
              onChange={(e) =>
                setBatchForm({ ...batchForm, label: e.target.value })
              }
              placeholder="7:30-7:50 AM"
            />
          </label>
          <label>
            <span className="label">Direction</span>
            <select
              className="input"
              value={batchForm.tripDirection}
              onChange={(e) =>
                setBatchForm({ ...batchForm, tripDirection: e.target.value })
              }
            >
              <option value="PICKUP">PICKUP</option>
              <option value="DROPOFF">DROP-OFF</option>
            </select>
          </label>
          <label>
            <span className="label">Start</span>
            <input
              className="input"
              required
              value={batchForm.startTime}
              onChange={(e) =>
                setBatchForm({ ...batchForm, startTime: e.target.value })
              }
              placeholder="07:30"
            />
          </label>
          <label>
            <span className="label">End</span>
            <input
              className="input"
              required
              value={batchForm.endTime}
              onChange={(e) =>
                setBatchForm({ ...batchForm, endTime: e.target.value })
              }
              placeholder="07:50"
            />
          </label>
          <label>
            <span className="label">Bay capacity</span>
            <input
              className="input"
              type="number"
              min="1"
              value={batchForm.bayCapacity}
              onChange={(e) =>
                setBatchForm({ ...batchForm, bayCapacity: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={saveBatch.isPending}
            >
              {pendingLabel(saveBatch.isPending, 'Save batch')}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenBatch(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {openSlot && canEdit ? (
        <form
          className="panel mb-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveSlot.mutate(slotForm);
          }}
        >
          <label>
            <span className="label">Bus</span>
            <select
              className="input"
              required
              value={slotForm.busId}
              onChange={(e) =>
                setSlotForm({ ...slotForm, busId: e.target.value })
              }
            >
              <option value="">Select…</option>
              {(buses.data || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.vehicleRegistrationNumber} — {b.school?.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Batch</span>
            <select
              className="input"
              required
              value={slotForm.batchId}
              onChange={(e) =>
                setSlotForm({ ...slotForm, batchId: e.target.value })
              }
            >
              <option value="">Select…</option>
              {(batches.data || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.tripDirection})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Assigned time</span>
            <input
              className="input"
              required
              value={slotForm.assignedTime}
              onChange={(e) =>
                setSlotForm({ ...slotForm, assignedTime: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Stagger order</span>
            <input
              className="input"
              type="number"
              value={slotForm.staggerOrder}
              onChange={(e) =>
                setSlotForm({ ...slotForm, staggerOrder: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={saveSlot.isPending}
            >
              {pendingLabel(saveSlot.isPending, 'Save slot')}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenSlot(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <QueryStatus query={batches} empty="No batches yet." />
      <div className="space-y-4">
        {(batches.data || []).map((b) => (
          <div key={b.id} className="panel">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-ink">
                {b.label}{' '}
                <span className="text-sm font-normal text-muted">
                  {b.tripDirection} · bays {b.bayCapacity} · {b.startTime}–
                  {b.endTime}
                </span>
              </h2>
            </div>
            <ul className="space-y-1 text-sm">
              {(b.slots || []).map((s) => (
                <li key={s.id} className="text-ink">
                  {s.assignedTime} — {s.bus?.vehicleRegistrationNumber} (
                  {s.bus?.school?.name})
                </li>
              ))}
              {!(b.slots || []).length ? (
                <li className="text-muted">No slots assigned</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
