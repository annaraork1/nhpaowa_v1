import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { StatusBadge } from './ui.jsx';

function useDebouncedValue(value, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function formatItemLine(item) {
  if (!item) return '';
  return `${item.name} · ${item.sku}`;
}

/**
 * Typeahead item picker for stock / forms — searches GET /items?q=
 */
export function ItemSearchSelect({
  value,
  onChange,
  label = 'Item',
  required = false,
  disabled = false,
  placeholder = 'Search name, SKU, barcode…',
  /** Optional preloaded item when selected via attention panel */
  selectedItem: selectedItemProp = null,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const debouncedQ = useDebouncedValue(q.trim(), 250);

  const results = useQuery({
    queryKey: ['items-picker', debouncedQ],
    queryFn: () => api.items.list({ q: debouncedQ }),
    enabled: open && debouncedQ.length >= 1,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selectedItemProp?.id === value) {
      setSelected(selectedItemProp);
      return;
    }
    if (selected?.id === value) return;
    const hit = (results.data || []).find((i) => i.id === value);
    if (hit) setSelected(hit);
  }, [value, results.data, selected?.id, selectedItemProp]);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const options = results.data || [];

  function pick(item) {
    setSelected(item);
    setQ('');
    setOpen(false);
    onChange(item.id, item);
  }

  function clear() {
    setSelected(null);
    setQ('');
    onChange('', null);
  }

  const display = open || q ? q : selected ? formatItemLine(selected) : '';

  return (
    <label className="relative block" ref={rootRef}>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          required={required && !value}
          placeholder={placeholder}
          value={display}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (selected) {
              setSelected(null);
              onChange('', null);
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="btn-ghost shrink-0 !px-3"
            onClick={clear}
            disabled={disabled}
          >
            Clear
          </button>
        ) : null}
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-panel shadow-md"
        >
          {debouncedQ.length < 1 ? (
            <li className="px-3 py-2 text-sm text-muted">
              Type to search by name, SKU, or barcode.
            </li>
          ) : results.isFetching ? (
            <li className="px-3 py-2 text-sm text-muted">Searching…</li>
          ) : !options.length ? (
            <li className="px-3 py-2 text-sm text-muted">No items match.</li>
          ) : (
            options.slice(0, 40).map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                  onClick={() => pick(i)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {i.name}
                    </span>
                    <span className="text-xs text-muted">
                      {i.sku}
                      {i.category?.name ? ` · ${i.category.name}` : ''} ·{' '}
                      {Number(i.currentStock)} {i.unit}
                    </span>
                  </span>
                  <StatusBadge status={i.status} />
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <input
        tabIndex={-1}
        className="sr-only"
        value={value || ''}
        required={required}
        onChange={() => {}}
        aria-hidden
      />
    </label>
  );
}
