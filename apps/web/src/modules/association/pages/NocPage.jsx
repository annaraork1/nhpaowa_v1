import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckBadgeIcon,
  NoSymbolIcon,
  PaperClipIcon,
  PrinterIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatFlatLabel } from '@nhpaowa/shared-ui';
import { api, mediaUrl, getAuthUser } from '../../inventory/api/client.js';
import { can } from '../../inventory/auth/permissions.js';
import { IconButton } from '../../inventory/components/IconButton.jsx';
import {
  EmptyState,
  PageHeader,
  QueryStatus,
  pendingLabel,
} from '../../inventory/components/ui.jsx';
import { ASSOCIATION_BRAND, getBoardMembers, getPresident } from '../brand.js';
import { FlatSearchSelect } from '../components/FlatSearchSelect.jsx';

const PURPOSES = {
  SALE_TRANSFER: 'Sale / transfer',
  BANK_LOAN: 'Bank loan',
  RENTAL: 'Rental',
  RENOVATION: 'Renovation',
  OTHER: 'Other',
};

const blank = {
  flatId: '',
  purpose: 'SALE_TRANSFER',
  applicantName: '',
  applicantPhone: '',
  notes: '',
  duesCleared: false,
};

export default function NocPage() {
  const qc = useQueryClient();
  const printRef = useRef(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [printNoc, setPrintNoc] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [err, setErr] = useState('');
  const [letterhead, setLetterhead] = useState(null);
  const [attachNocId, setAttachNocId] = useState(null);
  const [attachLabel, setAttachLabel] = useState('');

  const allowed = can('noc', 'view');
  const canCreate = can('noc', 'createEdit');
  const role = getAuthUser()?.role;
  const isResident = role === 'RESIDENT';
  const canWorkflow =
    role === 'SUPERADMIN' || role === 'SECRETARY' || role === 'TREASURER';

  const list = useQuery({
    queryKey: ['noc', statusFilter],
    queryFn: () =>
      api.association.noc.list(statusFilter ? { status: statusFilter } : {}),
    enabled: allowed,
  });

  const myFlats = useQuery({
    queryKey: ['flats-for-noc'],
    queryFn: () => api.association.flats.list({ limit: 1 }),
    enabled: allowed && isResident,
  });

  const create = useMutation({
    mutationFn: api.association.noc.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['noc'] });
      setOpen(false);
      setForm(blank);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const act = useMutation({
    mutationFn: ({ id, action, body }) => api.association.noc[action](id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['noc'] }),
    onError: (e) => setErr(e.message),
  });

  const uploadAtt = useMutation({
    mutationFn: ({ id, file, label }) =>
      api.association.noc.uploadAttachment(id, file, label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['noc'] });
      setAttachLabel('');
      setAttachNocId(null);
      if (fileRef.current) fileRef.current.value = '';
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const removeAtt = useMutation({
    mutationFn: ({ id, attachmentId }) =>
      api.association.noc.removeAttachment(id, attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['noc'] }),
    onError: (e) => setErr(e.message),
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view NOC requests." />;
  }

  function printLetter(noc) {
    setPrintNoc(noc);
    api.association.board
      .letterhead()
      .then(setLetterhead)
      .catch(() => setLetterhead(null))
      .finally(() => {
        setTimeout(() => {
          const w = window.open('', '_blank');
          if (!w || !printRef.current) return;
          w.document.write(
            `<html><head><title>NOC</title><style>
          body{font-family:Georgia,serif;padding:28px;color:#111;line-height:1.5}
          .letterhead{text-align:center;margin-bottom:12px}
          .letterhead img.logo{width:88px;height:auto;margin:0 auto 8px;display:block}
          .brand{color:#5b2d8e;font-family:Arial,sans-serif;font-weight:700;font-size:14px;margin:0}
          .campus{color:#555;font-size:11px;font-family:Arial,sans-serif;margin:2px 0 8px}
          .rule{border:none;border-top:1.5px solid #5b2d8e;margin:8px 0 16px}
          .layout{display:flex;gap:12px;align-items:flex-start}
          .board{width:118px;flex-shrink:0;font-family:Arial,sans-serif;font-size:10px}
          .board h3{color:#5b2d8e;font-size:9px;letter-spacing:.04em;margin:0 0 6px}
          .board .role{font-weight:700;margin:0;font-size:9px}
          .board .name{margin:0 0 6px;color:#222;font-size:10px}
          .main{flex:1;min-width:0;border-left:1px solid #d4c4e8;padding-left:12px}
          h1{font-size:18px;margin:0 0 4px;text-align:center}
          .muted{color:#555;font-size:13px}
          .box{border:1px solid #ccc;padding:20px;margin-top:12px}
          .sig{margin-top:36px;text-align:right}
          .sig img{width:150px;height:auto;display:inline-block}
          .sig .line{border-top:1px solid #333;width:170px;margin:4px 0 4px auto}
          .sig .who{font-family:Arial,sans-serif;font-size:12px;font-weight:700;margin:0}
          .sig .role{font-family:Arial,sans-serif;font-size:11px;color:#444;margin:0}
          @media print{button{display:none}}
        </style></head><body>${printRef.current.innerHTML}</body></html>`
          );
          w.document.close();
          w.focus();
          w.print();
        }, 80);
      });
  }

  return (
    <div>
      <PageHeader
        title={isResident ? 'My NOC requests' : 'NOC certificates'}
        subtitle={
          isResident
            ? 'Request a No Objection Certificate for your linked flat'
            : 'No Objection Certificates for sale, loan, rental, and renovation'
        }
        actions={
          canCreate ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const first = (myFlats.data?.items || [])[0];
                setForm({
                  ...blank,
                  flatId: isResident && first ? first.id : '',
                  applicantName: isResident
                    ? getAuthUser()?.name || ''
                    : '',
                });
                setOpen(true);
              }}
            >
              {isResident ? 'Request NOC' : 'New NOC request'}
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex gap-2">
        <select
          className="input max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ISSUED', 'REJECTED', 'CANCELLED'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
      </div>

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      {open ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              ...form,
              applicantPhone: form.applicantPhone || null,
              notes: form.notes || null,
            });
          }}
        >
          <FlatSearchSelect
            label="Flat"
            value={form.flatId}
            required
            onChange={(id) => setForm({ ...form, flatId: id })}
          />
          <label>
            <span className="label">Purpose</span>
            <select
              className="input"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            >
              {Object.entries(PURPOSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Applicant name</span>
            <input
              className="input"
              value={form.applicantName}
              onChange={(e) =>
                setForm({ ...form, applicantName: e.target.value })
              }
              required
            />
          </label>
          <label>
            <span className="label">Phone</span>
            <input
              className="input"
              value={form.applicantPhone}
              onChange={(e) =>
                setForm({ ...form, applicantPhone: e.target.value })
              }
            />
          </label>
          <label className="md:col-span-2">
            <span className="label">Notes</span>
            <input
              className="input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.duesCleared}
              onChange={(e) =>
                setForm({ ...form, duesCleared: e.target.checked })
              }
            />
            Maintenance dues cleared
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={create.isPending}
            >
              {pendingLabel(create.isPending, 'Submit', 'Submitting…')}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={create.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <QueryStatus query={list} empty="No NOC requests yet." />
      {list.data?.length ? (
        <div className="panel space-y-4">
          {list.data.map((n) => (
            <div
              key={n.id}
              className="space-y-3 border-b border-line pb-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {formatFlatLabel(n.flat)} ·{' '}
                  {PURPOSES[n.purpose] || n.purpose}
                </p>
                <p className="text-sm text-muted">
                  {n.applicantName}
                  {n.applicantPhone ? ` · ${n.applicantPhone}` : ''} ·{' '}
                  <span className="font-medium text-ink">{n.status}</span>
                  {n.attachments?.length ? (
                    <span>
                      {' '}
                      · {n.attachments.length} file
                      {n.attachments.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </p>
                {n.notes ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="text-muted">Notes:</span> {n.notes}
                  </p>
                ) : null}
                {n.rejectionReason ? (
                  <p className="text-sm text-danger">{n.rejectionReason}</p>
                ) : null}
              </div>
              <div className="inline-flex flex-wrap items-center justify-end gap-0.5">
                {n.status === 'ISSUED' ? (
                  <IconButton label="Print" onClick={() => printLetter(n)}>
                    <PrinterIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {canCreate ? (
                  <IconButton
                    label="Attach file"
                    onClick={() => {
                      setAttachNocId(n.id);
                      setAttachLabel('');
                    }}
                  >
                    <PaperClipIcon className="h-5 w-5" />
                  </IconButton>
                ) : null}
                {canWorkflow ? (
                  <>
                  {['SUBMITTED', 'UNDER_REVIEW', 'DRAFT'].includes(n.status) ? (
                    <>
                      <IconButton
                        label="Issue"
                        tone="brand"
                        onClick={() =>
                          act.mutate({
                            id: n.id,
                            action: 'issue',
                            body: { duesCleared: true },
                          })
                        }
                      >
                        <CheckBadgeIcon className="h-5 w-5" />
                      </IconButton>
                      <IconButton
                        label="Reject"
                        tone="danger"
                        onClick={() => {
                          const reason = prompt('Rejection reason');
                          if (reason)
                            act.mutate({
                              id: n.id,
                              action: 'reject',
                              body: { reason },
                            });
                        }}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </IconButton>
                      <IconButton
                        label="Cancel"
                        tone="danger"
                        onClick={() =>
                          act.mutate({ id: n.id, action: 'cancel', body: {} })
                        }
                      >
                        <NoSymbolIcon className="h-5 w-5" />
                      </IconButton>
                    </>
                  ) : null}
                  </>
                ) : null}
              </div>
              </div>
              {(n.attachments || []).length ? (
                <ul className="space-y-1 text-sm">
                  {n.attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <a
                        className="font-medium text-brand underline"
                        href={mediaUrl(a.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.label || a.originalName}
                      </a>
                      {canCreate ? (
                        <IconButton
                          label="Remove attachment"
                          tone="danger"
                          onClick={() =>
                            removeAtt.mutate({
                              id: n.id,
                              attachmentId: a.id,
                            })
                          }
                        >
                          <TrashIcon className="h-4 w-4" />
                        </IconButton>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No attachments yet.</p>
              )}
              {attachNocId === n.id && canCreate ? (
                <form
                  className="grid gap-2 md:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const file = fileRef.current?.files?.[0];
                    if (!file) {
                      setErr('Choose a file to attach');
                      return;
                    }
                    uploadAtt.mutate({
                      id: n.id,
                      file,
                      label: attachLabel.trim() || undefined,
                    });
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="input md:col-span-2"
                    required
                  />
                  <input
                    className="input"
                    placeholder="Label (optional)"
                    value={attachLabel}
                    onChange={(e) => setAttachLabel(e.target.value)}
                  />
                  <button type="submit" className="btn-primary">
                    Upload
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setAttachNocId(null)}
                  >
                    Cancel
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="hidden" ref={printRef}>
        {printNoc ? (
          <div>
            <div className="letterhead">
              <img
                className="logo"
                src={`${window.location.origin}${ASSOCIATION_BRAND.logoSrc}`}
                alt="NHPAOWA"
              />
              <p className="brand">{ASSOCIATION_BRAND.shortName}</p>
              <p className="campus">
                {ASSOCIATION_BRAND.fullName}
                <br />
                {ASSOCIATION_BRAND.campus} · {ASSOCIATION_BRAND.tagline}
              </p>
            </div>
            <hr className="rule" />
            <div className="layout">
              <aside className="board">
                <h3>BOARD MEMBERS</h3>
                {getBoardMembers(letterhead).map((m) => (
                  <div key={`${m.role}-${m.name}`}>
                    <p className="role">{m.role}</p>
                    <p className="name">{m.name}</p>
                  </div>
                ))}
              </aside>
              <div className="main">
                <h1>No Objection Certificate</h1>
                <p className="muted" style={{ textAlign: 'center' }}>
                  Issued{' '}
                  {printNoc.issuedAt
                    ? new Date(printNoc.issuedAt).toLocaleDateString('en-IN')
                    : '—'}
                </p>
                <div className="box">
                  <p>
                    This is to certify that the association has no objection to
                    the following request for flat{' '}
                    <strong>{formatFlatLabel(printNoc.flat)}</strong>.
                  </p>
                  <p>
                    <strong>Purpose:</strong>{' '}
                    {PURPOSES[printNoc.purpose] || printNoc.purpose}
                  </p>
                  <p>
                    <strong>Applicant:</strong> {printNoc.applicantName}
                  </p>
                  {printNoc.notes ? (
                    <p>
                      <strong>Notes:</strong> {printNoc.notes}
                    </p>
                  ) : null}
                  <p>
                    <strong>Dues cleared:</strong>{' '}
                    {printNoc.duesCleared ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Issued by:</strong>{' '}
                    {printNoc.issuedByName || 'Secretary'}
                  </p>
                  <div className="sig">
                    <img
                      src={`${window.location.origin}${ASSOCIATION_BRAND.signatureSrc}`}
                      alt="President signature"
                    />
                    <div className="line" />
                    <p className="who">{getPresident(letterhead).name}</p>
                    <p className="role">
                      {getPresident(letterhead).role || 'President'},{' '}
                      {ASSOCIATION_BRAND.shortName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
