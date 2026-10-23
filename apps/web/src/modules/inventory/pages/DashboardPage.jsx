import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client.js';
import { AlertsPanel } from '../components/AlertsPanel.jsx';
import {
  EntityCard,
  ResponsiveList,
} from '../components/ResponsiveList.jsx';
import { IconBox, StatusBadge, inr } from '../components/ui.jsx';
import { useTheme } from '../../../theme/ThemeProvider.jsx';

const COLORS = [
  '#C45BC2',
  '#8E248D',
  '#D478D2',
  '#A832A6',
  '#E8A0E4',
  '#6B4A6A',
  '#C9A3C8',
];

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function SectionTitle({ title, to }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="font-semibold text-ink">{title}</h3>
      {to ? (
        <Link to={to} className="text-xs font-semibold text-brand hover:underline">
          View All
        </Link>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tick = cssVar('--chart-tick', isDark ? '#e2d4e2' : '#6b5a6b');
  const grid = cssVar('--chart-grid', isDark ? '#5a405a' : '#e8dde8');
  const bar = cssVar('--chart-bar', isDark ? '#e8a0e4' : '#8e248d');
  const tooltipStyle = {
    backgroundColor: isDark ? '#2a1f2a' : '#ffffff',
    border: `1px solid ${isDark ? '#5a405a' : '#e8dde8'}`,
    color: isDark ? '#faf6fa' : '#1a0f1a',
    borderRadius: 8,
    boxShadow: isDark
      ? '0 8px 24px rgba(0,0,0,0.5)'
      : '0 4px 12px rgba(26,15,26,0.08)',
    padding: '10px 12px',
  };
  const tooltipLabelStyle = {
    color: isDark ? '#faf6fa' : '#1a0f1a',
    fontWeight: 600,
    marginBottom: 4,
  };
  const tooltipItemStyle = {
    color: isDark ? '#e2d4e2' : '#1a0f1a',
  };
  const tooltipCursor = isDark
    ? { fill: 'rgba(232, 160, 228, 0.12)' }
    : { fill: 'rgba(142, 36, 141, 0.08)' };


  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: api.dashboard.summary,
  });
  const byCat = useQuery({
    queryKey: ['dashboard', 'byCat'],
    queryFn: api.dashboard.byCategory,
  });
  const top = useQuery({
    queryKey: ['dashboard', 'top'],
    queryFn: api.dashboard.topConsumed,
  });
  const widgets = useQuery({
    queryKey: ['dashboard', 'widgets'],
    queryFn: api.dashboard.widgets,
  });

  const s = summary.data || {};
  const totalValue = Number(s.totalStockValue || 0);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const dashLoading =
    summary.isLoading || byCat.isLoading || top.isLoading || widgets.isLoading;

  return (
    <div className="space-y-5 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Dashboard</h2>
          <p className="text-sm text-muted">
            Inventory totals, charts, and stock alerts
            {dashLoading ? (
              <span className="ml-2 inline-flex items-center gap-1.5 text-brand">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Updating…
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-muted shadow-sm">
          {today}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Total Items</p>
            <p className="kpi-value mt-1 text-3xl font-bold tracking-tight">
              {s.totalItems ?? '—'}
            </p>
            <p className="mt-2 text-xs font-medium text-ok">
              +{s.deltas?.itemsThisMonth ?? 0} this month
            </p>
          </div>
          <IconBox tone="blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </IconBox>
        </div>

        <div className="panel flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Total Stock Value</p>
            <p className="kpi-value mt-1 text-3xl font-bold tracking-tight">
              {inr(totalValue)}
            </p>
            <p className="mt-2 text-xs font-medium text-ok">
              {(s.deltas?.stockValuePct ?? 0) >= 0 ? '+' : ''}
              {s.deltas?.stockValuePct ?? 0}% this month
            </p>
          </div>
          <IconBox tone="green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </IconBox>
        </div>

        <div className="panel flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Pending Purchase Orders</p>
            <p className="kpi-value mt-1 text-3xl font-bold tracking-tight">
              {s.pendingPurchaseOrders ?? '—'}
            </p>
            <p className="mt-2 text-xs font-medium text-warn">
              {inr(s.pendingPurchaseOrderValue)}
            </p>
          </div>
          <IconBox tone="amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
          </IconBox>
        </div>

        <div className="panel flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Low Stock Items</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-err">
              {s.lowStockItems ?? '—'}
            </p>
            <p className="mt-2 text-xs font-medium text-err">Needs attention</p>
          </div>
          <IconBox tone="red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </IconBox>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-1">
          <SectionTitle title="Stock Value by Category" />
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCat.data || []}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {(byCat.data || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => inr(v)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  wrapperStyle={{ outline: 'none', zIndex: 20 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-muted">Total Value</p>
              <p className="text-sm font-bold text-ink">{inr(totalValue)}</p>
            </div>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {(byCat.data || []).map((row, i) => (
              <li key={row.category} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-muted">{row.category}</span>
                <span className="ml-auto font-semibold text-ink">{row.percent}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel xl:col-span-1">
          <SectionTitle title="Top 5 Consumed Items" />
          <p className="mb-2 text-xs text-muted">Last 3 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.data || []} margin={{ left: -10, right: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: tick }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                  stroke={grid}
                />
                <YAxis tick={{ fontSize: 11, fill: tick }} stroke={grid} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={tooltipCursor}
                  wrapperStyle={{ outline: 'none', zIndex: 20 }}
                />
                <Bar dataKey="quantity" fill={bar} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <AlertsPanel />
          <div className="panel !p-4">
            <h3 className="mb-3 font-semibold text-ink">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['/items', 'Add New Item'],
                ['/purchase-orders', 'Purchase Order'],
                ['/stock', 'Record Stock In'],
                ['/stock', 'Record Stock Out'],
                ['/suppliers', 'Add Supplier'],
                ['/reports', 'Generate Report'],
              ].map(([to, label]) => (
                <Link
                  key={label}
                  to={to}
                  className="rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-xs font-semibold text-ink transition hover:border-brand hover-tint-brand"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden !p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-semibold text-ink">Recent Inventory Items</h3>
          <Link to="/items" className="text-xs font-semibold text-brand">
            View All
          </Link>
        </div>
        <div className="p-3 md:p-0">
          <ResponsiveList
            mobile={(widgets.data?.recentItems || []).map((i) => (
              <EntityCard
                key={i.id}
                title={i.name}
                subtitle={i.sku}
                badge={<StatusBadge status={i.status} />}
                fields={[
                  { label: 'Category', value: i.category?.name || '—' },
                  {
                    label: 'Stock',
                    value: `${Number(i.currentStock)} ${i.unit}`,
                  },
                  { label: 'Min', value: Number(i.minStockLevel) },
                  {
                    label: 'Updated',
                    value: new Date(i.updatedAt).toLocaleDateString('en-IN'),
                  },
                ]}
                actions={
                  <Link to="/items" className="text-sm font-semibold text-brand">
                    View
                  </Link>
                }
              />
            ))}
            desktop={
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-ink">
                  <thead className="bg-surface text-xs uppercase text-muted">
                    <tr>
                      <th className="px-5 py-3">Item Name</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Current Stock</th>
                      <th className="px-5 py-3">Min. Level</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Last Updated</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(widgets.data?.recentItems || []).map((i) => (
                      <tr key={i.id} className="border-t border-line">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted">
                              {i.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-ink">{i.name}</p>
                              <p className="text-xs text-muted">{i.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {i.category?.name}
                        </td>
                        <td className="px-5 py-3">
                          {Number(i.currentStock)} {i.unit}
                        </td>
                        <td className="px-5 py-3">{Number(i.minStockLevel)}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {new Date(i.updatedAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            to="/items"
                            className="font-semibold text-brand"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel overflow-hidden !p-0 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs font-semibold text-brand">
              View All
            </Link>
          </div>
          <div className="p-3 md:p-0">
            <ResponsiveList
              mobile={(widgets.data?.recentTransactions || []).map((t) => (
                <EntityCard
                  key={t.id}
                  title={t.item?.name || '—'}
                  badge={<StatusBadge status={t.type} />}
                  fields={[
                    {
                      label: 'Date',
                      value: new Date(t.transactionDate).toLocaleDateString(
                        'en-IN',
                      ),
                    },
                    { label: 'Qty', value: Number(t.quantity) },
                    {
                      label: 'User',
                      value: t.department || t.performedByName || '—',
                      span: 2,
                    },
                  ]}
                />
              ))}
              desktop={
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-ink">
                    <thead className="bg-surface text-muted">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(widgets.data?.recentTransactions || []).map((t) => (
                        <tr key={t.id} className="border-t border-line">
                          <td className="whitespace-nowrap px-3 py-2">
                            {new Date(t.transactionDate).toLocaleDateString(
                              'en-IN',
                            )}
                          </td>
                          <td className="px-3 py-2">{t.item?.name}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={t.type} />
                          </td>
                          <td className="px-3 py-2">{Number(t.quantity)}</td>
                          <td className="px-3 py-2 text-muted">
                            {t.department || t.performedByName || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          </div>
        </div>

        <div className="panel overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Top Suppliers</h3>
            <Link to="/suppliers" className="text-xs font-semibold text-brand">
              View All
            </Link>
          </div>
          <div className="p-3 md:p-0">
            <ResponsiveList
              mobile={(widgets.data?.topSuppliers || []).map((row) => (
                <EntityCard
                  key={row.id}
                  title={row.name}
                  fields={[
                    { label: 'Orders', value: row.orderCount },
                    { label: 'Total value', value: inr(row.totalValue) },
                  ]}
                />
              ))}
              desktop={
                <table className="min-w-full text-left text-xs text-ink">
                  <thead className="bg-surface text-muted">
                    <tr>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Orders</th>
                      <th className="px-3 py-2">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(widgets.data?.topSuppliers || []).map((row) => (
                      <tr key={row.id} className="border-t border-line">
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">{row.orderCount}</td>
                        <td className="px-3 py-2">{inr(row.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            />
          </div>
        </div>

        <div className="panel overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">
              Upcoming Purchase Orders
            </h3>
            <Link
              to="/purchase-orders"
              className="text-xs font-semibold text-brand"
            >
              View All
            </Link>
          </div>
          <div className="p-3 md:p-0">
            <ResponsiveList
              mobile={
                (widgets.data?.upcomingPurchaseOrders || []).length
                  ? (widgets.data?.upcomingPurchaseOrders || []).map((po) => (
                      <EntityCard
                        key={po.id}
                        title={po.items?.[0]?.item?.name || po.poNumber}
                        subtitle={po.supplier?.name}
                        fields={[
                          {
                            label: 'Expected',
                            value: po.expectedDate
                              ? new Date(po.expectedDate).toLocaleDateString(
                                  'en-IN',
                                )
                              : '—',
                          },
                          {
                            label: 'Amount',
                            value: inr(po.totalAmount),
                          },
                        ]}
                      />
                    ))
                  : (
                      <p className="py-4 text-center text-sm text-muted">
                        No upcoming POs
                      </p>
                    )
              }
              desktop={
                <table className="min-w-full text-left text-xs text-ink">
                  <thead className="bg-surface text-muted">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Expected</th>
                      <th className="px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(widgets.data?.upcomingPurchaseOrders || []).map((po) => (
                      <tr key={po.id} className="border-t border-line">
                        <td className="px-3 py-2">
                          {po.items?.[0]?.item?.name || po.poNumber}
                        </td>
                        <td className="px-3 py-2">{po.supplier?.name}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {po.expectedDate
                            ? new Date(po.expectedDate).toLocaleDateString(
                                'en-IN',
                              )
                            : '—'}
                        </td>
                        <td className="px-3 py-2">{inr(po.totalAmount)}</td>
                      </tr>
                    ))}
                    {!widgets.data?.upcomingPurchaseOrders?.length ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-muted"
                        >
                          No upcoming POs
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
