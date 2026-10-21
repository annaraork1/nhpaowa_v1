import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, MoonIcon, SunIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BrandLogo } from './modules/inventory/components/BrandLogo.jsx';
import { IconButton } from './modules/inventory/components/IconButton.jsx';
import {
  clearSession,
  getAuthUser,
  getToken,
} from './modules/inventory/api/client.js';
import { AuthGate } from './modules/inventory/auth/AuthGate.jsx';
import { can } from './modules/inventory/auth/permissions.js';
import { AlertsPanel } from './modules/inventory/components/AlertsPanel.jsx';
import { GlobalSearch } from './modules/inventory/components/GlobalSearch.jsx';
import { useTheme } from './theme/ThemeProvider.jsx';
import DashboardPage from './modules/inventory/pages/DashboardPage.jsx';
import HomePage from './modules/inventory/pages/HomePage.jsx';
import ItemsPage from './modules/inventory/pages/ItemsPage.jsx';
import CategoriesPage from './modules/inventory/pages/CategoriesPage.jsx';
import SuppliersPage from './modules/inventory/pages/SuppliersPage.jsx';
import PurchaseOrdersPage from './modules/inventory/pages/PurchaseOrdersPage.jsx';
import StockPage from './modules/inventory/pages/StockPage.jsx';
import TransactionsPage from './modules/inventory/pages/TransactionsPage.jsx';
import ReportsPage from './modules/inventory/pages/ReportsPage.jsx';
import AlertsPage from './modules/inventory/pages/AlertsPage.jsx';
import SettingsPage from './modules/inventory/pages/SettingsPage.jsx';
import AmcPage from './modules/inventory/pages/AmcPage.jsx';
import FlatUpdatePage from './modules/association/pages/FlatUpdatePage.jsx';
import FlatUpdateSharePage from './modules/association/pages/FlatUpdateSharePage.jsx';
import FlatPaperFormPage from './modules/association/pages/FlatPaperFormPage.jsx';
import FlatSelfUpdatesPage from './modules/association/pages/FlatSelfUpdatesPage.jsx';
import LoginPage from './modules/inventory/pages/LoginPage.jsx';
import WarehousesPage from './modules/inventory/pages/WarehousesPage.jsx';
import BarcodePage from './modules/inventory/pages/BarcodePage.jsx';
import VendorPortalPage from './modules/inventory/pages/VendorPortalPage.jsx';
import PurchaseRequisitionsPage from './modules/inventory/pages/PurchaseRequisitionsPage.jsx';
import UsersPage from './modules/inventory/pages/UsersPage.jsx';
import FlatsPage from './modules/association/pages/FlatsPage.jsx';
import NocPage from './modules/association/pages/NocPage.jsx';
import AttendancePage from './modules/association/pages/AttendancePage.jsx';
import MovesPage from './modules/association/pages/MovesPage.jsx';
import NoticesPage from './modules/association/pages/NoticesPage.jsx';
import BoardPage from './modules/association/pages/BoardPage.jsx';
import ResidentHomePage from './modules/association/pages/ResidentHomePage.jsx';
import { PwaInstallBanner } from './modules/inventory/components/PwaInstallBanner.jsx';
import GatePage from './modules/bus/pages/GatePage.jsx';
import SchoolsBusesPage from './modules/bus/pages/SchoolsBusesPage.jsx';
import BatchesSlotsPage from './modules/bus/pages/BatchesSlotsPage.jsx';
import BusReportsPage from './modules/bus/pages/BusReportsPage.jsx';
import ResidentBusesPage from './modules/bus/pages/ResidentBusesPage.jsx';

const navAll = [
  { to: '/', label: 'Home', residentLabel: 'Home', icon: 'grid', resource: 'home' },
  { to: '/dashboard', label: 'Dashboard', icon: 'chart', resource: 'dashboard' },
  { to: '/users', label: 'Users', icon: 'users', resource: 'users', superadminFirst: true },
  { to: '/flats', label: 'Flat owners', residentLabel: 'My flat', icon: 'home', resource: 'flatOwners' },
  {
    to: '/flats/self-updates',
    label: 'Flat self-updates',
    icon: 'clipboard',
    resource: 'flatOwners',
    hideForResident: true,
  },
  { to: '/noc', label: 'NOC', icon: 'clipboard', resource: 'noc' },
  { to: '/notices', label: 'Notices', icon: 'list', resource: 'notices' },
  { to: '/board', label: 'Board', icon: 'users', resource: 'board' },
  { to: '/attendance', label: 'Attendance', icon: 'list', resource: 'attendance' },
  {
    to: '/buses/gate',
    label: 'Bus gate',
    icon: 'truck',
    resource: 'schoolBus',
    hideForResident: true,
  },
  {
    to: '/buses/today',
    label: 'Today’s buses',
    residentLabel: 'Today’s buses',
    icon: 'truck',
    resource: 'schoolBus',
    residentOnly: true,
  },
  {
    to: '/buses/schools',
    label: 'Schools & buses',
    icon: 'home',
    resource: 'schoolBusAdmin',
    hideForResident: true,
  },
  {
    to: '/buses/batches',
    label: 'Bus batches',
    icon: 'list',
    resource: 'schoolBusAdmin',
    hideForResident: true,
  },
  {
    to: '/buses/reports',
    label: 'Bus reports',
    icon: 'chart',
    resource: 'schoolBus',
    hideForResident: true,
  },
  { to: '/moves', label: 'Moves', icon: 'truck', resource: 'moves' },
  { to: '/items', label: 'Items', icon: 'box', resource: 'items' },
  { to: '/categories', label: 'Categories', icon: 'tag', resource: 'categories' },
  { to: '/suppliers', label: 'Suppliers', icon: 'truck', resource: 'suppliers' },
  { to: '/warehouses', label: 'Warehouses', icon: 'layers', resource: 'warehouses' },
  { to: '/barcodes', label: 'Barcodes', icon: 'list', resource: 'barcodes' },
  {
    to: '/purchase-orders',
    label: 'Purchase Orders',
    icon: 'clipboard',
    resource: 'purchaseOrders',
  },
  {
    to: '/requisitions',
    label: 'Requisitions',
    icon: 'clipboard',
    resource: 'purchaseRequisitions',
  },
  { to: '/stock', label: 'Stock Management', icon: 'layers', resource: 'stock' },
  { to: '/transactions', label: 'Transactions', icon: 'list', resource: 'stock' },
  { to: '/amc', label: 'AMC Contracts', icon: 'clipboard', resource: 'amc' },
  { to: '/vendor', label: 'Vendor Portal', icon: 'truck', resource: 'vendor' },
  { to: '/reports', label: 'Reports', icon: 'chart', resource: 'reports' },
  { to: '/settings', label: 'Settings', icon: 'gear', resource: 'settings' },
];

const roleNames = {
  SUPERADMIN: 'Superadmin',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
  COMMITTEE: 'Committee',
  STAFF: 'Staff',
  SECURITY_HEAD: 'Security Head',
  ESTATE_MANAGER: 'Estate Manager',
  SECURITY_STAFF: 'Security Staff',
  RESIDENT: 'Resident',
  VENDOR: 'Vendor',
};

function NavIcon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
  };
  switch (name) {
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case 'truck':
      return (
        <svg {...common}>
          <path d="M1 3h15v13H1z" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...common}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const authUser = getAuthUser();
  const role = authUser?.role || '';
  const displayName = authUser?.name || 'User';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const nav = navAll.filter((item) => {
    if (!can(item.resource, 'view')) return false;
    if (item.residentOnly && role !== 'RESIDENT') return false;
    if (item.hideForResident && role === 'RESIDENT') return false;
    return true;
  });
  const isResident = role === 'RESIDENT';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setMobileNavOpen(false);
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  function navLabel(item) {
    return isResident && item.residentLabel ? item.residentLabel : item.label;
  }

  function renderNavLinks({ onNavigate } = {}) {
    const pathname = location.pathname;
    const matching = nav.filter((item) =>
      item.to === '/'
        ? pathname === '/'
        : pathname === item.to || pathname.startsWith(`${item.to}/`)
    );
    const activeTo = matching.sort((a, b) => b.to.length - a.to.length)[0]?.to;

    return nav.map((item) => {
      const active = item.to === activeTo;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/' || item.to === '/flats'}
          className={active ? 'nav-item-active' : 'nav-item'}
          onClick={() => onNavigate?.()}
        >
          <NavIcon name={item.icon} />
          <span>{navLabel(item)}</span>
        </NavLink>
      );
    });
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-sidebar text-white lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <BrandLogo variant="mark" />
          <div>
            <p className="text-sm font-bold leading-tight">NHPAOWA</p>
            <p className="text-[11px] text-sidebar-muted">
              TATA New Haven · Bengaluru
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {renderNavLinks()}
        </nav>
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col bg-sidebar text-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <BrandLogo variant="mark" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">NHPAOWA</p>
                  <p className="truncate text-[11px] text-sidebar-muted">
                    {isResident ? 'Resident' : 'Operations'}
                  </p>
                </div>
              </div>
              <IconButton
                label="Close menu"
                onClick={() => setMobileNavOpen(false)}
                className="!text-white hover:!bg-white/10"
              >
                <XMarkIcon className="h-5 w-5" />
              </IconButton>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {renderNavLinks({ onNavigate: () => setMobileNavOpen(false) })}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-20 border-b border-line px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <IconButton
              label="Open menu"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </IconButton>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-ink md:text-xl lg:text-2xl">
                {isResident ? 'NHPAOWA Resident' : 'NHPAOWA Operations'}
              </h1>
              <p className="hidden truncate text-sm text-muted xl:block">
                {isResident
                  ? 'My flat, notices, NOC and move requests'
                  : 'Inventory, flat owners, NOC, attendance, and move-in/out — role permissioned.'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              {can('dashboard', 'view') && !isResident ? (
                <div className="hidden min-w-0 sm:block sm:w-44 md:w-52 lg:w-64">
                  <GlobalSearch />
                </div>
              ) : null}
              {can('alerts', 'view') ? <AlertsPanel compact /> : null}
              <IconButton
                label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </IconButton>
              <div className="flex max-w-[10.5rem] items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2 sm:max-w-[12rem] sm:pr-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="hidden min-w-0 leading-tight sm:block">
                  <p className="truncate text-sm font-semibold text-ink" title={displayName}>
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] text-muted" title={roleNames[role] || role}>
                    {roleNames[role] || role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0 whitespace-nowrap !px-2 !py-2 text-sm sm:!px-3"
                onClick={() => {
                  clearSession();
                  navigate('/login');
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-6">
          <PwaInstallBanner className="mb-4" />
          <Routes>
            <Route
              path="/"
              element={
                role === 'RESIDENT' ? <ResidentHomePage /> : <HomePage />
              }
            />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />
            <Route path="/barcodes" element={<BarcodePage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/requisitions" element={<PurchaseRequisitionsPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/amc" element={<AmcPage />} />
            <Route path="/vendor" element={<VendorPortalPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/flats" element={<FlatsPage />} />
            <Route path="/flats/self-updates" element={<FlatSelfUpdatesPage />} />
            <Route path="/noc" element={<NocPage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/buses/gate" element={<GatePage />} />
            <Route path="/buses/schools" element={<SchoolsBusesPage />} />
            <Route path="/buses/batches" element={<BatchesSlotsPage />} />
            <Route path="/buses/reports" element={<BusReportsPage />} />
            <Route path="/buses/today" element={<ResidentBusesPage />} />
            <Route path="/moves" element={<MovesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const token = getToken();
  const location = useLocation();

  if (location.pathname === '/login') {
    return (
      <AuthGate>
        <LoginPage />
      </AuthGate>
    );
  }

  if (location.pathname === '/flat-update') {
    return <FlatUpdatePage />;
  }
  if (location.pathname === '/flat-update/share') {
    return <FlatUpdateSharePage />;
  }
  if (location.pathname === '/flat-update/paper') {
    return <FlatPaperFormPage />;
  }

  if (!token) {
    return <AuthGate>{null}</AuthGate>;
  }

  return (
    <AuthGate>
      <Shell />
    </AuthGate>
  );
}
