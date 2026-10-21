import { useMemo, useState } from 'react';

/**
 * Printable multi-flat paper sheets for tower captains (channel 3).
 * Fits several flat capture blocks on one A4 page.
 */
const DENSITY_OPTIONS = [
  { id: '4', label: '4 per A4', cols: 2, rows: 2, hint: 'Roomy handwriting' },
  { id: '6', label: '6 per A4', cols: 2, rows: 3, hint: 'Balanced (default)' },
  { id: '8', label: '8 per A4', cols: 2, rows: 4, hint: 'Compact' },
  { id: '10', label: '10 per A4', cols: 2, rows: 5, hint: 'Same card size as 8' },
  { id: '12', label: '12 per A4', cols: 2, rows: 6, hint: 'Same card size as 8' },
  { id: 'table', label: '12+ table', cols: 1, rows: 12, hint: 'One row per flat' },
];

function FlatBlock({ index }) {
  return (
    <div className="break-inside-avoid border border-black p-1.5 text-[9px] leading-tight print:text-[8.5px]">
      <div className="mb-1 flex items-baseline justify-between gap-1 border-b border-black pb-0.5">
        <span className="font-bold">#{index}</span>
        <span>
          Tower no.{' '}
          <span className="inline-block min-w-[4.5rem] border-b border-dotted border-black">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </span>
        <span>
          Occ: <span className="font-normal">O / T / V</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <Line label="Primary name" />
        <Line label="Primary phone" />
        <Line label="Secondary name" />
        <Line label="Secondary phone" />
        <Line label="Tenant name" />
        <Line label="Tenant phone" />
      </div>
      <div className="mt-0.5">
        <Line label="Notes / vehicles / emergency" wide />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[8px]">
        <span>
          Sig ____________ <span className="text-black/70">Date ____</span>
        </span>
      </div>
    </div>
  );
}

function Line({ label, wide }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <span className="text-black/80">{label}</span>
      <div className="mt-0.5 min-h-[0.85rem] border-b border-dotted border-black" />
    </div>
  );
}

function TableSheet({ rows }) {
  const cols = [
    'Tower no.',
    'Occ',
    'Primary name',
    'Primary ph',
    'Secondary name',
    'Secondary ph',
    'Tenant name',
    'Tenant ph',
    'Notes',
  ];
  return (
    <table className="w-full border-collapse text-[8px] leading-tight print:text-[7.5px]">
      <thead>
        <tr>
          {cols.map((c) => (
            <th
              key={c}
              className="border border-black bg-neutral-100 px-0.5 py-1 text-left font-semibold"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i}>
            {cols.map((c) => (
              <td
                key={c}
                className="h-7 border border-black px-0.5 py-1 align-top"
              >
                {c === 'Occ' ? (
                  <span className="text-black/50">O/T/V</span>
                ) : (
                  '\u00a0'
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FlatPaperFormPage() {
  const [densityId, setDensityId] = useState('6');
  const [pageCount, setPageCount] = useState(1);
  const density =
    DENSITY_OPTIONS.find((d) => d.id === densityId) || DENSITY_OPTIONS[1];

  const pages = useMemo(() => {
    const perPage =
      density.id === 'table' ? density.rows : density.cols * density.rows;
    const n = Math.max(1, Math.min(20, Number(pageCount) || 1));
    return Array.from({ length: n }, (_, pageIdx) => ({
      pageIdx,
      start: pageIdx * perPage + 1,
      perPage,
    }));
  }, [density, pageCount]);

  return (
    <div className="mx-auto max-w-4xl bg-white px-4 py-6 text-black print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .paper-sheet { page-break-after: always; }
          .paper-sheet:last-child { page-break-after: auto; }
          .paper-sheet-grid { gap: 2mm !important; }
        }
      `}</style>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <a href="/flat-update" className="btn-ghost text-sm">
            ← Flat update form
          </a>
          <h1 className="mt-2 text-xl font-bold">Paper collection — multi-flat A4</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Print several flats on one sheet for captains. Choose density (4 / 6 /
            8 / 10 / 12 cards, or 12+ table), then Print. Office enters via Flats
            → CSV import.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.print()}
        >
          Print
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-4 print:hidden">
        <label className="block text-sm">
          <span className="label">Flats per A4</span>
          <select
            className="input mt-1"
            value={densityId}
            onChange={(e) => setDensityId(e.target.value)}
          >
            {DENSITY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label">Number of sheets</span>
          <input
            className="input mt-1 w-24"
            type="number"
            min={1}
            max={20}
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted">
          Tip: for one tower floor, print 1–2 sheets at <strong>6 per A4</strong>.
          For a long captain list, use <strong>12+ table</strong>.
        </p>
      </div>

      {pages.map((page) => (
        <section
          key={page.pageIdx}
          className="paper-sheet mb-8 border border-dashed border-line p-3 print:mb-0 print:border-0 print:p-0"
        >
          <header className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-black pb-1 text-[10px]">
            <div>
              <p className="text-sm font-bold leading-none">
                NHPAOWA — Flat P1 collection
              </p>
              <p className="mt-0.5 text-black/70">
                Tower number = full unit (e.g. 21031). Occ: Owner / Tenant /
                Vacant.
              </p>
            </div>
            <div className="text-right">
              <p>
                Captain ________________ Sheet {page.pageIdx + 1}/{pages.length}
              </p>
              <p>Date ________ Tower block ________</p>
            </div>
          </header>

          {density.id === 'table' ? (
            <TableSheet rows={density.rows} />
          ) : (
            <div
              className="paper-sheet-grid grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${density.cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: page.perPage }, (_, i) => (
                <FlatBlock key={i} index={page.start + i} />
              ))}
            </div>
          )}

          <p className="mt-2 text-[8px] text-black/60">
            Return to association office for CSV entry. Do not leave blank tower
            numbers.
          </p>
        </section>
      ))}
    </div>
  );
}
