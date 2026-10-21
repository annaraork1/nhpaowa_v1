import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { StatusBadge, inr } from './ui.jsx';

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const items = data?.items || [];
  const suppliers = data?.suppliers || [];
  const pos = data?.purchaseOrders || [];
  const hasResults = items.length || suppliers.length || pos.length;

  return (
    <div className="relative w-full min-w-0" ref={boxRef}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        className="input w-full pl-9"
        placeholder="Search…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Global search"
      />

      {open && q.trim().length >= 2 ? (
        <div className="absolute right-0 z-40 mt-2 max-h-96 w-full min-w-[320px] overflow-auto rounded-xl border border-line bg-panel p-3 shadow-card">
          {isFetching && !data ? (
            <p className="py-4 text-center text-sm text-muted">Searching…</p>
          ) : !hasResults ? (
            <p className="py-4 text-center text-sm text-muted">No matches for “{q}”</p>
          ) : (
            <div className="space-y-4">
              {items.length ? (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Items
                  </p>
                  <ul className="space-y-1">
                    {items.map((i) => (
                      <li key={i.id}>
                        <Link
                          to="/items"
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-surface"
                          onClick={() => setOpen(false)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{i.name}</p>
                            <p className="text-xs text-muted">
                              {i.sku} · {i.category?.name}
                            </p>
                          </div>
                          <StatusBadge status={i.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {suppliers.length ? (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Suppliers
                  </p>
                  <ul className="space-y-1">
                    {suppliers.map((s) => (
                      <li key={s.id}>
                        <Link
                          to="/suppliers"
                          className="block rounded-lg px-2 py-2 hover:bg-surface"
                          onClick={() => setOpen(false)}
                        >
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted">{s.contactPerson || s.phone}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {pos.length ? (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Purchase Orders
                  </p>
                  <ul className="space-y-1">
                    {pos.map((po) => (
                      <li key={po.id}>
                        <Link
                          to="/purchase-orders"
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-surface"
                          onClick={() => setOpen(false)}
                        >
                          <div>
                            <p className="text-sm font-medium">{po.poNumber}</p>
                            <p className="text-xs text-muted">{po.supplier?.name}</p>
                          </div>
                          <span className="text-xs font-semibold">{inr(po.totalAmount)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
