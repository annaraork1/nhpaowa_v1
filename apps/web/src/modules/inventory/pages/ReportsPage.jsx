import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  associationCalendarYmd,
  addCalendarDaysYmd,
} from '@nhpaowa/shared-ui';
import { api } from '../api/client.js';
import { PageHeader, inr } from '../components/ui.jsx';

function defaultRange() {
  const to = associationCalendarYmd();
  const from = addCalendarDaysYmd(to, -90);
  return { from, to };
}

function ExportButtons({ onCsv, onPdf }) {
  return (
    <div className="flex gap-2">
      <button type="button" className="btn-ghost" onClick={onCsv}>
        Export CSV
      </button>
      <button type="button" className="btn-ghost" onClick={onPdf}>
        Export PDF
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [err, setErr] = useState('');

  const opts = { from: range.from, to: range.to };
  const valuation = useQuery({
    queryKey: ['reports', 'valuation', range],
    queryFn: () => api.reports.valuation(opts),
  });
  const consumption = useQuery({
    queryKey: ['reports', 'consumption', range],
    queryFn: () => api.reports.consumption(opts),
  });
  const spend = useQuery({
    queryKey: ['reports', 'spend', range],
    queryFn: () => api.reports.supplierSpend(opts),
  });

  async function exportReport(fn, format) {
    setErr('');
    try {
      await fn({ ...opts, format });
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Valuation, consumption, supplier spend — CSV and PDF export"
      />

      <div className="panel mb-6 flex flex-wrap items-end gap-3">
        <label>
          <span className="label">From</span>
          <input
            type="date"
            className="input !w-auto"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </label>
        <label>
          <span className="label">To</span>
          <input
            type="date"
            className="input !w-auto"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </label>
        {err ? <p className="w-full text-sm text-err">{err}</p> : null}
      </div>

      <section className="panel mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Stock valuation</h3>
          <ExportButtons
            onCsv={() => exportReport(api.reports.valuation, 'csv')}
            onPdf={() => exportReport(api.reports.valuation, 'pdf')}
          />
        </div>
        <ul className="space-y-2 text-sm">
          {(valuation.data || []).slice(0, 12).map((r) => (
            <li key={r.sku} className="flex justify-between gap-2">
              <span>
                {r.name} <span className="text-muted">({r.category})</span>
              </span>
              <span>{inr(r.value)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Consumption</h3>
          <ExportButtons
            onCsv={() => exportReport(api.reports.consumption, 'csv')}
            onPdf={() => exportReport(api.reports.consumption, 'pdf')}
          />
        </div>
        <ul className="space-y-2 text-sm">
          {(consumption.data || []).map((r) => (
            <li key={r.itemId} className="flex justify-between gap-2">
              <span>{r.name}</span>
              <span>{r.quantityOut}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Supplier spend</h3>
          <ExportButtons
            onCsv={() => exportReport(api.reports.supplierSpend, 'csv')}
            onPdf={() => exportReport(api.reports.supplierSpend, 'pdf')}
          />
        </div>
        <ul className="space-y-2 text-sm">
          {(spend.data || []).map((r) => (
            <li key={r.supplierId} className="flex justify-between gap-2">
              <span>
                {r.name} · {r.orderCount} orders
              </span>
              <span>{inr(r.totalSpend)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
