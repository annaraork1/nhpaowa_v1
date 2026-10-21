import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatFlatLabel, formatCampusFlatId } from '@nhpaowa/shared-ui';
import { api } from '../../inventory/api/client.js';

const NOT_FOUND = 'This flat is not in the register.';

/**
 * Flat picker backed by the seeded register (client filter).
 * Used on NOC, Moves, and any form that picks a flat.
 */
export function FlatSearchSelect({
  value,
  onChange,
  label = 'Flat',
  required = false,
  excludeIds = [],
  disabled = false,
  placeholder = 'Search tower or flat (e.g. T21031)…',
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const exclude = useMemo(
    () => new Set(excludeIds.filter(Boolean)),
    [excludeIds]
  );

  const register = useQuery({
    queryKey: ['flats-register-picker'],
    queryFn: () => api.association.flats.list({ limit: 0, offset: 0 }),
    staleTime: 60_000,
  });

  const allFlats = useMemo(() => {
    const items = register.data?.items || register.data || [];
    return Array.isArray(items) ? items : [];
  }, [register.data]);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;
    const hit = allFlats.find((f) => f.id === value);
    if (hit) setSelected(hit);
  }, [value, allFlats, selected?.id]);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const needle = q.trim().toLowerCase();
  const options = useMemo(() => {
    const base = allFlats.filter((f) => !exclude.has(f.id));
    if (!needle) return base.slice(0, 100);
    return base
      .filter((f) => {
        const campus = formatCampusFlatId(f.tower, f.flatNumber).toLowerCase();
        const labelTxt = formatFlatLabel(f).toLowerCase();
        const owner = (f.members?.[0]?.name || '').toLowerCase();
        const phone = (f.members?.[0]?.phone || '').toLowerCase();
        return (
          campus.includes(needle) ||
          labelTxt.includes(needle) ||
          String(f.tower).toLowerCase().includes(needle) ||
          String(f.flatNumber).toLowerCase().includes(needle) ||
          owner.includes(needle) ||
          phone.includes(needle)
        );
      })
      .slice(0, 100);
  }, [allFlats, exclude, needle]);

  function pick(flat) {
    setSelected(flat);
    setQ('');
    setOpen(false);
    onChange(flat.id, flat);
  }

  function clear() {
    setSelected(null);
    setQ('');
    onChange('', null);
  }

  const display =
    open || q
      ? q
      : selected
        ? formatFlatLabel(selected)
        : '';

  const showNotFound =
    open &&
    needle.length > 0 &&
    !register.isLoading &&
    !register.isFetching &&
    options.length === 0 &&
    allFlats.length > 0;

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
      {showNotFound ? (
        <p className="mt-1 text-xs text-danger" role="status">
          {NOT_FOUND}
        </p>
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-surface shadow-md"
        >
          {register.isLoading ? (
            <li className="px-3 py-2 text-sm text-muted">Loading flats…</li>
          ) : showNotFound ? (
            <li className="px-3 py-2 text-sm text-danger">{NOT_FOUND}</li>
          ) : !allFlats.length ? (
            <li className="px-3 py-2 text-sm text-muted">
              No flats in the register yet.
            </li>
          ) : !options.length ? (
            <li className="px-3 py-2 text-sm text-muted">{NOT_FOUND}</li>
          ) : (
            <>
              {!needle ? (
                <li className="border-b border-line px-3 py-1.5 text-[11px] text-muted">
                  Flats from the register — type to filter
                </li>
              ) : null}
              {options.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    role="option"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-brand/10"
                    onClick={() => pick(f)}
                  >
                    <span className="font-medium text-ink">
                      {formatFlatLabel(f)}
                    </span>
                    {f.members?.[0]?.name ? (
                      <span className="ml-2 text-muted">
                        {f.members[0].name}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </>
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
