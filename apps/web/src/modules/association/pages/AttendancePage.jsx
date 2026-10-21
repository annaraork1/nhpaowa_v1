import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CameraIcon,
  NoSymbolIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  TOWER_NUMBERS,
  associationCalendarYmd,
  addCalendarDaysYmd,
} from '@nhpaowa/shared-ui';
import { api, mediaUrl } from '../../inventory/api/client.js';
import { Can } from '../../inventory/auth/Can.jsx';
import { can } from '../../inventory/auth/permissions.js';
import { IconButton } from '../../inventory/components/IconButton.jsx';
import { RowActions } from '../../inventory/components/RowActions.jsx';
import {
  EntityCard,
  ResponsiveList,
  StickyScrollTable,
  stickyColClass,
} from '../../inventory/components/ResponsiveList.jsx';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';

const blankStaff = {
  name: '',
  category: 'SECURITY',
  phone: '',
  tower: '',
  designation: '',
  photoUrl: '',
};

function staffInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function StaffPhotoPreview({ staff, onClose, onChangePhoto, canChange }) {
  if (!staff?.photoUrl) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${staff.name || 'Staff'} photo`}
        className="relative w-full max-w-sm rounded-xl bg-panel p-3 shadow-lg sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink">
            {staff.name || 'Staff photo'}
          </p>
          <IconButton label="Close photo" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </div>
        <img
          src={mediaUrl(staff.photoUrl)}
          alt={staff.name || 'Staff'}
          className="mx-auto max-h-[70vh] w-full rounded-lg object-contain bg-surface"
        />
        {canChange && onChangePhoto ? (
          <button
            type="button"
            className="btn-ghost mt-3 w-full text-sm"
            onClick={onChangePhoto}
          >
            Change photo
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StaffPhoto({
  staff,
  size = 'md',
  editable = false,
  onPick,
  uploading = false,
}) {
  const inputRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const sizeClass =
    size === 'lg'
      ? 'h-16 w-16 text-base'
      : size === 'sm'
        ? 'h-9 w-9 text-[10px]'
        : 'h-12 w-12 text-xs sm:h-14 sm:w-14 sm:text-sm';

  const hasPhoto = Boolean(staff?.photoUrl);

  const avatar = hasPhoto ? (
    <img
      src={mediaUrl(staff.photoUrl)}
      alt={staff.name || 'Staff'}
      className={`${sizeClass} rounded-full object-cover border border-line bg-surface`}
    />
  ) : (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full border border-line bg-brand/10 font-semibold text-brand`}
      aria-hidden
    >
      {staff?.name ? (
        staffInitials(staff.name)
      ) : (
        <UserCircleIcon className="h-2/3 w-2/3 text-brand/70" />
      )}
    </div>
  );

  function openPicker() {
    if (!editable || uploading) return;
    inputRef.current?.click();
  }

  return (
    <div className="relative shrink-0">
      {hasPhoto ? (
        <button
          type="button"
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          title={`View ${staff.name || 'staff'} photo`}
          onClick={() => setPreviewOpen(true)}
        >
          {avatar}
        </button>
      ) : (
        avatar
      )}

      {editable ? (
        <button
          type="button"
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-panel text-ink shadow-sm hover:bg-brand hover:text-white disabled:opacity-50"
          title={hasPhoto ? 'Change photo' : 'Add photo'}
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <CameraIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick?.(file);
        }}
      />

      {previewOpen ? (
        <StaffPhotoPreview
          staff={staff}
          onClose={() => setPreviewOpen(false)}
          canChange={editable}
          onChangePhoto={() => {
            setPreviewOpen(false);
            openPicker();
          }}
        />
      ) : null}
    </div>
  );
}

const blankCategory = { code: '', label: '', sortOrder: 100, active: true };

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'SICK', label: 'Sick' },
  { value: 'EARNED', label: 'Earned' },
  { value: 'WEEK_OFF', label: 'Week off' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'OTHER', label: 'Other' },
];

function dateInputValue(d = new Date()) {
  return associationCalendarYmd(d);
}

function daysAgo(n) {
  return addCalendarDaysYmd(associationCalendarYmd(), -n);
}

const blankLeave = {
  staffId: '',
  startDate: dateInputValue(),
  endDate: dateInputValue(),
  leaveType: 'CASUAL',
  reason: '',
};

export default function AttendancePage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('roster');
  const [staffForm, setStaffForm] = useState(blankStaff);
  const [catForm, setCatForm] = useState(blankCategory);
  const [editingCat, setEditingCat] = useState(null);
  const [openStaff, setOpenStaff] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [leaveForm, setLeaveForm] = useState(blankLeave);
  const [openLeave, setOpenLeave] = useState(false);
  const [histFrom, setHistFrom] = useState(daysAgo(6));
  const [histTo, setHistTo] = useState(dateInputValue());
  const [err, setErr] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const allowed = can('attendance', 'view');
  const canEdit = can('attendance', 'createEdit');

  const categories = useQuery({
    queryKey: ['staff-categories', tab === 'categories'],
    queryFn: () =>
      api.association.staff.categories.list(tab === 'categories'),
    enabled: allowed,
  });

  const staff = useQuery({
    queryKey: ['assoc-staff'],
    queryFn: () => api.association.staff.list(true),
    enabled: allowed,
  });
  const today = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.association.attendance.list({}),
    enabled: allowed,
    refetchInterval: 30000,
  });
  const dayState = useQuery({
    queryKey: ['attendance-day-state'],
    queryFn: () => api.association.attendance.dayState({}),
    enabled: allowed,
    refetchInterval: 15000,
  });
  const summary = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: () => api.association.attendance.summary({}),
    enabled: allowed,
    refetchInterval: 30000,
  });
  const history = useQuery({
    queryKey: ['attendance-history', histFrom, histTo],
    queryFn: () =>
      api.association.attendance.history({ from: histFrom, to: histTo }),
    enabled: allowed && tab === 'history',
  });
  const leaves = useQuery({
    queryKey: ['staff-leave', histFrom, histTo],
    queryFn: () =>
      api.association.leave.list({ from: histFrom, to: histTo }),
    enabled: allowed && tab === 'leave',
  });

  function invalidateAttendance() {
    qc.invalidateQueries({ queryKey: ['attendance-today'] });
    qc.invalidateQueries({ queryKey: ['attendance-day-state'] });
    qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    qc.invalidateQueries({ queryKey: ['attendance-history'] });
    qc.invalidateQueries({ queryKey: ['staff-leave'] });
  }

  const saveStaff = useMutation({
    mutationFn: api.association.staff.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assoc-staff'] });
      setStaffForm(blankStaff);
      setOpenStaff(false);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const updateStaffPhoto = useMutation({
    mutationFn: ({ id, photoUrl }) =>
      api.association.staff.update(id, { photoUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assoc-staff'] });
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  async function uploadStaffPhoto(file, { forForm = false, staffId = null } = {}) {
    if (!file) return;
    setPhotoUploading(true);
    setErr('');
    try {
      const res = await api.association.staff.uploadPhoto(file);
      if (forForm) {
        setStaffForm((prev) => ({ ...prev, photoUrl: res.url }));
      } else if (staffId) {
        await updateStaffPhoto.mutateAsync({ id: staffId, photoUrl: res.url });
      }
    } catch (e) {
      setErr(e.message || 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
    }
  }

  const saveCat = useMutation({
    mutationFn: (body) =>
      editingCat
        ? api.association.staff.categories.update(editingCat, body)
        : api.association.staff.categories.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-categories'] });
      setOpenCat(false);
      setEditingCat(null);
      setCatForm(blankCategory);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const removeCat = useMutation({
    mutationFn: api.association.staff.categories.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-categories'] }),
    onError: (e) => setErr(e.message),
  });

  const importCsv = useMutation({
    mutationFn: (csv) => api.association.staff.importCsv(csv),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['assoc-staff'] });
      const errN = result.errors?.length || 0;
      setImportMsg(
        `Imported ${result.created} staff` +
          (result.skipped ? `, skipped ${result.skipped}` : '') +
          (errN ? `, ${errN} row error(s)` : '')
      );
      if (errN) {
        setErr(
          result.errors
            .slice(0, 5)
            .map((e) => `Row ${e.row}: ${e.message}`)
            .join('; ')
        );
      } else {
        setErr('');
      }
    },
    onError: (e) => setErr(e.message),
  });

  const checkIn = useMutation({
    mutationFn: (staffId) => api.association.attendance.checkIn({ staffId }),
    onSuccess: () => {
      invalidateAttendance();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const checkOut = useMutation({
    mutationFn: ({ id, at }) =>
      api.association.attendance.checkOut(id, at ? { at } : {}),
    onSuccess: () => {
      invalidateAttendance();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const markAbsent = useMutation({
    mutationFn: (staffId) =>
      api.association.attendance.markAbsent({ staffId }),
    onSuccess: () => {
      invalidateAttendance();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const clearAbsent = useMutation({
    mutationFn: (staffId) =>
      api.association.attendance.clearAbsent({ staffId }),
    onSuccess: () => {
      invalidateAttendance();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const saveLeave = useMutation({
    mutationFn: api.association.leave.create,
    onSuccess: () => {
      invalidateAttendance();
      setOpenLeave(false);
      setLeaveForm(blankLeave);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const cancelLeave = useMutation({
    mutationFn: api.association.leave.cancel,
    onSuccess: () => invalidateAttendance(),
    onError: (e) => setErr(e.message),
  });

  if (!allowed) {
    return (
      <EmptyState message="You do not have permission to view attendance." />
    );
  }

  const openByStaff = new Map(
    (today.data || [])
      .filter((e) => !e.checkOutAt)
      .map((e) => [e.staffId, e])
  );
  const stateByStaff = new Map(
    (dayState.data?.states || []).map((s) => [s.staffId, s])
  );
  const punchBusy =
    checkIn.isPending ||
    checkOut.isPending ||
    markAbsent.isPending ||
    clearAbsent.isPending;

  const catOptions = (categories.data || []).filter((c) => c.active !== false);
  const labelFor = (code) =>
    (categories.data || []).find((c) => c.code === code)?.label || code;

  function onPickCsv(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importCsv.mutate(String(reader.result || ''));
    reader.readAsText(file);
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function fmtHours(h) {
    if (h === null || h === undefined || h === '') return '—';
    const n = Number(h);
    if (Number.isNaN(n)) return '—';
    return `${n.toFixed(2)} h`;
  }

  function staffStateLabel(st) {
    const stateLabel = {
      NOT_IN: 'Not in',
      IN: 'In',
      DONE: 'Done',
      ON_LEAVE: 'On leave',
      ABSENT: 'Absent',
    }[st.state] || st.state;
    let text = stateLabel;
    if (st.state === 'IN' && st.checkInAt) {
      text += ` · in ${fmtTime(st.checkInAt)}`;
      if (st.hours != null) text += ` · ${fmtHours(st.hours)} so far`;
    }
    if (st.state === 'DONE' && st.checkInAt && st.checkOutAt) {
      text += ` · in ${fmtTime(st.checkInAt)} · out ${fmtTime(st.checkOutAt)}`;
      if (st.hours != null) text += ` · ${fmtHours(st.hours)}`;
    } else if (st.state === 'DONE' && st.checkOutAt) {
      text += ` · out ${fmtTime(st.checkOutAt)}`;
      if (st.hours != null) text += ` · ${fmtHours(st.hours)}`;
    }
    if (st.state === 'ON_LEAVE' && st.leaveType) {
      text += ` · ${st.leaveType}`;
    }
    return text;
  }

  function shiftDetailFields(st) {
    if (st.state === 'DONE' && (st.checkInAt || st.checkOutAt)) {
      return [
        { label: 'Check in', value: fmtTime(st.checkInAt) },
        { label: 'Check out', value: fmtTime(st.checkOutAt) },
        { label: 'Hours worked', value: fmtHours(st.hours), span: 2 },
      ];
    }
    if (st.state === 'IN' && st.checkInAt) {
      return [
        { label: 'Check in', value: fmtTime(st.checkInAt) },
        { label: 'Elapsed', value: fmtHours(st.hours) },
      ];
    }
    return [];
  }

  function renderTodayPunch(s, st) {
    return (
      <Can resource="attendance" action="createEdit">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {st.state === 'IN' && st.entryId ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              disabled={punchBusy || st.canCheckOut === false}
              title={
                st.canCheckOut === false
                  ? 'Wait at least 30 seconds after check-in'
                  : 'Check out'
              }
              onClick={() => checkOut.mutate({ id: st.entryId })}
            >
              Check out
            </button>
          ) : null}
          {st.state === 'NOT_IN' ? (
            <>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={punchBusy}
                onClick={() => checkIn.mutate(s.id)}
              >
                Check in
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={punchBusy}
                onClick={() => markAbsent.mutate(s.id)}
              >
                Mark absent
              </button>
            </>
          ) : null}
          {st.state === 'ABSENT' ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              disabled={punchBusy}
              onClick={() => clearAbsent.mutate(s.id)}
            >
              Clear absent
            </button>
          ) : null}
          {st.state === 'DONE' ? (
            <span className="text-[11px] text-muted">
              Shift complete
              {st.hours != null ? ` · ${fmtHours(st.hours)}` : ''}
            </span>
          ) : null}
        </div>
      </Can>
    );
  }

  function staffDayState(s) {
    return (
      stateByStaff.get(s.id) || {
        state: openByStaff.has(s.id) ? 'IN' : 'NOT_IN',
        entryId: openByStaff.get(s.id)?.id,
        checkInAt: openByStaff.get(s.id)?.checkInAt,
        canCheckOut: true,
      }
    );
  }

  return (
    <div>
      <PageHeader
        title="Staff attendance"
        subtitle="One check-in/out per staff per day · Mark absent for no-shows · Leave & history for payroll"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                api.association.attendance.exportPayrollCsv({
                  from: histFrom,
                  to: histTo,
                })
              }
            >
              Export payroll CSV
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => api.association.attendance.exportCsv({})}
            >
              Export clock CSV
            </button>
            <Can resource="attendance" action="createEdit">
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => api.association.staff.downloadTemplate()}
                >
                  Staff CSV template
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={importCsv.isPending}
                >
                  Import staff CSV
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    onPickCsv(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {tab === 'categories' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setEditingCat(null);
                      setCatForm(blankCategory);
                      setOpenCat(true);
                    }}
                  >
                    Add category
                  </button>
                ) : tab === 'leave' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setLeaveForm({
                        ...blankLeave,
                        staffId: staff.data?.[0]?.id || '',
                      });
                      setOpenLeave(true);
                    }}
                  >
                    Record leave
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setStaffForm({
                        ...blankStaff,
                        category: catOptions[0]?.code || 'SECURITY',
                      });
                      setOpenStaff(true);
                    }}
                  >
                    Add staff
                  </button>
                )}
              </>
            </Can>
          </div>
        }
      />

      {summary.data?.today ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Active roster', value: summary.data.rosterActive },
            { label: 'Present today', value: summary.data.today.present },
            { label: 'On leave today', value: summary.data.today.onLeave },
            { label: 'Marked absent', value: summary.data.today.absent },
            { label: 'Open check-ins', value: summary.data.today.openCheckIns },
          ].map((k) => (
            <div key={k.label} className="panel px-4 py-3">
              <p className="text-xs text-muted">{k.label}</p>
              <p className="text-2xl font-semibold text-ink">{k.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={tab === 'roster' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('roster')}
        >
          Roster
        </button>
        <button
          type="button"
          className={tab === 'history' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('history')}
        >
          History
        </button>
        <button
          type="button"
          className={tab === 'leave' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('leave')}
        >
          Leave
        </button>
        <button
          type="button"
          className={tab === 'categories' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('categories')}
        >
          Staff categories
        </button>
      </div>

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}
      {importMsg ? <p className="mb-3 text-sm text-muted">{importMsg}</p> : null}

      {openCat && canEdit && tab === 'categories' ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveCat.mutate({
              ...catForm,
              code:
                catForm.code ||
                catForm.label.toUpperCase().replace(/[\s-]+/g, '_'),
              sortOrder: Number(catForm.sortOrder) || 100,
            });
          }}
        >
          <label>
            <span className="label">Label</span>
            <input
              className="input"
              value={catForm.label}
              onChange={(e) => setCatForm({ ...catForm, label: e.target.value })}
              placeholder="e.g. Waste / STP"
              required
            />
          </label>
          <label>
            <span className="label">Code</span>
            <input
              className="input"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
              placeholder="WASTE_MGMT"
              disabled={Boolean(editingCat)}
            />
          </label>
          <label>
            <span className="label">Sort order</span>
            <input
              className="input"
              type="number"
              value={catForm.sortOrder}
              onChange={(e) =>
                setCatForm({ ...catForm, sortOrder: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={catForm.active}
              onChange={(e) =>
                setCatForm({ ...catForm, active: e.target.checked })
              }
            />
            Active
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">
              {editingCat ? 'Save category' : 'Create category'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenCat(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {openStaff && canEdit && tab === 'roster' ? (
        <form
          className="panel mb-6 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveStaff.mutate({
              name: staffForm.name,
              category: staffForm.category,
              phone: staffForm.phone || null,
              tower: staffForm.tower || null,
              designation: staffForm.designation || null,
              photoUrl: staffForm.photoUrl || null,
            });
          }}
        >
          <label className="md:col-span-2">
            <span className="label">Photo</span>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <StaffPhoto
                staff={{ name: staffForm.name, photoUrl: staffForm.photoUrl }}
                size="lg"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="input"
                  onChange={(e) => {
                    uploadStaffPhoto(e.target.files?.[0], { forForm: true });
                    e.target.value = '';
                  }}
                />
                <p className="text-xs text-muted">
                  Optional · JPG/PNG · helps recognize staff at check-in
                  {photoUploading ? ' · Uploading…' : ''}
                </p>
                {staffForm.photoUrl ? (
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1 text-xs"
                    onClick={() =>
                      setStaffForm((prev) => ({ ...prev, photoUrl: '' }))
                    }
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </label>
          <label>
            <span className="label">Name</span>
            <input
              className="input"
              value={staffForm.name}
              onChange={(e) =>
                setStaffForm({ ...staffForm, name: e.target.value })
              }
              required
            />
          </label>
          <label>
            <span className="label">Category</span>
            <select
              className="input"
              value={staffForm.category}
              onChange={(e) =>
                setStaffForm({ ...staffForm, category: e.target.value })
              }
            >
              {catOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Phone</span>
            <input
              className="input"
              value={staffForm.phone}
              onChange={(e) =>
                setStaffForm({ ...staffForm, phone: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Tower (optional)</span>
            <select
              className="input"
              value={staffForm.tower}
              onChange={(e) =>
                setStaffForm({ ...staffForm, tower: e.target.value })
              }
            >
              <option value="">Campus-wide / none</option>
              {TOWER_NUMBERS.map((t) => (
                <option key={t} value={t}>
                  Tower {t}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="label">Designation / post</span>
            <input
              className="input"
              placeholder="e.g. Main Gate, Tower Lobby, Clubhouse Desk"
              value={staffForm.designation}
              onChange={(e) =>
                setStaffForm({ ...staffForm, designation: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={saveStaff.isPending || photoUploading}
            >
              Save
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenStaff(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'categories' ? (
        <div className="panel p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={(categories.data || []).map((c) => (
              <EntityCard
                key={c.id || c.code}
                title={c.label}
                subtitle={c.code}
                fields={[
                  { label: 'Order', value: c.sortOrder },
                  { label: 'Active', value: c.active ? 'Yes' : 'No' },
                ]}
                actions={
                  c.id && canEdit ? (
                    <RowActions
                      resource="attendance"
                      entityLabel={c.label}
                      viewWide
                      onEdit={() => {
                        setEditingCat(c.id);
                        setCatForm({
                          code: c.code,
                          label: c.label,
                          sortOrder: c.sortOrder,
                          active: c.active,
                        });
                        setOpenCat(true);
                      }}
                      onDeactivate={() => removeCat.mutate(c.id)}
                      deactivatePending={removeCat.isPending}
                      viewContent={
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-muted">Label</dt>
                            <dd className="font-medium">{c.label}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Code</dt>
                            <dd>{c.code}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Order</dt>
                            <dd>{c.sortOrder}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Active</dt>
                            <dd>{c.active ? 'Yes' : 'No'}</dd>
                          </div>
                        </dl>
                      }
                    />
                  ) : (
                    <span className="text-xs text-muted">Seed defaults</span>
                  )
                }
              />
            ))}
            desktop={
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(categories.data || []).map((c) => (
                      <tr
                        key={c.id || c.code}
                        className="border-b border-border/60"
                      >
                        <td className="px-3 py-2">{c.sortOrder}</td>
                        <td className="px-3 py-2 font-medium">{c.label}</td>
                        <td className="px-3 py-2">{c.code}</td>
                        <td className="px-3 py-2">{c.active ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 text-right">
                          {c.id && canEdit ? (
                            <RowActions
                              resource="attendance"
                              entityLabel={c.label}
                              onEdit={() => {
                                setEditingCat(c.id);
                                setCatForm({
                                  code: c.code,
                                  label: c.label,
                                  sortOrder: c.sortOrder,
                                  active: c.active,
                                });
                                setOpenCat(true);
                              }}
                              onDeactivate={() => removeCat.mutate(c.id)}
                              deactivatePending={removeCat.isPending}
                              viewContent={
                                <dl className="space-y-2">
                                  <div>
                                    <dt className="text-xs text-muted">Label</dt>
                                    <dd className="font-medium">{c.label}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Code</dt>
                                    <dd>{c.code}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Order</dt>
                                    <dd>{c.sortOrder}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted">Active</dt>
                                    <dd>{c.active ? 'Yes' : 'No'}</dd>
                                  </div>
                                </dl>
                              }
                            />
                          ) : (
                            <span className="text-xs text-muted">
                              Seed defaults
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />
        </div>
      ) : null}

      {tab === 'roster' ? (
        <div className="panel mb-6 p-0">
          <h2 className="mb-3 px-3 pt-3 text-sm font-semibold md:px-4 md:pt-4">
            Staff roster
          </h2>
          {!staff.isLoading && !(staff.data || []).length ? (
            <EmptyState message="No staff yet — add one or import CSV." />
          ) : (staff.data || []).length ? (
            <ResponsiveList
              className="px-3 pb-3 md:p-0 md:pb-0"
              mobile={(staff.data || []).map((s) => {
                const st = staffDayState(s);
                return (
                  <EntityCard
                    key={s.id}
                    avatar={
                      <StaffPhoto
                        staff={s}
                        size="md"
                        editable={canEdit}
                        uploading={photoUploading || updateStaffPhoto.isPending}
                        onPick={(file) =>
                          uploadStaffPhoto(file, { staffId: s.id })
                        }
                      />
                    }
                    title={s.name}
                    subtitle={labelFor(s.category)}
                    badge={
                      <span
                        className="text-xs font-medium text-ink"
                        title={staffStateLabel(st)}
                      >
                        {staffStateLabel(st)}
                      </span>
                    }
                    fields={[
                      { label: 'Tower', value: s.tower || '—' },
                      { label: 'Post', value: s.designation || '—' },
                      { label: 'Phone', value: s.phone || '—' },
                      ...shiftDetailFields(st),
                    ]}
                    actions={renderTodayPunch(s, st)}
                  />
                );
              })}
              desktop={
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="px-3 py-2">Staff</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Tower</th>
                        <th className="px-3 py-2">Post</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(staff.data || []).map((s) => {
                        const st = staffDayState(s);

                        return (
                          <tr key={s.id} className="border-b border-border/60">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-3">
                                <StaffPhoto
                                  staff={s}
                                  size="sm"
                                  editable={canEdit}
                                  uploading={
                                    photoUploading || updateStaffPhoto.isPending
                                  }
                                  onPick={(file) =>
                                    uploadStaffPhoto(file, { staffId: s.id })
                                  }
                                />
                                <span className="font-medium">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">{labelFor(s.category)}</td>
                            <td className="px-3 py-2">{s.tower || '—'}</td>
                            <td className="px-3 py-2">{s.designation || '—'}</td>
                            <td className="px-3 py-2">{s.phone || '—'}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="text-xs font-medium text-ink"
                                  title={staffStateLabel(st)}
                                >
                                  {staffStateLabel(st)}
                                </span>
                                {renderTodayPunch(s, st)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              }
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="panel">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label>
              <span className="label">From</span>
              <input
                type="date"
                className="input"
                value={histFrom}
                onChange={(e) => setHistFrom(e.target.value)}
              />
            </label>
            <label>
              <span className="label">To</span>
              <input
                type="date"
                className="input"
                value={histTo}
                onChange={(e) => setHistTo(e.target.value)}
              />
            </label>
            {(history.data?.rows || []).length ? (
              <p className="text-sm text-muted">
                Range staff-days — Present{' '}
                {
                  history.data.rows.filter((r) => r.status === 'PRESENT').length
                }
                , On leave{' '}
                {
                  history.data.rows.filter((r) => r.status === 'ON_LEAVE')
                    .length
                }
                , Absent{' '}
                {
                  history.data.rows.filter((r) => r.status === 'ABSENT').length
                }
              </p>
            ) : null}
          </div>
          <StickyScrollTable>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className={`px-3 py-2 ${stickyColClass}`}>Date</th>
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Check in</th>
                  <th className="px-3 py-2">Check out</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2">Leave type</th>
                </tr>
              </thead>
              <tbody>
                {(history.data?.rows || []).map((r) => (
                  <tr
                    key={`${r.staffId}-${r.date}`}
                    className="border-b border-border/60"
                  >
                    <td className={`px-3 py-2 ${stickyColClass}`}>{r.date}</td>
                    <td className="px-3 py-2 font-medium">{r.staffName}</td>
                    <td className="px-3 py-2">{labelFor(r.category)}</td>
                    <td className="px-3 py-2">{r.status.replace('_', ' ')}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.status === 'PRESENT' ? fmtTime(r.checkInAt) : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.status === 'PRESENT' ? fmtTime(r.checkOutAt) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === 'PRESENT' ? fmtHours(r.hours) : '—'}
                    </td>
                    <td className="px-3 py-2">{r.leaveType || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StickyScrollTable>
          {!history.isLoading && !(history.data?.rows || []).length ? (
            <EmptyState message="No history rows for this range." />
          ) : null}
        </div>
      ) : null}

      {tab === 'leave' ? (
        <div>
          {openLeave && canEdit ? (
            <form
              className="panel mb-6 grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveLeave.mutate({
                  ...leaveForm,
                  reason: leaveForm.reason || null,
                });
              }}
            >
              <label>
                <span className="label">Staff</span>
                <select
                  className="input"
                  value={leaveForm.staffId}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, staffId: e.target.value })
                  }
                  required
                >
                  <option value="">Select…</option>
                  {(staff.data || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Leave type</span>
                <select
                  className="input"
                  value={leaveForm.leaveType}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, leaveType: e.target.value })
                  }
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Start</span>
                <input
                  type="date"
                  className="input"
                  value={leaveForm.startDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, startDate: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span className="label">End</span>
                <input
                  type="date"
                  className="input"
                  value={leaveForm.endDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, endDate: e.target.value })
                  }
                  required
                />
              </label>
              <label className="md:col-span-2">
                <span className="label">Reason</span>
                <input
                  className="input"
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button type="submit" className="btn-primary">
                  Save leave
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setOpenLeave(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
          <div className="panel p-0">
            <div className="mb-3 flex flex-wrap gap-3 p-3 md:p-4 md:pb-0">
              <label>
                <span className="label">From</span>
                <input
                  type="date"
                  className="input"
                  value={histFrom}
                  onChange={(e) => setHistFrom(e.target.value)}
                />
              </label>
              <label>
                <span className="label">To</span>
                <input
                  type="date"
                  className="input"
                  value={histTo}
                  onChange={(e) => setHistTo(e.target.value)}
                />
              </label>
            </div>
            {!leaves.isLoading && !(leaves.data || []).length ? (
              <EmptyState message="No leave records in this range." />
            ) : (leaves.data || []).length ? (
              <ResponsiveList
                className="p-3 pt-0 md:p-0"
                mobile={(leaves.data || []).map((l) => (
                  <EntityCard
                    key={l.id}
                    title={l.staff?.name}
                    subtitle={l.leaveType}
                    badge={l.status}
                    fields={[
                      {
                        label: 'From',
                        value: String(l.startDate).slice(0, 10),
                      },
                      {
                        label: 'To',
                        value: String(l.endDate).slice(0, 10),
                      },
                      { label: 'Reason', value: l.reason || '—', span: 2 },
                    ]}
                    actions={
                      l.status === 'APPROVED' && canEdit ? (
                        <IconButton
                          label="Cancel leave"
                          tone="danger"
                          onClick={() => cancelLeave.mutate(l.id)}
                          disabled={cancelLeave.isPending}
                        >
                          <NoSymbolIcon className="h-5 w-5" />
                        </IconButton>
                      ) : null
                    }
                  />
                ))}
                desktop={
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted">
                          <th className="px-3 py-2">Staff</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">From</th>
                          <th className="px-3 py-2">To</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(leaves.data || []).map((l) => (
                          <tr key={l.id} className="border-b border-border/60">
                            <td className="px-3 py-2 font-medium">
                              {l.staff?.name}
                            </td>
                            <td className="px-3 py-2">{l.leaveType}</td>
                            <td className="px-3 py-2">
                              {String(l.startDate).slice(0, 10)}
                            </td>
                            <td className="px-3 py-2">
                              {String(l.endDate).slice(0, 10)}
                            </td>
                            <td className="px-3 py-2">{l.status}</td>
                            <td className="px-3 py-2">{l.reason || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              {l.status === 'APPROVED' && canEdit ? (
                                <IconButton
                                  label="Cancel leave"
                                  tone="danger"
                                  onClick={() => cancelLeave.mutate(l.id)}
                                  disabled={cancelLeave.isPending}
                                >
                                  <NoSymbolIcon className="h-5 w-5" />
                                </IconButton>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
