import { Link } from 'react-router-dom';
import { can } from '../auth/permissions.js';
import { getAuthUser } from '../api/client.js';

const HOME_CARDS = [
  {
    to: '/dashboard',
    resource: 'dashboard',
    title: 'Dashboard',
    blurb: 'Inventory totals, charts, and stock alerts',
  },
  {
    to: '/flats',
    resource: 'flatOwners',
    title: 'Flat owners',
    blurb: 'Find a flat, owners, and household details',
  },
  {
    to: '/moves',
    resource: 'moves',
    title: 'Moves',
    blurb: 'Move-in / move-out at the gate',
  },
  {
    to: '/attendance',
    resource: 'attendance',
    title: 'Attendance',
    blurb: 'Staff check-in and leave',
  },
  {
    to: '/buses/gate',
    resource: 'schoolBus',
    title: 'Bus gate',
    blurb: 'School bus pickup and drop-off logging',
  },
  {
    to: '/noc',
    resource: 'noc',
    title: 'NOC',
    blurb: 'No-objection certificates',
  },
  {
    to: '/notices',
    resource: 'notices',
    title: 'Notices',
    blurb: 'Circulars for residents',
  },
  {
    to: '/users',
    resource: 'users',
    title: 'Users',
    blurb: 'Add people and choose their menu access',
  },
  {
    to: '/stock',
    resource: 'stock',
    title: 'Stock',
    blurb: 'Inventory in and out',
  },
  {
    to: '/items',
    resource: 'items',
    title: 'Items',
    blurb: 'Catalogue of inventory items',
  },
  {
    to: '/reports',
    resource: 'reports',
    title: 'Reports',
    blurb: 'Print and download reports',
  },
  {
    to: '/board',
    resource: 'board',
    title: 'Board',
    blurb: 'Office bearers on letterhead',
  },
  {
    to: '/settings',
    resource: 'settings',
    title: 'Settings',
    blurb: 'Association preferences',
  },
];

export default function HomePage() {
  const user = getAuthUser();
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const cards = HOME_CARDS.filter((c) => can(c.resource, 'view'));

  return (
    <div className="space-y-5 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Home</h2>
          <p className="text-sm text-muted">
            {user?.name ? `Hi ${user.name}. ` : ''}
            Tap a card to open that screen.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-muted shadow-sm">
          {today}
        </div>
      </div>

      {cards.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="panel block border border-line transition hover:border-brand/40 hover:shadow-md"
            >
              <p className="text-base font-semibold text-ink">{c.title}</p>
              <p className="mt-1 text-sm text-muted">{c.blurb}</p>
              <p className="mt-3 text-xs font-semibold text-brand">Open →</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          No screens are available for your role yet. Ask Superadmin to assign
          menu features.
        </p>
      )}
    </div>
  );
}
