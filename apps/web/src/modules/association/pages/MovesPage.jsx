import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  EyeIcon,
  FlagIcon,
  NoSymbolIcon,
  PlayIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatFlatLabel } from '@nhpaowa/shared-ui';
import {
  associationCalendarYmd,
  addCalendarDaysYmd,
} from '@nhpaowa/shared-ui';
import { api, mediaUrl } from '../../inventory/api/client.js';
import { can } from '../../inventory/auth/permissions.js';
import { IconButton } from '../../inventory/components/IconButton.jsx';
import {
  EmptyState,
  PageHeader,
  QueryStatus,
} from '../../inventory/components/ui.jsx';
import { FlatSearchSelect } from '../components/FlatSearchSelect.jsx';
import { getAuthUser } from '../../inventory/api/client.js';

const blank = {
  flatId: '',
  destinationFlatId: '',
  type: 'MOVE_IN',
  partyType: 'OWNER',
  scheduledDate: associationCalendarYmd(),
  contactName: '',
  contactPhone: '',
  moverNotes: '',
};

function typeLabel(type) {
  if (type === 'INTERNAL_SHIFT') return 'Internal shift';
  if (type === 'MOVE_OUT') return 'Move out';
  return 'Move in';
}

function flatRouteLabel(m) {
  const origin = formatFlatLabel(m.flat);
  if (m.type === 'INTERNAL_SHIFT' && m.destinationFlat) {
    return `${origin} → ${formatFlatLabel(m.destinationFlat)}`;
  }
  return origin;
}

function formatWhen(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function MovesPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [completeId, setCompleteId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [attachLabel, setAttachLabel] = useState('');
  const [handover, setHandover] = useState({
    electricityMeter: '',
    waterMeter: '',
    keysCount: '',
    accessCardsCount: '',
    parkingTagsCount: '',
    notes: '',
  });
  const [err, setErr] = useState('');

  const allowed = can('moves', 'view');
  const canEdit = can('moves', 'createEdit');
  const role = getAuthUser()?.role;
  const isResident = role === 'RESIDENT';
  const canWorkflow = role === 'SUPERADMIN' || role === 'SECRETARY';

  const today = useQuery({
    queryKey: ['moves-today'],
    queryFn: () => api.association.moves.list({ date: 'today' }),
    enabled: allowed && !isResident,
  });
  const list = useQuery({
    queryKey: ['moves'],
    queryFn: () => api.association.moves.list({}),
    enabled: allowed,
  });
  const myFlats = useQuery({
    queryKey: ['flats-for-moves'],
    queryFn: () => api.association.flats.list({ limit: 1 }),
    enabled: allowed && isResident,
  });
  const detail = useQuery({
    queryKey: ['move', detailId],
    queryFn: () => api.association.moves.get(detailId),
    enabled: allowed && Boolean(detailId),
  });

  const create = useMutation({
    mutationFn: api.association.moves.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.invalidateQueries({ queryKey: ['moves-today'] });
      setOpen(false);
      setForm(blank);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const act = useMutation({
    mutationFn: ({ id, action, body }) => {
      if (action === 'complete') return api.association.moves.complete(id, body);
      if (action === 'reject') return api.association.moves.reject(id, body);
      if (action === 'cancel') return api.association.moves.cancel(id, body);
      return api.association.moves[action](id);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.invalidateQueries({ queryKey: ['moves-today'] });
      qc.invalidateQueries({ queryKey: ['flats'] });
      if (vars?.id) qc.invalidateQueries({ queryKey: ['move', vars.id] });
      setCompleteId(null);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const uploadAtt = useMutation({
    mutationFn: ({ id, file, label }) =>
      api.association.moves.uploadAttachment(id, file, label),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['move', vars.id] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.invalidateQueries({ queryKey: ['moves-today'] });
      setAttachLabel('');
      if (fileRef.current) fileRef.current.value = '';
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const removeAtt = useMutation({
    mutationFn: ({ id, attachmentId }) =>
      api.association.moves.removeAttachment(id, attachmentId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['move', vars.id] });
      qc.invalidateQueries({ queryKey: ['moves'] });
    },
    onError: (e) => setErr(e.message),
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view move requests." />;
  }

  function MoveRow({ m }) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-semibold text-ink">
            {typeLabel(m.type)} · {flatRouteLabel(m)}
          </p>
          <p className="text-sm text-muted">
            {m.partyType} · {m.contactName} · {m.contactPhone} ·{' '}
            {new Date(m.scheduledDate).toLocaleDateString()} ·{' '}
            <span className="font-medium text-ink">{m.status}</span>
            {m.attachments?.length ? (
              <span className="text-muted">
                {' '}
                · {m.attachments.length} file
                {m.attachments.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </p>
          {m.moverNotes ? (
            <p className="text-sm text-muted">{m.moverNotes}</p>
          ) : null}
        </div>
        <div className="inline-flex flex-wrap items-center justify-end gap-0.5">
          <IconButton label="Details" onClick={() => setDetailId(m.id)}>
            <EyeIcon className="h-5 w-5" />
          </IconButton>
          {['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(m.status) ? (
            <IconButton
              label="Download PDF"
              onClick={() => {
                const name = `move-${m.type.toLowerCase()}-${m.id.slice(0, 8)}.pdf`;
                api.association.moves
                  .downloadPdf(m.id, name)
                  .catch((e) => setErr(e.message));
              }}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </IconButton>
          ) : null}
          {canWorkflow ? (
            <>
            {m.status === 'REQUESTED' ? (
              <>
                <IconButton
                  label="Approve"
                  tone="brand"
                  onClick={() => act.mutate({ id: m.id, action: 'approve' })}
                >
                  <CheckIcon className="h-5 w-5" />
                </IconButton>
                <IconButton
                  label="Reject"
                  tone="danger"
                  onClick={() => {
                    const reason = prompt('Reject reason');
                    if (reason)
                      act.mutate({
                        id: m.id,
                        action: 'reject',
                        body: { reason },
                      });
                  }}
                >
                  <XMarkIcon className="h-5 w-5" />
                </IconButton>
              </>
            ) : null}
            {m.status === 'APPROVED' ? (
              <IconButton
                label="Start"
                tone="brand"
                onClick={() => act.mutate({ id: m.id, action: 'start' })}
              >
                <PlayIcon className="h-5 w-5" />
              </IconButton>
            ) : null}
            {m.status === 'IN_PROGRESS' ? (
              <IconButton
                label="Complete + handover"
                tone="brand"
                onClick={() => setCompleteId(m.id)}
              >
                <FlagIcon className="h-5 w-5" />
              </IconButton>
            ) : null}
            {['REQUESTED', 'APPROVED'].includes(m.status) ? (
              <IconButton
                label="Cancel"
                tone="danger"
                onClick={() =>
                  act.mutate({ id: m.id, action: 'cancel', body: {} })
                }
              >
                <NoSymbolIcon className="h-5 w-5" />
              </IconButton>
            ) : null}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  const d = detail.data;

  return (
    <div>
      <PageHeader
        title={isResident ? 'My move requests' : 'Move-in / move-out / internal shift'}
        subtitle={
          isResident
            ? 'Request move-in, move-out, or internal shift for your linked flat'
            : 'Gate scheduling, progress history, attachments, and PDF gate passes'
        }
        actions={
          canEdit ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const first = (myFlats.data || [])[0];
                setForm({
                  ...blank,
                  flatId: isResident && first ? first.id : '',
                  contactName: isResident ? getAuthUser()?.name || '' : '',
                });
                setOpen(true);
              }}
            >
              {isResident ? 'Request move' : 'New move request'}
            </button>
          ) : null
        }
      />

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      {detailId ? (
        <div className="panel mb-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">Move details</h2>
              {d ? (
                <p className="text-sm text-muted">
                  {typeLabel(d.type)} · {flatRouteLabel(d)} ·{' '}
                  <span className="font-medium text-ink">{d.status}</span>
                </p>
              ) : (
                <p className="text-sm text-muted">Loading…</p>
              )}
            </div>
            <IconButton label="Close details" onClick={() => setDetailId(null)}>
              <XMarkIcon className="h-5 w-5" />
            </IconButton>
          </div>

          {d ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  Progress history
                </h3>
                {!d.statusEvents?.length ? (
                  <p className="text-sm text-muted">No status events yet.</p>
                ) : (
                  <ol className="space-y-3 border-l border-line pl-4">
                    {d.statusEvents.map((ev) => (
                      <li key={ev.id} className="relative text-sm">
                        <span className="absolute -left-[1.15rem] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                        <p className="font-medium text-ink">
                          {ev.fromStatus || '—'} → {ev.toStatus}
                        </p>
                        <p className="text-muted">{formatWhen(ev.createdAt)}</p>
                        {ev.note ? (
                          <p className="text-muted">{ev.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}

                {d.handover ? (
                  <div className="mt-4 text-sm">
                    <h3 className="mb-1 font-semibold text-ink">Handover</h3>
                    <p className="text-muted">
                      Elec: {d.handover.electricityMeter || '—'} · Water:{' '}
                      {d.handover.waterMeter || '—'} · Keys:{' '}
                      {d.handover.keysCount ?? '—'} · Cards:{' '}
                      {d.handover.accessCardsCount ?? '—'} · Tags:{' '}
                      {d.handover.parkingTagsCount ?? '—'}
                    </p>
                    {d.handover.notes ? (
                      <p className="text-muted">{d.handover.notes}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  Attachments
                </h3>
                <p className="mb-3 text-xs text-muted">
                  ID scans, agreement copies, police ack, gate photos — visible
                  to Security and residents with access.
                </p>
                {!d.attachments?.length ? (
                  <p className="mb-3 text-sm text-muted">No attachments yet.</p>
                ) : (
                  <ul className="mb-4 space-y-2 text-sm">
                    {d.attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2"
                      >
                        <div>
                          <a
                            className="font-medium text-brand underline"
                            href={mediaUrl(a.url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {a.label || a.originalName}
                          </a>
                          <p className="text-xs text-muted">
                            {a.originalName} · {formatWhen(a.createdAt)}
                          </p>
                        </div>
                        {canEdit ? (
                          <IconButton
                            label="Remove attachment"
                            tone="danger"
                            onClick={() =>
                              removeAtt.mutate({
                                id: d.id,
                                attachmentId: a.id,
                              })
                            }
                          >
                            <TrashIcon className="h-5 w-5" />
                          </IconButton>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {canEdit ? (
                  <form
                    className="grid gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const file = fileRef.current?.files?.[0];
                      if (!file) {
                        setErr('Choose a file to attach');
                        return;
                      }
                      uploadAtt.mutate({
                        id: d.id,
                        file,
                        label: attachLabel.trim() || undefined,
                      });
                    }}
                  >
                    <label>
                      <span className="label">Label (optional)</span>
                      <input
                        className="input"
                        placeholder="e.g. ID proof, Agreement, Gate photo"
                        value={attachLabel}
                        onChange={(e) => setAttachLabel(e.target.value)}
                      />
                    </label>
                    <label>
                      <span className="label">File (image or PDF)</span>
                      <input
                        ref={fileRef}
                        className="input"
                        type="file"
                        accept="image/*,application/pdf"
                        required
                      />
                    </label>
                    <button type="submit" className="btn-primary justify-self-start">
                      Upload attachment
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              ...form,
              moverNotes: form.moverNotes || null,
              destinationFlatId:
                form.type === 'INTERNAL_SHIFT' ? form.destinationFlatId : null,
            };
            create.mutate(payload);
          }}
        >
          <FlatSearchSelect
            label={form.type === 'INTERNAL_SHIFT' ? 'Origin flat' : 'Flat'}
            value={form.flatId}
            required
            excludeIds={
              form.type === 'INTERNAL_SHIFT' && form.destinationFlatId
                ? [form.destinationFlatId]
                : []
            }
            onChange={(id) =>
              setForm({
                ...form,
                flatId: id,
                destinationFlatId:
                  form.destinationFlatId === id ? '' : form.destinationFlatId,
              })
            }
          />
          <label>
            <span className="label">Type</span>
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value,
                  destinationFlatId:
                    e.target.value === 'INTERNAL_SHIFT'
                      ? form.destinationFlatId
                      : '',
                })
              }
            >
              <option value="MOVE_IN">Move in</option>
              <option value="MOVE_OUT">Move out</option>
              <option value="INTERNAL_SHIFT">Internal shift</option>
            </select>
          </label>
          {form.type === 'INTERNAL_SHIFT' ? (
            <div className="md:col-span-2">
              <FlatSearchSelect
                label="Destination flat"
                value={form.destinationFlatId}
                required
                excludeIds={form.flatId ? [form.flatId] : []}
                onChange={(id) =>
                  setForm({ ...form, destinationFlatId: id })
                }
              />
            </div>
          ) : null}
          <label>
            <span className="label">Party</span>
            <select
              className="input"
              value={form.partyType}
              onChange={(e) => setForm({ ...form, partyType: e.target.value })}
            >
              <option value="OWNER">Owner</option>
              <option value="TENANT">Tenant</option>
            </select>
          </label>
          <label>
            <span className="label">Scheduled date</span>
            <input
              className="input"
              type="date"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm({ ...form, scheduledDate: e.target.value })
              }
              required
            />
          </label>
          <label>
            <span className="label">Contact name</span>
            <input
              className="input"
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
              required
            />
          </label>
          <label>
            <span className="label">Contact phone</span>
            <input
              className="input"
              value={form.contactPhone}
              onChange={(e) =>
                setForm({ ...form, contactPhone: e.target.value })
              }
              required
            />
          </label>
          <label className="md:col-span-2">
            <span className="label">Mover / vehicle notes</span>
            <input
              className="input"
              value={form.moverNotes}
              onChange={(e) =>
                setForm({ ...form, moverNotes: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">
              Submit
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {completeId ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            act.mutate({
              id: completeId,
              action: 'complete',
              body: {
                electricityMeter: handover.electricityMeter || null,
                waterMeter: handover.waterMeter || null,
                keysCount: handover.keysCount
                  ? Number(handover.keysCount)
                  : null,
                accessCardsCount: handover.accessCardsCount
                  ? Number(handover.accessCardsCount)
                  : null,
                parkingTagsCount: handover.parkingTagsCount
                  ? Number(handover.parkingTagsCount)
                  : null,
                notes: handover.notes || null,
              },
            });
          }}
        >
          <p className="md:col-span-3 font-semibold text-ink">
            Handover checklist
          </p>
          <label>
            <span className="label">Electricity meter</span>
            <input
              className="input"
              value={handover.electricityMeter}
              onChange={(e) =>
                setHandover({ ...handover, electricityMeter: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Water meter</span>
            <input
              className="input"
              value={handover.waterMeter}
              onChange={(e) =>
                setHandover({ ...handover, waterMeter: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Keys</span>
            <input
              className="input"
              type="number"
              value={handover.keysCount}
              onChange={(e) =>
                setHandover({ ...handover, keysCount: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Access cards</span>
            <input
              className="input"
              type="number"
              value={handover.accessCardsCount}
              onChange={(e) =>
                setHandover({ ...handover, accessCardsCount: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Parking tags</span>
            <input
              className="input"
              type="number"
              value={handover.parkingTagsCount}
              onChange={(e) =>
                setHandover({ ...handover, parkingTagsCount: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Notes</span>
            <input
              className="input"
              value={handover.notes}
              onChange={(e) =>
                setHandover({ ...handover, notes: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-3">
            <button type="submit" className="btn-primary">
              Complete move
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCompleteId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!isResident ? (
      <div className="panel mb-6">
        <h2 className="mb-3 text-base font-semibold text-ink">
          Today at the gate
        </h2>
        <p className="mb-3 text-xs text-muted">
          Approved and in-progress moves scheduled for today (campus date).
        </p>
        {today.isLoading ? (
          <p className="text-sm text-muted">Loading today’s moves…</p>
        ) : !today.data?.length ? (
          <p className="text-sm text-muted">No moves scheduled for today.</p>
        ) : (
          <div className="space-y-4">
            {today.data.map((m) => (
              <MoveRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
      ) : null}

      <div className="panel">
        <h2 className="mb-3 text-base font-semibold text-ink">All requests</h2>
        <QueryStatus query={list} empty="No move requests yet." />
        {list.data?.length ? (
          <div className="space-y-4">
            {list.data.map((m) => (
              <MoveRow key={m.id} m={m} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
