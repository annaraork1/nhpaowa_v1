import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TrashIcon, HomeModernIcon, CheckIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import {
  APARTMENT_CATALOG,
  APARTMENT_TYPES,
  TOWER_NUMBERS,
  configurationsForType,
  formatFlatLabel,
  formatFloorLabel,
  formatVariantLabel,
  parseFloorInput,
  FLAT_MEMBER_ROLES,
  flatMemberRoleLabel,
} from '@nhpaowa/shared-ui';
import { api, getAuthUser, getDevRole } from '../../inventory/api/client.js';
import { Can } from '../../inventory/auth/Can.jsx';
import { can } from '../../inventory/auth/permissions.js';
import { IconButton } from '../../inventory/components/IconButton.jsx';
import { RowActions } from '../../inventory/components/RowActions.jsx';
import { FlatHouseholdPanel } from '../components/FlatHouseholdPanel.jsx';
import { FlatHouseholdViewSection } from '../components/FlatHouseholdViewSection.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../../inventory/components/ResponsiveList.jsx';
import { EmptyState, PageHeader } from '../../inventory/components/ui.jsx';
import { AlertDialog } from '../../inventory/components/AlertDialog.jsx';
import { Modal } from '../../inventory/components/Modal.jsx';

const blankFlat = {
  tower: '1',
  flatNumber: '',
  floor: '',
  apartmentType: '2 BHK',
  configuration: 'Compact',
  parkingSlots: 1,
  occupancyStatus: 'VACANT',
  notes: '',
};

const blankMember = {
  role: 'PRIMARY_OWNER',
  name: '',
  phone: '',
  email: '',
};

const OCC = {
  OWNER_OCCUPIED: 'Owner occupied',
  TENANT_OCCUPIED: 'Tenant occupied',
  VACANT: 'Vacant',
};

export default function FlatsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filterTower, setFilterTower] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterOccupancy, setFilterOccupancy] = useState('');
  const [filterApartmentType, setFilterApartmentType] = useState('');
  const [pageOffset, setPageOffset] = useState(0);
  const pageSize = 50;
  const [form, setForm] = useState(blankFlat);
  const [memberForm, setMemberForm] = useState(blankMember);
  const [memberFlatId, setMemberFlatId] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [householdFlatId, setHouseholdFlatId] = useState(null);
  const [err, setErr] = useState('');
  const [flatFormErr, setFlatFormErr] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importConflicts, setImportConflicts] = useState([]);
  const [importResolutions, setImportResolutions] = useState({});
  const [importPreviewPending, setImportPreviewPending] = useState(false);
  const [importGuideOpen, setImportGuideOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [importApplying, setImportApplying] = useState(false);
  const [exportPdfOpen, setExportPdfOpen] = useState(false);
  const [exportPdfKind, setExportPdfKind] = useState('verification');
  const [exportPdfScope, setExportPdfScope] = useState('filters');
  const [exportPdfBusy, setExportPdfBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const allowed = can('flatOwners', 'view');
  const role = getAuthUser()?.role || getDevRole();
  const isStaff = role === 'SUPERADMIN' || role === 'SECRETARY';
  const isResident = role === 'RESIDENT';

  const listParams = useMemo(
    () => ({
      q: debouncedQ,
      tower: filterTower,
      floor: filterFloor === '' ? '' : filterFloor,
      occupancyStatus: filterOccupancy,
      apartmentType: filterApartmentType,
      limit: pageSize,
      offset: pageOffset,
    }),
    [
      debouncedQ,
      filterTower,
      filterFloor,
      filterOccupancy,
      filterApartmentType,
      pageOffset,
    ],
  );

  const filtersActive = Boolean(
    debouncedQ ||
      filterTower ||
      filterFloor !== '' ||
      filterOccupancy ||
      filterApartmentType ||
      q.trim(),
  );

  const catalog = useQuery({
    queryKey: ['apartment-catalog'],
    queryFn: api.association.catalog,
    enabled: allowed,
    staleTime: 60_000,
  });
  const list = useQuery({
    queryKey: ['flats', listParams],
    queryFn: () => api.association.flats.list(listParams),
    enabled: allowed,
  });
  const pendingAll = useQuery({
    queryKey: ['household-pending-all'],
    queryFn: () => api.association.household.pendingAll(),
    enabled: allowed && isStaff,
  });
  const csvGuide = useQuery({
    queryKey: ['flats-csv-guide'],
    queryFn: () => api.association.flats.csvGuide(),
    enabled: allowed && importOpen && !isResident,
    staleTime: 60_000,
  });

  const towers = catalog.data?.towers || TOWER_NUMBERS;
  const towerCatalog = catalog.data?.towerCatalog || [];
  const apartmentTypes = catalog.data?.apartmentTypes || APARTMENT_TYPES;
  const variants = catalog.data?.variants || APARTMENT_CATALOG;

  const filterFloorOptions = useMemo(() => {
    if (filterTower) {
      const meta = towerCatalog.find((t) => t.number === String(filterTower));
      return meta?.floors?.length ? meta.floors : [];
    }
    const set = new Set();
    towerCatalog.forEach((t) => {
      (t.floors || []).forEach((f) => set.add(f));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [filterTower, towerCatalog]);

  useEffect(() => {
    if (
      filterFloor !== '' &&
      filterFloorOptions.length &&
      !filterFloorOptions.includes(Number(filterFloor))
    ) {
      setFilterFloor('');
    }
  }, [filterFloor, filterFloorOptions]);

  useEffect(() => {
    setPageOffset(0);
  }, [debouncedQ, filterTower, filterFloor, filterOccupancy, filterApartmentType]);

  function clearFilters() {
    setQ('');
    setDebouncedQ('');
    setFilterTower('');
    setFilterFloor('');
    setFilterOccupancy('');
    setFilterApartmentType('');
    setPageOffset(0);
  }

  const flatsRows = list.data?.items || [];
  const flatsTotal = list.data?.total ?? 0;
  const pageEnd = Math.min(pageOffset + pageSize, flatsTotal);

  const selectedTowerMeta = useMemo(
    () => towerCatalog.find((t) => t.number === String(form.tower)) || null,
    [towerCatalog, form.tower],
  );

  const floorOptions = selectedTowerMeta?.floors || [];

  const configs = useMemo(() => {
    const locked = selectedTowerMeta?.defaultVariant;
    if (locked) {
      return variants.filter(
        (v) =>
          v.apartmentType === locked.apartmentType &&
          v.configuration === locked.configuration,
      );
    }
    const fromApi = variants.filter(
      (v) => v.apartmentType === form.apartmentType,
    );
    return fromApi.length
      ? fromApi
      : configurationsForType(form.apartmentType);
  }, [form.apartmentType, variants, selectedTowerMeta]);

  function applyTowerDefaults(towerNumber, prev = form) {
    const meta =
      towerCatalog.find((t) => t.number === String(towerNumber)) || null;
    const variant = meta?.defaultVariant;
    const floors = meta?.floors || [];
    let floor = prev.floor;
    if (floors.length && (floor === '' || !floors.includes(Number(floor)))) {
      floor = floors[0];
    }
    return {
      ...prev,
      tower: String(towerNumber),
      floor,
      apartmentType: variant?.apartmentType || prev.apartmentType,
      configuration: variant?.configuration || prev.configuration,
    };
  }

  const householdFlat = useMemo(
    () => flatsRows.find((f) => f.id === householdFlatId) || null,
    [flatsRows, householdFlatId]
  );
  const memberFlat = useMemo(
    () => flatsRows.find((f) => f.id === memberFlatId) || null,
    [flatsRows, memberFlatId]
  );

  const selectedVariant = configs.find(
    (c) => c.configuration === form.configuration
  );

  const save = useMutation({
    mutationFn: (body) =>
      editing
        ? api.association.flats.update(editing, body)
        : api.association.flats.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flats'] });
      setOpen(false);
      setEditing(null);
      setForm(blankFlat);
      setFlatFormErr('');
      setErr('');
    },
    onError: (e) => setFlatFormErr(e.message || 'Could not save flat'),
  });

  const remove = useMutation({
    mutationFn: api.association.flats.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flats'] }),
  });

  const addMember = useMutation({
    mutationFn: ({ flatId, body }) =>
      api.association.flats.addMember(flatId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flats'] });
      setMemberFlatId(null);
      setMemberForm(blankMember);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const removeMember = useMutation({
    mutationFn: api.association.flats.removeMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flats'] }),
  });

  const importCsv = useMutation({
    mutationFn: (payload) => api.association.flats.importCsv(payload),
    onSuccess: (result) => {
      setImportResult(result);
      setImportPreviewPending(false);
      if (result?.dryRun) {
        setImportConflicts(result.conflicts || []);
        const next = {};
        (result.conflicts || []).forEach((c) => {
          next[c.id] = importResolutions[c.id] || 'keep';
        });
        setImportResolutions(next);
        setImportSuccess('');
        setImportApplying(false);
      } else {
        setImportConflicts([]);
        setImportResolutions({});
        setImportApplying(false);
        setImportConfirmOpen(false);
        const msg =
          result?.message ||
          `Import complete: ${result?.created ?? 0} created, ${result?.updated ?? 0} updated`;
        setImportSuccess(msg);
        qc.invalidateQueries({ queryKey: ['flats'] });
        qc.invalidateQueries({ queryKey: ['household-pending-all'] });
      }
      setErr('');
    },
    onError: (e) => {
      setImportPreviewPending(false);
      setImportApplying(false);
      setErr(e.message);
    },
  });

  if (!allowed) {
    return <EmptyState message="You do not have permission to view flat owners." />;
  }

  function submitFlat(e) {
    e.preventDefault();
    setFlatFormErr('');
    save.mutate({
      tower: form.tower,
      flatNumber: form.flatNumber,
      floor: parseFloorInput(form.floor),
      apartmentType: form.apartmentType,
      configuration: form.configuration,
      parkingSlots: Number(form.parkingSlots) || 0,
      occupancyStatus: form.occupancyStatus,
      notes: form.notes || null,
    });
  }

  function onTypeChange(apartmentType) {
    const nextConfigs = variants.filter((v) => v.apartmentType === apartmentType);
    const first = nextConfigs[0] || configurationsForType(apartmentType)[0];
    setForm({
      ...form,
      apartmentType,
      configuration: first?.configuration || '',
    });
  }

  function renderFlatMembers(f) {
    return (
      <>
        {f.members?.length ? (
          <ul className="space-y-1">
            {f.members.map((m) => (
              <li key={m.id} className="text-ink">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted">
                  {' '}
                  · {flatMemberRoleLabel(m.role)} · {m.phone}
                </span>
                <Can resource="flatOwners" action="delete">
                  <IconButton
                    label="Remove member"
                    tone="danger"
                    className="ml-1 inline-flex"
                    onClick={() => {
                      if (confirm('Remove this member?')) {
                        removeMember.mutate(m.id);
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </IconButton>
                </Can>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">No members</span>
        )}
        {memberFlatId === f.id ? null : can('flatOwners', 'createEdit') ? (
          <button
            type="button"
            className="mt-1 text-xs font-medium text-brand"
            onClick={() => {
              setMemberFlatId(f.id);
              setMemberForm({
                ...blankMember,
                role: isResident ? 'ASSOCIATE_OWNER' : 'PRIMARY_OWNER',
              });
            }}
          >
            + Add member
          </button>
        ) : null}
      </>
    );
  }

  function renderFlatRowActions(f) {
    return (
      <RowActions
        resource="flatOwners"
        entityLabel={formatFlatLabel(f)}
        viewWide
        extras={
          <IconButton
            label="Household"
            tone="brand"
            onClick={() => setHouseholdFlatId(f.id)}
          >
            <HomeModernIcon className="h-5 w-5" />
          </IconButton>
        }
        onEdit={
          isResident
            ? undefined
            : () => {
                setEditing(f.id);
                setForm(
                  applyTowerDefaults(f.tower, {
                    ...blankFlat,
                    tower: f.tower,
                    flatNumber: f.flatNumber,
                    floor: f.floor ?? '',
                    apartmentType: f.apartmentType || '2 BHK',
                    configuration: f.configuration || 'Compact',
                    parkingSlots: f.parkingSlots,
                    occupancyStatus: f.occupancyStatus,
                    notes: f.notes || '',
                  }),
                );
                setFlatFormErr('');
                setOpen(true);
              }
        }
        onDelete={isResident ? undefined : () => remove.mutate(f.id)}
        deletePending={remove.isPending}
        viewContent={
          <div>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-muted">Flat</dt>
                <dd className="font-medium">{formatFlatLabel(f)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Type</dt>
                <dd>
                  {f.apartmentType} · {f.configuration}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Occupancy</dt>
                <dd>{OCC[f.occupancyStatus] || f.occupancyStatus}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Members</dt>
                <dd>
                  {(f.members || []).length
                    ? (f.members || [])
                        .map(
                          (m) =>
                            `${m.name} (${m.role.replace(/_/g, ' ').toLowerCase()})`
                        )
                        .join(', ')
                    : 'None'}
                </dd>
              </div>
            </dl>
            <FlatHouseholdViewSection flat={f} />
          </div>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={isResident ? 'My flat' : 'Flat owners'}
        subtitle={
          isResident
            ? 'Your linked tower unit — view details and submit household updates for approval'
            : 'Tower · flat register with NHPAOWA apartment types and owners'
        }
        actions={
          isResident ? null : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => api.association.flats.exportCsv()}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setExportPdfKind('verification');
                  setExportPdfScope(
                    filterTower ||
                      filterFloor !== '' ||
                      filterOccupancy ||
                      filterApartmentType
                      ? 'filters'
                      : 'all'
                  );
                  setExportPdfOpen(true);
                }}
              >
                Export PDF
              </button>
              <Can resource="flatOwners" action="createEdit">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => api.association.flats.csvTemplate()}
                >
                  CSV template
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setImportOpen(true);
                    setImportResult(null);
                    setImportText('');
                  }}
                >
                  Import CSV
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setForm(applyTowerDefaults('1', blankFlat));
                    setFlatFormErr('');
                    setOpen(true);
                  }}
                >
                  Add flat
                </button>
              </Can>
            </div>
          )
        }
      />

      {importOpen && !isResident ? (
        <div className="panel mb-6 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Import flats &amp; household CSV
              </h2>
              <p className="text-sm text-muted">
                One row per flat. Empty household columns leave existing data
                unchanged. Preview first, then Apply.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setImportOpen(false);
                setImportSuccess('');
                setImportConfirmOpen(false);
              }}
            >
              Close
            </button>
          </div>

          <div className="rounded-md border border-line bg-surface/40">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-ink"
              onClick={() => setImportGuideOpen((o) => !o)}
              aria-expanded={importGuideOpen}
            >
              <span>CSV format guide (columns, samples)</span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  importGuideOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>
            {importGuideOpen ? (
              <div className="border-t border-line px-3 pb-3 pt-2">
                {csvGuide.data ? (
                  <>
                    <p className="mb-2 text-sm text-muted">
                      {csvGuide.data.multiValueRule}
                    </p>
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full min-w-[40rem] text-left text-xs">
                        <thead className="sticky top-0 bg-surface text-muted">
                          <tr>
                            <th className="py-1 pr-2 font-medium">Column</th>
                            <th className="py-1 pr-2 font-medium">
                              Allowed / pattern
                            </th>
                            <th className="py-1 font-medium">Sample entry</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(csvGuide.data.columns || []).map((col) => (
                            <tr
                              key={col.key}
                              className="border-t border-line/60 align-top"
                            >
                              <td
                                className="py-1.5 pr-2 font-mono text-ink underline decoration-dotted decoration-muted underline-offset-2"
                                title={col.tip || col.sample}
                              >
                                {col.key}
                                {col.required ? ' *' : ''}
                              </td>
                              <td
                                className="py-1.5 pr-2 text-muted"
                                title={col.tip}
                              >
                                {col.pattern}
                                {col.allowed ? (
                                  <span className="mt-0.5 block text-[11px]">
                                    {col.allowed}
                                  </span>
                                ) : null}
                              </td>
                              <td
                                className="py-1.5 font-mono text-[11px] text-ink"
                                title={col.tip}
                              >
                                {col.sample || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Multi columns join records with <strong>|</strong> and
                      fields with <strong>:</strong>. Row starting with{' '}
                      <code className="rounded bg-surface px-1">#</code> is
                      skipped (template help row).
                    </p>
                  </>
                ) : csvGuide.isLoading ? (
                  <p className="text-sm text-muted">Loading column guide…</p>
                ) : (
                  <p className="text-sm text-muted">
                    Guide unavailable. Download the CSV template instead.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <input
            type="file"
            accept=".csv,text/csv"
            className="input max-w-md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                setImportText(String(reader.result || ''));
                setImportResult(null);
                setImportSuccess('');
                setImportConflicts([]);
                setImportPreviewPending(false);
              };
              reader.readAsText(file);
            }}
          />
          <textarea
            className="input min-h-[140px] font-mono text-xs"
            placeholder="Paste CSV here or choose a file…"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportResult(null);
              setImportConflicts([]);
              setImportPreviewPending(false);
              setImportSuccess('');
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={!importText.trim() || importCsv.isPending}
              onClick={() => {
                setImportPreviewPending(true);
                setImportSuccess('');
                importCsv.mutate({ csv: importText, dryRun: true });
              }}
            >
              {importCsv.isPending && importPreviewPending
                ? 'Previewing…'
                : 'Preview import'}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={
                !importText.trim() ||
                importCsv.isPending ||
                !importResult?.dryRun
              }
              onClick={() => setImportConfirmOpen(true)}
            >
              {importCsv.isPending && importApplying
                ? 'Applying…'
                : 'Apply import'}
            </button>
          </div>
          <p className="text-xs text-muted">
            Preview shows what will change in plain language. Differing values
            need Keep / Use CSV below before Apply.
          </p>

          {importSuccess ? (
            <div
              className="rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              role="status"
            >
              {importSuccess}
            </div>
          ) : null}

          {importConflicts.length ? (
            <div className="max-h-64 overflow-y-auto rounded border border-line">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="px-2 py-1">Flat</th>
                    <th className="px-2 py-1">Field</th>
                    <th className="px-2 py-1">Current</th>
                    <th className="px-2 py-1">CSV</th>
                    <th className="px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importConflicts.map((c) => (
                    <tr key={c.id} className="border-b border-line align-top">
                      <td className="px-2 py-1 font-medium">
                        {c.campusFlatId || `${c.tower}-${c.flatNumber}`}
                      </td>
                      <td className="px-2 py-1">{c.field}</td>
                      <td className="px-2 py-1 text-muted">{c.current}</td>
                      <td className="px-2 py-1 text-ink">{c.csv}</td>
                      <td className="px-2 py-1">
                        <select
                          className="input py-1 text-xs"
                          value={importResolutions[c.id] || 'keep'}
                          onChange={(e) =>
                            setImportResolutions((prev) => ({
                              ...prev,
                              [c.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="keep">Keep current</option>
                          <option value="csv">Use CSV</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {importResult?.dryRun ? (
            <div className="space-y-2 rounded-md border border-line bg-surface/30 p-3 text-sm">
              <p className="font-medium text-ink">
                {importResult.message ||
                  `Preview: ${(importResult.changes || []).length} flat(s) with changes`}
              </p>
              <p className="text-xs text-muted">
                Would create {importResult.created} · update{' '}
                {importResult.updated} · fill {importResult.filled ?? 0} · skip{' '}
                {importResult.skipped} · conflicts{' '}
                {(importResult.conflicts || []).length} · errors{' '}
                {(importResult.errors || []).length}
              </p>
              {(importResult.changes || []).length ? (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {(importResult.changes || []).map((ch) => (
                    <li
                      key={`${ch.row}-${ch.campusFlatId}`}
                      className="rounded border border-line/70 bg-panel px-2 py-1.5"
                    >
                      <p className="font-medium text-ink">
                        {ch.campusFlatId || `${ch.tower}-${ch.flatNumber}`}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {ch.kind === 'create' ? 'New flat' : 'Update'} · row{' '}
                          {ch.row}
                        </span>
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-muted">
                        {(ch.actions || []).map((a, i) => (
                          <li key={`${ch.row}-${i}`}>{a}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Nothing new to import — CSV matches existing data (or only
                  empty fields).
                </p>
              )}
              {(importResult.errors || []).length ? (
                <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-danger">
                  {importResult.errors.slice(0, 40).map((e, i) => (
                    <li key={`err-${e.row}-${i}`}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {importResult && !importResult.dryRun && !importSuccess ? (
            <div className="text-sm">
              <p className="font-medium text-ink">
                Created {importResult.created} · Updated {importResult.updated}{' '}
                · Filled {importResult.filled ?? 0} · Skipped{' '}
                {importResult.skipped} · Errors{' '}
                {(importResult.errors || []).length}
              </p>
              {(importResult.errors || []).length ? (
                <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-danger">
                  {importResult.errors.slice(0, 40).map((e, i) => (
                    <li key={`${e.row}-${i}`}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <AlertDialog
            open={importConfirmOpen}
            onOpenChange={setImportConfirmOpen}
            title="Apply CSV import?"
            description={
              importResult?.dryRun
                ? `This will apply ${(importResult.changes || []).length} flat change(s)` +
                  (importConflicts.length
                    ? ` and your Keep/Use CSV choices for ${importConflicts.length} conflict(s)`
                    : '') +
                  '. Continue?'
                : 'Apply the import now?'
            }
            confirmLabel="Apply import"
            confirmTone="brand"
            loading={importCsv.isPending && importApplying}
            onConfirm={() => {
              setImportApplying(true);
              setImportSuccess('');
              importCsv.mutate({
                csv: importText,
                dryRun: false,
                resolutions: importResolutions,
              });
            }}
          />
        </div>
      ) : null}

      {exportPdfOpen ? (
        <Modal
          title="Export flats PDF"
          onClose={() => !exportPdfBusy && setExportPdfOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-primary"
                disabled={exportPdfBusy}
                onClick={async () => {
                  setExportPdfBusy(true);
                  setErr('');
                  try {
                    const params = { kind: exportPdfKind };
                    if (exportPdfScope === 'filters') {
                      if (filterTower) params.tower = filterTower;
                      if (filterFloor !== '') params.floor = filterFloor;
                      if (filterOccupancy)
                        params.occupancyStatus = filterOccupancy;
                      if (filterApartmentType)
                        params.apartmentType = filterApartmentType;
                    }
                    await api.association.flats.exportPdf(params);
                    setExportPdfOpen(false);
                  } catch (e) {
                    setErr(e.message || 'PDF export failed');
                  } finally {
                    setExportPdfBusy(false);
                  }
                }}
              >
                {exportPdfBusy ? 'Generating…' : 'Download PDF'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={exportPdfBusy}
                onClick={() => setExportPdfOpen(false)}
              >
                Cancel
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <fieldset className="space-y-2">
              <legend className="label">Document type</legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="pdf-kind"
                  checked={exportPdfKind === 'verification'}
                  onChange={() => setExportPdfKind('verification')}
                />
                <span>
                  <span className="font-medium text-ink">
                    Verification walk sheet
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Landscape table with OK / By-date columns for door or tower
                    checks.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="pdf-kind"
                  checked={exportPdfKind === 'register'}
                  onChange={() => setExportPdfKind('register')}
                />
                <span>
                  <span className="font-medium text-ink">Master register</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Full household columns for office reference (no tick
                    columns).
                  </span>
                </span>
              </label>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="label">Which flats?</legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="pdf-scope"
                  checked={exportPdfScope === 'filters'}
                  onChange={() => setExportPdfScope('filters')}
                />
                <span>
                  <span className="font-medium text-ink">Current filters</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Tower / floor / occupancy / type as set above
                    {!filterTower &&
                    filterFloor === '' &&
                    !filterOccupancy &&
                    !filterApartmentType
                      ? ' (none set → all flats)'
                      : ''}
                    .
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="pdf-scope"
                  checked={exportPdfScope === 'all'}
                  onChange={() => setExportPdfScope('all')}
                />
                <span>
                  <span className="font-medium text-ink">All flats</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Ignore list filters and export the full register.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>
        </Modal>
      ) : null}

      {!isResident ? (
        <div className="panel mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="sm:col-span-2 lg:col-span-2">
            <span className="label">Search</span>
            <input
              className="input"
              placeholder="T21031, tower, owner, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q !== debouncedQ ? (
              <p className="mt-1 text-xs text-muted">Searching…</p>
            ) : debouncedQ &&
              !list.isFetching &&
              !list.isLoading &&
              flatsTotal === 0 ? (
              <p className="mt-1 text-xs text-danger">
                This flat is not in the register.
              </p>
            ) : null}
          </label>
          <label>
            <span className="label">Tower</span>
            <select
              className="input"
              value={filterTower}
              onChange={(e) => {
                setFilterTower(e.target.value);
                setFilterFloor('');
              }}
            >
              <option value="">All towers</option>
              {towers.map((t) => (
                <option key={t} value={t}>
                  Tower {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Floor</span>
            <select
              className="input"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
            >
              <option value="">All floors</option>
              {filterFloorOptions.map((f) => (
                <option key={f} value={f}>
                  {formatFloorLabel(f)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Occupancy</span>
            <select
              className="input"
              value={filterOccupancy}
              onChange={(e) => setFilterOccupancy(e.target.value)}
            >
              <option value="">All occupancy</option>
              {Object.entries(OCC).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Apartment type</span>
            <select
              className="input"
              value={filterApartmentType}
              onChange={(e) => setFilterApartmentType(e.target.value)}
            >
              <option value="">All types</option>
              {apartmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-6">
            <button
              type="button"
              className="btn-ghost"
              disabled={!filtersActive}
              onClick={clearFilters}
            >
              Clear filters
            </button>
            <p className="text-xs text-muted">
              {list.isFetching
                ? 'Updating…'
                : flatsTotal
                  ? `Showing ${pageOffset + 1}–${pageEnd} of ${flatsTotal}`
                  : '0 flats'}
            </p>
          </div>
        </div>
      ) : null}

      {err && !open ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      {isStaff ? (
        <div className="panel mb-6">
          <h2 className="mb-2 text-base font-semibold text-ink">
            Pending household approvals
          </h2>
          <p className="mb-3 text-sm text-muted">
            Resident submissions stay PENDING until you approve or reject.
            Staff creates are APPROVED immediately.
          </p>
          {(() => {
            const sections = [
              {
                key: 'vehicles',
                label: 'Vehicles',
                rows: pendingAll.data?.vehicles || [],
                approve: api.association.household.approveVehicle,
                reject: api.association.household.rejectVehicle,
                name: (r) => r.registrationNo,
              },
              {
                key: 'pets',
                label: 'Pets',
                rows: pendingAll.data?.pets || [],
                approve: api.association.household.approvePet,
                reject: api.association.household.rejectPet,
                name: (r) => r.name,
              },
              {
                key: 'contacts',
                label: 'Emergency',
                rows: pendingAll.data?.contacts || [],
                approve: api.association.household.approveEmergencyContact,
                reject: api.association.household.rejectEmergencyContact,
                name: (r) => r.name,
              },
              {
                key: 'devices',
                label: 'Access',
                rows: pendingAll.data?.devices || [],
                approve: api.association.household.approveAccessDevice,
                reject: api.association.household.rejectAccessDevice,
                name: (r) => r.identifier,
              },
            ];
            const total = sections.reduce((n, s) => n + s.rows.length, 0);
            if (pendingAll.isLoading) {
              return <p className="text-sm text-muted">Loading pending…</p>;
            }
            if (!total) {
              return (
                <p className="text-sm text-muted">No pending submissions.</p>
              );
            }
            return (
              <div className="space-y-4 text-sm">
                {sections.map((section) =>
                  section.rows.length ? (
                    <div key={section.key}>
                      <h3 className="mb-2 font-medium">{section.label}</h3>
                      <table className="w-full table-fixed text-left text-sm">
                        <colgroup>
                          <col className="w-[28%]" />
                          <col className="w-[52%]" />
                          <col className="w-[20%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-line text-muted">
                            <th className="px-2 py-1.5 font-medium">Flat</th>
                            <th className="px-2 py-1.5 font-medium">Detail</th>
                            <th className="px-2 py-1.5 text-right font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((r) => (
                            <tr
                              key={r.id}
                              className="border-b border-line align-middle"
                            >
                              <td className="px-2 py-2 font-medium text-ink">
                                {formatFlatLabel(r.flat)}
                              </td>
                              <td className="px-2 py-2 text-muted">
                                {section.name(r)}
                              </td>
                              <td className="whitespace-nowrap px-2 py-2 text-right">
                                <span className="inline-flex items-center justify-end gap-0.5">
                                  <IconButton
                                    label="Approve"
                                    tone="brand"
                                    onClick={() =>
                                      section
                                        .approve(r.id)
                                        .then(() =>
                                          qc.invalidateQueries({
                                            queryKey: [
                                              'household-pending-all',
                                            ],
                                          })
                                        )
                                        .catch((e) => setErr(e.message))
                                    }
                                  >
                                    <CheckIcon className="h-5 w-5" />
                                  </IconButton>
                                  <IconButton
                                    label="Reject"
                                    tone="danger"
                                    onClick={() => {
                                      const reason =
                                        prompt('Rejection reason') || '';
                                      section
                                        .reject(r.id, reason)
                                        .then(() =>
                                          qc.invalidateQueries({
                                            queryKey: [
                                              'household-pending-all',
                                            ],
                                          })
                                        )
                                        .catch((e) => setErr(e.message));
                                    }}
                                  >
                                    <XMarkIcon className="h-5 w-5" />
                                  </IconButton>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null
                )}
              </div>
            );
          })()}
        </div>
      ) : null}

      {open ? (
        <Modal
          title={editing ? 'Edit flat' : 'Add flat'}
          onClose={() => {
            setOpen(false);
            setEditing(null);
            setFlatFormErr('');
          }}
          wide
          footer={
            <>
              <button type="submit" form="flat-edit-form" className="btn-primary">
                {editing ? 'Save' : 'Create flat'}
              </button>
              {editing ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setHouseholdFlatId(editing);
                    setOpen(false);
                    setFlatFormErr('');
                  }}
                >
                  Edit household details
                </button>
              ) : null}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                  setFlatFormErr('');
                }}
              >
                Cancel
              </button>
            </>
          }
        >
          {flatFormErr ? (
            <p className="mb-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {flatFormErr}
            </p>
          ) : null}
          <form
            id="flat-edit-form"
            className="grid gap-3 md:grid-cols-3"
            onSubmit={submitFlat}
          >
            <label>
              <span className="label">Tower number</span>
              <select
                className="input"
                value={form.tower}
                onChange={(e) => setForm(applyTowerDefaults(e.target.value))}
                required
              >
                {towers.map((t) => {
                  const meta = towerCatalog.find((x) => x.number === String(t));
                  return (
                    <option key={t} value={t}>
                      Tower {t}
                      {meta?.floorGroup ? ` (${meta.floorGroup})` : ''}
                      {meta?.category ? ` · ${meta.category}` : ''}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              <span className="label">Flat number</span>
              <input
                className="input"
                value={form.flatNumber}
                onChange={(e) =>
                  setForm({ ...form, flatNumber: e.target.value })
                }
                placeholder="e.g. 001 (G), 031 (3rd), 101 (10th)"
                required
              />
              {selectedTowerMeta?.missingFlatNumbers?.length ? (
                <p className="mt-1 text-xs text-muted">
                  Excluded on this tower:{' '}
                  {selectedTowerMeta.missingFlatNumbers.join(', ')}
                </p>
              ) : null}
            </label>
            <label>
              <span className="label">Floor</span>
              <select
                className="input"
                value={form.floor === '' || form.floor === null ? '' : form.floor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    floor:
                      e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              >
                <option value="">Select floor…</option>
                {floorOptions.map((f) => (
                  <option key={f} value={f}>
                    {formatFloorLabel(f)}
                  </option>
                ))}
              </select>
              {selectedTowerMeta?.floorGroup ? (
                <p className="mt-1 text-xs text-muted">
                  {selectedTowerMeta.floorGroup} · G then 1–
                  {selectedTowerMeta.maxFloor}
                </p>
              ) : null}
            </label>
            <label>
              <span className="label">Apartment type</span>
              <select
                className="input"
                value={form.apartmentType}
                onChange={(e) => onTypeChange(e.target.value)}
                required
                disabled={Boolean(selectedTowerMeta?.defaultVariant)}
              >
                {apartmentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Configuration</span>
              <select
                className="input"
                value={form.configuration}
                onChange={(e) =>
                  setForm({ ...form, configuration: e.target.value })
                }
                required
                disabled={Boolean(selectedTowerMeta?.defaultVariant)}
              >
                {configs.map((c) => (
                  <option key={c.configuration} value={c.configuration}>
                    {c.configuration}
                    {c.areaLabel ? ` (${c.areaLabel})` : ''}
                  </option>
                ))}
              </select>
              {selectedTowerMeta?.category ? (
                <p className="mt-1 text-xs text-muted">
                  Fixed for Tower {form.tower}: {selectedTowerMeta.category}
                </p>
              ) : null}
            </label>
            <label>
              <span className="label">Super built-up area</span>
              <input
                className="input"
                readOnly
                value={
                  selectedVariant?.areaLabel ||
                  (selectedVariant?.superBuiltUpArea
                    ? `${selectedVariant.superBuiltUpArea} Sq. Ft.`
                    : '—')
                }
              />
            </label>
            <label>
              <span className="label">Parking slots</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.parkingSlots}
                onChange={(e) =>
                  setForm({ ...form, parkingSlots: e.target.value })
                }
              />
            </label>
            <label>
              <span className="label">Occupancy</span>
              <select
                className="input"
                value={form.occupancyStatus}
                onChange={(e) =>
                  setForm({ ...form, occupancyStatus: e.target.value })
                }
              >
                {Object.entries(OCC).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-3">
              <span className="label">Notes</span>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </form>
        </Modal>
      ) : null}

      {householdFlat ? (
        <Modal
          title={`Household — ${formatFlatLabel(householdFlat)}`}
          onClose={() => setHouseholdFlatId(null)}
          wide
        >
          <FlatHouseholdPanel
            flat={householdFlat}
            embedded
            onClose={() => setHouseholdFlatId(null)}
          />
        </Modal>
      ) : null}

      {memberFlat ? (
        <Modal
          title={`Add member — ${formatFlatLabel(memberFlat)}`}
          onClose={() => setMemberFlatId(null)}
          footer={
            <>
              <button
                type="submit"
                form="add-member-form"
                className="btn-primary"
              >
                Save member
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setMemberFlatId(null)}
              >
                Cancel
              </button>
            </>
          }
        >
          <form
            id="add-member-form"
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              addMember.mutate({
                flatId: memberFlat.id,
                body: {
                  ...memberForm,
                  email: memberForm.email || null,
                },
              });
            }}
          >
            <label>
              <span className="label">Role</span>
              <select
                className="input"
                value={memberForm.role}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    role: e.target.value,
                  })
                }
              >
                {FLAT_MEMBER_ROLES.filter((r) =>
                  isResident ? !r.staffOnly : true
                ).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Name</span>
              <input
                className="input"
                value={memberForm.name}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    name: e.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span className="label">Phone</span>
              <input
                className="input"
                value={memberForm.phone}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    phone: e.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              <span className="label">Email (optional)</span>
              <input
                className="input"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    email: e.target.value,
                  })
                }
              />
            </label>
          </form>
        </Modal>
      ) : null}

      {!flatsRows.length ? (
        <EmptyState
          message={
            filtersActive
              ? debouncedQ && flatsTotal === 0
                ? 'This flat is not in the register.'
                : 'No flats match your search or filters.'
              : 'No flats registered yet.'
          }
        />
      ) : (
        <div className="panel overflow-hidden p-0">
          <ResponsiveList
            className="p-3 md:p-0"
            mobile={flatsRows.map((f) => (
              <EntityCard
                key={f.id}
                title={formatFlatLabel(f)}
                subtitle={[
                  f.floor != null ? `Floor ${formatFloorLabel(f.floor)}` : null,
                  f.parkingSlots ? `${f.parkingSlots} parking` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                fields={[
                  { label: 'Type', value: formatVariantLabel(f) || '—' },
                  {
                    label: 'Occupancy',
                    value: OCC[f.occupancyStatus] || f.occupancyStatus,
                  },
                  {
                    label: 'Members',
                    value: renderFlatMembers(f),
                    span: 2,
                  },
                ]}
                actions={renderFlatRowActions(f)}
              />
            ))}
            desktop={
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[28%]" />
                    <col className="w-[14%]" />
                    <col className="w-[24%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="px-3 py-2 font-medium">Flat</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Occupancy</th>
                      <th className="px-3 py-2 font-medium">Members</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatsRows.map((f) => (
                      <tr key={f.id} className="border-b border-line align-middle">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-ink">
                            {formatFlatLabel(f)}
                          </p>
                          <p className="text-xs text-muted">
                            {[
                              f.floor != null
                                ? `Floor ${formatFloorLabel(f.floor)}`
                                : null,
                              f.parkingSlots
                                ? `${f.parkingSlots} parking`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-ink">
                          <p>{formatVariantLabel(f) || '—'}</p>
                        </td>
                        <td className="px-3 py-3 text-ink">
                          {OCC[f.occupancyStatus] || f.occupancyStatus}
                        </td>
                        <td className="px-3 py-3">{renderFlatMembers(f)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          {renderFlatRowActions(f)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
            <p className="text-xs text-muted">
              {pageOffset + 1}–{pageEnd} of {flatsTotal}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={pageOffset <= 0 || list.isFetching}
                onClick={() =>
                  setPageOffset((o) => Math.max(0, o - pageSize))
                }
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={pageEnd >= flatsTotal || list.isFetching}
                onClick={() => setPageOffset((o) => o + pageSize)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
