import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  formatCampusFlatId,
  parseCampusFlatQuery,
} from '@nhpaowa/shared-ui';

const INV =
  import.meta.env.VITE_INVENTORY_BASE_URL || '/api/inventory';

function initialTowerNumber(params) {
  const id =
    params.get('towerNumber') ||
    params.get('id') ||
    params.get('campus');
  if (id) return String(id).trim();
  const tower = params.get('tower');
  const flatNumber = params.get('flatNumber');
  const flat = params.get('flat');
  if (tower && flatNumber) return `${Number(tower)}${String(flatNumber).trim()}`;
  if (tower && flat && /^\d{3}$/.test(String(flat).trim())) {
    return `${Number(tower)}${String(flat).trim()}`;
  }
  if (flat && parseCampusFlatQuery(flat)) return String(flat).trim();
  if (tower && flat) {
    const combined = `${tower}${flat}`;
    if (parseCampusFlatQuery(combined)) return combined;
  }
  return flat ? String(flat).trim() : '';
}

async function publicPost(path, body) {
  const res = await fetch(`${INV}/public/flat-update${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export default function FlatUpdatePage() {
  const [params] = useSearchParams();
  const kiosk = params.get('kiosk') === '1' || params.get('kiosk') === 'true';
  const [towerNumber, setTowerNumber] = useState(() =>
    initialTowerNumber(params)
  );
  const [token, setToken] = useState('');
  const [flatInfo, setFlatInfo] = useState(null);
  const [form, setForm] = useState({
    occupancyStatus: 'OWNER_OCCUPIED',
    primaryName: '',
    primaryPhone: '',
    secondaryName: '',
    secondaryPhone: '',
    tenantName: '',
    tenantPhone: '',
    notes: '',
  });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const step = useMemo(() => {
    if (ok) return 'done';
    if (token) return 'form';
    return 'verify';
  }, [token, ok]);

  const inputClass = kiosk ? 'input text-xl py-3' : 'input text-lg';
  const btnClass = kiosk
    ? 'btn-primary w-full py-4 text-lg'
    : 'btn-primary w-full py-3 text-base';

  const preview = useMemo(() => {
    const p = parseCampusFlatQuery(towerNumber);
    if (!p) return null;
    return formatCampusFlatId(p.tower, p.flatNumber);
  }, [towerNumber]);

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const data = await publicPost('/verify', {
        towerNumber: towerNumber.trim(),
      });
      setToken(data.token);
      setFlatInfo(data.flat);
      const f = data.flat || {};
      setForm({
        occupancyStatus: f.occupancyStatus || 'OWNER_OCCUPIED',
        primaryName: f.primaryName || '',
        primaryPhone: f.primaryPhone || '',
        secondaryName: f.secondaryName || '',
        secondaryPhone: f.secondaryPhone || '',
        tenantName: f.tenantName || '',
        tenantPhone: f.tenantPhone || '',
        notes: f.notes || '',
      });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (
        form.occupancyStatus === 'TENANT_OCCUPIED' &&
        (!form.tenantName.trim() || !form.tenantPhone.trim())
      ) {
        throw new Error('Tenant name and phone are required');
      }
      const secN = form.secondaryName.trim();
      const secP = form.secondaryPhone.trim();
      if ((secN && !secP) || (!secN && secP)) {
        throw new Error(
          'Secondary owner needs both name and phone, or leave both blank'
        );
      }
      await publicPost('/submit', {
        token,
        occupancyStatus: form.occupancyStatus,
        primaryName: form.primaryName.trim(),
        primaryPhone: form.primaryPhone.trim(),
        secondaryName: secN || null,
        secondaryPhone: secP || null,
        tenantName: form.tenantName.trim() || null,
        tenantPhone: form.tenantPhone.trim() || null,
        notes: form.notes.trim() || null,
      });
      setOk('Thank you. Your update was sent to the association for review.');
      setToken('');
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-[#f3eef5] to-[#faf7fb] px-4 text-ink ${
        kiosk ? 'py-6' : 'py-8'
      }`}
    >
      <div className={`mx-auto ${kiosk ? 'max-w-xl' : 'max-w-lg'}`}>
        {kiosk ? (
          <p className="mb-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand">
            Kiosk mode — staff can type while the resident speaks
          </p>
        ) : null}
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          NHPAOWA
        </p>
        <h1 className={`${kiosk ? 'text-3xl' : 'text-2xl'} mt-1 font-bold`}>
          Update your flat details
        </h1>
        <p className="mt-2 text-sm text-muted">
          No login needed. Enter your tower number (e.g.{' '}
          <span className="font-medium text-ink">21031</span> or{' '}
          <span className="font-medium text-ink">T21031</span>).
        </p>

        {err ? (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {err}
          </p>
        ) : null}

        {step === 'verify' ? (
          <form
            className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm"
            onSubmit={verify}
          >
            <label className="block">
              <span className="label">Tower number</span>
              <input
                className={`${inputClass} tracking-wide`}
                required
                inputMode="text"
                autoComplete="off"
                value={towerNumber}
                onChange={(e) =>
                  setTowerNumber(e.target.value.replace(/\s+/g, '').toUpperCase())
                }
                placeholder="21031 or T21031"
              />
              {preview ? (
                <span className="mt-1 block text-xs text-muted">
                  Recognized as {preview}
                </span>
              ) : towerNumber.trim() ? (
                <span className="mt-1 block text-xs text-danger">
                  Use full tower number, e.g. 21031 (tower 21, flat 031)
                </span>
              ) : null}
            </label>
            <button type="submit" className={btnClass} disabled={busy || !preview}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        ) : null}

        {step === 'form' && flatInfo ? (
          <form
            className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm"
            onSubmit={submit}
          >
            <p className="text-sm font-medium">
              Tower number{' '}
              {flatInfo.towerNumber ||
                flatInfo.campusFlatId ||
                formatCampusFlatId(flatInfo.tower, flatInfo.flatNumber)}
            </p>
            {flatInfo.hasExisting ? (
              <p className="rounded-lg border border-brand/25 bg-brand/5 px-3 py-2 text-sm text-ink">
                Existing details are filled in below. Confirm or correct them —
                only change what is missing or wrong, then submit.
              </p>
            ) : (
              <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
                No contacts on file yet for this flat. Please enter the details
                below.
              </p>
            )}
            <label className="block">
              <span className="label">Who lives here?</span>
              <select
                className={inputClass}
                value={form.occupancyStatus}
                onChange={(e) =>
                  setForm({ ...form, occupancyStatus: e.target.value })
                }
              >
                <option value="OWNER_OCCUPIED">Owner occupied</option>
                <option value="TENANT_OCCUPIED">Tenant occupied</option>
                <option value="VACANT">Vacant</option>
              </select>
            </label>

            {form.occupancyStatus === 'TENANT_OCCUPIED' ? (
              <fieldset className="space-y-3 rounded-xl border border-line/80 p-3">
                <legend className="px-1 text-sm font-semibold">Tenant</legend>
                <label className="block">
                  <span className="label">Tenant name</span>
                  <input
                    className={inputClass}
                    required
                    value={form.tenantName}
                    onChange={(e) =>
                      setForm({ ...form, tenantName: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  <span className="label">Tenant phone</span>
                  <input
                    className={inputClass}
                    required
                    inputMode="tel"
                    value={form.tenantPhone}
                    onChange={(e) =>
                      setForm({ ...form, tenantPhone: e.target.value })
                    }
                  />
                </label>
              </fieldset>
            ) : null}

            <fieldset className="space-y-3 rounded-xl border border-line/80 p-3">
              <legend className="px-1 text-sm font-semibold">
                {form.occupancyStatus === 'TENANT_OCCUPIED'
                  ? 'Owners (property)'
                  : 'Owners'}
              </legend>
              <label className="block">
                <span className="label">Primary owner name</span>
                <input
                  className={inputClass}
                  required
                  value={form.primaryName}
                  onChange={(e) =>
                    setForm({ ...form, primaryName: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="label">Primary owner phone</span>
                <input
                  className={inputClass}
                  required
                  inputMode="tel"
                  value={form.primaryPhone}
                  onChange={(e) =>
                    setForm({ ...form, primaryPhone: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="label">Secondary owner name</span>
                <input
                  className={inputClass}
                  value={form.secondaryName}
                  onChange={(e) =>
                    setForm({ ...form, secondaryName: e.target.value })
                  }
                  placeholder="Optional if only one owner"
                />
              </label>
              <label className="block">
                <span className="label">Secondary owner phone</span>
                <input
                  className={inputClass}
                  inputMode="tel"
                  value={form.secondaryPhone}
                  onChange={(e) =>
                    setForm({ ...form, secondaryPhone: e.target.value })
                  }
                  placeholder="Optional if only one owner"
                />
              </label>
            </fieldset>

            <label className="block">
              <span className="label">Notes (optional)</span>
              <textarea
                className="input min-h-[4rem]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <button type="submit" className={btnClass} disabled={busy}>
              {busy ? 'Sending…' : 'Submit for review'}
            </button>
          </form>
        ) : null}

        {step === 'done' ? (
          <div className="mt-6 rounded-2xl border border-brand/30 bg-white p-5 text-center shadow-sm">
            <p className="text-lg font-semibold text-brand">{ok}</p>
            <button
              type="button"
              className="btn-ghost mt-4"
              onClick={() => {
                setOk('');
                setFlatInfo(null);
                setTowerNumber('');
              }}
            >
              Submit another flat
            </button>
          </div>
        ) : null}

        {!kiosk ? (
          <p className="mt-6 text-center text-xs text-muted">
            <a className="underline" href="/flat-update/paper">
              Paper form
            </a>
            {' · '}
            <a className="underline" href="/flat-update/share">
              Share / WhatsApp
            </a>
            {' · '}
            <a className="underline" href="/flat-update?kiosk=1">
              Kiosk mode
            </a>
            {' · '}
            <a className="underline" href="/login">
              Staff sign in
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
