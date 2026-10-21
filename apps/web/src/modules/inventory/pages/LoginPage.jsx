import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api, setSession } from '../api/client.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { PwaInstallBanner } from '../components/PwaInstallBanner.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Superadmin', email: 'superadmin@nhpaowa.local' },
  { label: 'Secretary', email: 'secretary@nhpaowa.local' },
  { label: 'Treasurer', email: 'treasurer@nhpaowa.local' },
  { label: 'Staff', email: 'staff@nhpaowa.local' },
  { label: 'Security Head', email: 'security.head@nhpaowa.local' },
  { label: 'Estate Manager', email: 'estate.manager@nhpaowa.local' },
  { label: 'Security Staff', email: 'security.staff@nhpaowa.local' },
  { label: 'Resident', email: 'resident@nhpaowa.local', note: 'Tower 1 / 101' },
  { label: 'Vendor', email: 'vendor@shree.local' },
];

const DEMO_PASSWORD = 'password123';

/** Open (no login) collection channels — plan 028 */
const OPEN_LINKS = [
  {
    to: '/flat-update',
    label: '1. Flat update form',
    note: 'Tower number e.g. 21031',
  },
  {
    to: '/flat-update/share',
    label: '2. Share / WhatsApp',
    note: 'Copy link for groups',
  },
  {
    to: '/flat-update/paper',
    label: '3. Paper form',
    note: 'Print for captains',
  },
  {
    to: '/flat-update?kiosk=1',
    label: '4. Kiosk mode',
    note: 'Large UI for lobby',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('superadmin@nhpaowa.local');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(loginEmail, loginPassword) {
    setBusy(true);
    setError('');
    try {
      const res = await api.auth.login({
        email: loginEmail,
        password: loginPassword,
      });
      setSession(res);
      const dest =
        res.user?.role === 'VENDOR'
          ? '/vendor'
          : location.state?.from || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    await signIn(email, password);
  }

  async function quickLogin(account) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    await signIn(account.email, DEMO_PASSWORD);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <form
        onSubmit={onSubmit}
        className="panel w-full max-w-md space-y-4 shadow-sm"
      >
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="mb-2 h-auto w-full max-w-[220px] object-contain" />
          <h1 className="sr-only">Sign in to NHPAOWA</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with your association email — your role controls view, edit,
            and delete access.
          </p>
        </div>
        <PwaInstallBanner />
        <label>
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          <span className="label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="text-sm text-err">{error}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted">
            Open without signing in — flat data collection
          </p>
          <div className="flex flex-wrap gap-2">
            {OPEN_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs text-ink hover:border-accent hover:bg-accent/5"
              >
                <span className="font-medium">{link.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted">
                  {link.note}
                </span>
              </Link>
            ))}
            <button
              type="button"
              disabled={busy}
              title="Sign in as Secretary, then Flat owners → CSV import / Flat self-updates"
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs text-ink hover:border-accent hover:bg-accent/5 disabled:opacity-50"
              onClick={() => {
                setEmail('secretary@nhpaowa.local');
                setPassword(DEMO_PASSWORD);
              }}
            >
              <span className="font-medium">5. Staff CSV / approve</span>
              <span className="mt-0.5 block text-[10px] text-muted">
                Sign in → Flat owners
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted">
            Quick demo login — password123
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={busy}
                title={`${account.email}${account.note ? ` (${account.note})` : ''}`}
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs text-ink hover:border-accent hover:bg-accent/5 disabled:opacity-50"
                onClick={() => quickLogin(account)}
              >
                <span className="font-medium">{account.label}</span>
                {account.note ? (
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {account.note}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
