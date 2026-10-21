import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, barcodeImageUrl, getToken } from '../api/client.js';
import {
  EntityCard,
  ResponsiveList,
} from '../components/ResponsiveList.jsx';
import { PageHeader, StatusBadge } from '../components/ui.jsx';

export default function BarcodePage() {
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState('');
  const items = useQuery({ queryKey: ['items'], queryFn: api.items.list });
  const result = useQuery({
    queryKey: ['barcode', lookup],
    queryFn: () => api.barcodes.lookup(lookup),
    enabled: Boolean(lookup),
    retry: false,
  });

  const token = getToken();

  return (
    <div>
      <PageHeader
        title="Barcodes"
        subtitle="Look up by barcode or SKU · print Code128 labels"
      />

      <form
        className="panel mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setLookup(code.trim());
        }}
      >
        <label className="min-w-[220px] flex-1">
          <span className="label">Scan / enter barcode or SKU</span>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="8901000000001 or EL-LED-9W"
            autoFocus
          />
        </label>
        <button className="btn-primary" type="submit">
          Look up
        </button>
      </form>

      {lookup ? (
        <div className="panel mb-6">
          {result.isLoading ? (
            <p className="text-sm text-muted">Looking up…</p>
          ) : result.isError ? (
            <p className="text-sm text-err">{result.error.message}</p>
          ) : result.data ? (
            <div className="flex flex-wrap items-start gap-6">
              <img
                src={barcodeImageUrl(result.data.id)}
                alt={result.data.barcode || result.data.sku}
                className="h-24 rounded border border-line bg-panel p-2"
                crossOrigin="anonymous"
              />
              <div>
                <p className="text-lg font-semibold">{result.data.name}</p>
                <p className="text-sm text-muted">
                  SKU {result.data.sku}
                  {result.data.barcode ? ` · ${result.data.barcode}` : ''}
                </p>
                <p className="mt-2 text-sm">
                  Stock: {Number(result.data.currentStock)} {result.data.unit}{' '}
                  <StatusBadge status={result.data.status} />
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="panel p-0">
        <ResponsiveList
          className="p-3 md:p-0"
          mobile={(items.data || []).map((item) => (
            <EntityCard
              key={item.id}
              title={item.name}
              subtitle={item.sku}
              fields={[
                { label: 'Barcode', value: item.barcode || '—' },
                {
                  label: 'Label',
                  span: 2,
                  value: (
                    <img
                      src={`${barcodeImageUrl(item.id)}${token ? '' : ''}`}
                      alt=""
                      className="mt-1 h-10"
                    />
                  ),
                },
              ]}
            />
          ))}
          desktop={
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 font-medium">SKU</th>
                    <th className="py-2 pr-3 font-medium">Barcode</th>
                    <th className="py-2 font-medium">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {(items.data || []).map((item) => (
                    <tr key={item.id} className="border-b border-line">
                      <td className="py-2 pr-3">{item.name}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{item.sku}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {item.barcode || '—'}
                      </td>
                      <td className="py-2">
                        <img
                          src={`${barcodeImageUrl(item.id)}${token ? '' : ''}`}
                          alt=""
                          className="h-10"
                        />
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
  );
}
