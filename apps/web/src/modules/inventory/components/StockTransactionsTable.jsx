import { StatusBadge } from './ui.jsx';

function fmtQty(v, unit = '') {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return unit ? `${n} ${unit}` : String(n);
}

function refBits(t) {
  return [
    t.referenceType && t.referenceType !== 'MANUAL'
      ? String(t.referenceType).replaceAll('_', ' ')
      : null,
    t.department || null,
    t.notes || null,
  ].filter(Boolean);
}

function TxnCard({ t, showItem }) {
  const unit = t.item?.unit || '';
  const bits = refBits(t);

  return (
    <article className="rounded-lg border border-line bg-surface/40 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={t.type} />
        <time className="text-xs text-muted">
          {new Date(t.transactionDate).toLocaleString()}
        </time>
      </div>
      {showItem ? (
        <p className="mb-1 font-medium text-ink">
          {t.item?.name || '—'}
          {t.item?.sku ? (
            <span className="ml-1 text-xs font-normal text-muted">
              {t.item.sku}
            </span>
          ) : null}
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted">Qty</dt>
          <dd className="font-semibold text-ink">
            {t.type === 'OUT' ? '−' : '+'}
            {fmtQty(t.quantity, unit)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Before</dt>
          <dd className="text-ink">{fmtQty(t.stockBefore, unit)}</dd>
        </div>
        <div>
          <dt className="text-muted">After</dt>
          <dd className="font-semibold text-ink">
            {fmtQty(t.stockAfter, unit)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">By</dt>
          <dd className="text-ink">{t.performedByName || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Warehouse</dt>
          <dd className="text-ink">{t.warehouse?.name || '—'}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-muted">Ref / notes</dt>
          <dd className="text-ink break-words">
            {bits.length ? bits.join(' · ') : '—'}
          </dd>
        </div>
      </dl>
    </article>
  );
}

/**
 * Shared stock movement list — cards on mobile, table from md up.
 */
export function StockTransactionsTable({
  rows = [],
  showItem = true,
  emptyMessage = 'No transactions yet.',
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((t) => (
          <TxnCard key={t.id} t={t} showItem={showItem} />
        ))}
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm text-ink">
          <thead className="border-b border-line bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2.5 whitespace-nowrap">Date / time</th>
              <th className="px-3 py-2.5">Type</th>
              {showItem ? <th className="px-3 py-2.5">Item</th> : null}
              <th className="px-3 py-2.5">Qty</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Before</th>
              <th className="px-3 py-2.5 whitespace-nowrap">After</th>
              <th className="px-3 py-2.5">By</th>
              <th className="px-3 py-2.5">Warehouse</th>
              <th className="px-3 py-2.5">Ref / notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const unit = t.item?.unit || '';
              const bits = refBits(t);

              return (
                <tr key={t.id} className="border-b border-line/60 align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted">
                    {new Date(t.transactionDate).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={t.type} />
                  </td>
                  {showItem ? (
                    <td className="px-3 py-2.5 font-medium">
                      {t.item?.name || '—'}
                      {t.item?.sku ? (
                        <div className="text-xs font-normal text-muted">
                          {t.item.sku}
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                    {t.type === 'OUT' ? '−' : '+'}
                    {fmtQty(t.quantity, unit)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted">
                    {fmtQty(t.stockBefore, unit)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                    {fmtQty(t.stockAfter, unit)}
                  </td>
                  <td className="px-3 py-2.5">{t.performedByName || '—'}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {t.warehouse?.name || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-muted min-w-[10rem]">
                    {bits.length ? bits.join(' · ') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
