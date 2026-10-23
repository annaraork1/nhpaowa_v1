import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { busApi } from '../api.js';
import { can } from '../../inventory/auth/permissions.js';
import {
  EmptyState,
  PageHeader,
  QueryStatus,
} from '../../inventory/components/ui.jsx';

const blankSchool = {
  name: '',
  primaryContactName: '',
  primaryContactPhone: '',
  address: '',
};
const blankBus = {
  schoolId: '',
  vehicleRegistrationNumber: '',
  driverName: '',
  driverPhone: '',
  conductorName: '',
  conductorPhone: '',
  seatingCapacity: '',
};

export default function SchoolsBusesPage() {
  const qc = useQueryClient();
  const allowed = can('schoolBusAdmin', 'view');
  const canEdit = can('schoolBusAdmin', 'createEdit');
  const [tab, setTab] = useState('schools');
  const [schoolForm, setSchoolForm] = useState(blankSchool);
  const [busForm, setBusForm] = useState(blankBus);
  const [openSchool, setOpenSchool] = useState(false);
  const [openBus, setOpenBus] = useState(false);
  const [err, setErr] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [busy, setBusy] = useState('');

  const schools = useQuery({
    queryKey: ['bus-schools'],
    queryFn: () => busApi.schools.list(false),
    enabled: allowed,
  });
  const buses = useQuery({
    queryKey: ['bus-vehicles'],
    queryFn: () => busApi.buses.list({ activeOnly: 'false' }),
    enabled: allowed,
  });

  const saveSchool = useMutation({
    mutationFn: busApi.schools.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-schools'] });
      setOpenSchool(false);
      setSchoolForm(blankSchool);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const saveBus = useMutation({
    mutationFn: (body) =>
      busApi.buses.create({
        ...body,
        seatingCapacity: body.seatingCapacity
          ? Number(body.seatingCapacity)
          : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-vehicles'] });
      setOpenBus(false);
      setBusForm(blankBus);
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  async function runFile(name, fn) {
    setBusy(name);
    setErr('');
    setImportMsg('');
    try {
      await fn();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  function onImportFile(kind, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(`import-${kind}`);
      setErr('');
      setImportMsg('');
      try {
        const csv = String(reader.result || '');
        const result =
          kind === 'schools'
            ? await busApi.schools.importCsv(csv)
            : await busApi.buses.importCsv(csv);
        setImportMsg(
          `${kind}: created ${result.created}, updated ${result.updated}` +
            (result.errors?.length ? `, ${result.errors.length} row error(s)` : '')
        );
        qc.invalidateQueries({ queryKey: ['bus-schools'] });
        qc.invalidateQueries({ queryKey: ['bus-vehicles'] });
      } catch (e) {
        setErr(e.message);
      } finally {
        setBusy('');
      }
    };
    reader.readAsText(file);
  }

  if (!allowed) {
    return <EmptyState message="You do not have permission to view school buses." />;
  }

  return (
    <div>
      <PageHeader
        title="Schools & buses"
        subtitle="Recurring school vehicles — not one-off visitors"
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setOpenSchool(true);
                  setTab('schools');
                }}
              >
                Add school
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setBusForm({
                    ...blankBus,
                    schoolId: schools.data?.[0]?.id || '',
                  });
                  setOpenBus(true);
                  setTab('buses');
                }}
              >
                Add bus
              </button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => runFile('s-tpl', busApi.schools.csvTemplate)}
        >
          School CSV template
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => runFile('s-exp', busApi.schools.exportCsv)}
        >
          Export schools CSV
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => runFile('b-tpl', busApi.buses.csvTemplate)}
        >
          Bus CSV template
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => runFile('b-exp', busApi.buses.exportCsv)}
        >
          Export buses CSV
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => runFile('pdf', busApi.registry.exportPdf)}
        >
          {busy === 'pdf' ? '…' : 'Download PDF'}
        </button>
        {canEdit ? (
          <>
            <label className="btn-ghost cursor-pointer">
              Import schools CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={Boolean(busy)}
                onChange={(e) => {
                  onImportFile('schools', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="btn-ghost cursor-pointer">
              Import buses CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={Boolean(busy)}
                onChange={(e) => {
                  onImportFile('buses', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={tab === 'schools' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('schools')}
        >
          Schools
        </button>
        <button
          type="button"
          className={tab === 'buses' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('buses')}
        >
          Buses
        </button>
      </div>

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}
      {importMsg ? <p className="mb-3 text-sm text-muted">{importMsg}</p> : null}

      {openSchool && canEdit ? (
        <form
          className="panel mb-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveSchool.mutate(schoolForm);
          }}
        >
          <label>
            <span className="label">School name</span>
            <input
              className="input"
              required
              value={schoolForm.name}
              onChange={(e) =>
                setSchoolForm({ ...schoolForm, name: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Primary contact</span>
            <input
              className="input"
              required
              value={schoolForm.primaryContactName}
              onChange={(e) =>
                setSchoolForm({
                  ...schoolForm,
                  primaryContactName: e.target.value,
                })
              }
            />
          </label>
          <label>
            <span className="label">Contact phone</span>
            <input
              className="input"
              required
              value={schoolForm.primaryContactPhone}
              onChange={(e) =>
                setSchoolForm({
                  ...schoolForm,
                  primaryContactPhone: e.target.value,
                })
              }
            />
          </label>
          <label>
            <span className="label">Address (optional)</span>
            <input
              className="input"
              value={schoolForm.address}
              onChange={(e) =>
                setSchoolForm({ ...schoolForm, address: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">
              Save school
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenSchool(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {openBus && canEdit ? (
        <form
          className="panel mb-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveBus.mutate(busForm);
          }}
        >
          <label>
            <span className="label">School</span>
            <select
              className="input"
              required
              value={busForm.schoolId}
              onChange={(e) =>
                setBusForm({ ...busForm, schoolId: e.target.value })
              }
            >
              <option value="">Select…</option>
              {(schools.data || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Vehicle registration</span>
            <input
              className="input"
              required
              value={busForm.vehicleRegistrationNumber}
              onChange={(e) =>
                setBusForm({
                  ...busForm,
                  vehicleRegistrationNumber: e.target.value,
                })
              }
            />
          </label>
          <label>
            <span className="label">Driver name</span>
            <input
              className="input"
              required
              value={busForm.driverName}
              onChange={(e) =>
                setBusForm({ ...busForm, driverName: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Driver phone</span>
            <input
              className="input"
              required
              value={busForm.driverPhone}
              onChange={(e) =>
                setBusForm({ ...busForm, driverPhone: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Conductor name</span>
            <input
              className="input"
              value={busForm.conductorName}
              onChange={(e) =>
                setBusForm({ ...busForm, conductorName: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Conductor phone</span>
            <input
              className="input"
              value={busForm.conductorPhone}
              onChange={(e) =>
                setBusForm({ ...busForm, conductorPhone: e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Seating capacity</span>
            <input
              className="input"
              type="number"
              min="1"
              value={busForm.seatingCapacity}
              onChange={(e) =>
                setBusForm({ ...busForm, seatingCapacity: e.target.value })
              }
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">
              Save bus
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpenBus(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'schools' ? (
        <>
          <QueryStatus query={schools} empty="No schools yet." />
          {schools.data?.length ? (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.data.map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2">{s.primaryContactName}</td>
                      <td className="px-3 py-2">{s.primaryContactPhone}</td>
                      <td className="px-3 py-2">{s.active ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <QueryStatus query={buses} empty="No buses yet." />
          {buses.data?.length ? (
            <div className="panel overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">School</th>
                    <th className="px-3 py-2">Driver</th>
                    <th className="px-3 py-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.data.map((b) => (
                    <tr key={b.id} className="border-b border-border/60">
                      <td className="px-3 py-2 font-medium">
                        {b.vehicleRegistrationNumber}
                      </td>
                      <td className="px-3 py-2">{b.school?.name}</td>
                      <td className="px-3 py-2">{b.driverName}</td>
                      <td className="px-3 py-2">{b.driverPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
