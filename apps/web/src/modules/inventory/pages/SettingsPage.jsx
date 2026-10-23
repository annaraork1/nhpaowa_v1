import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Can } from '../auth/Can.jsx';
import { can } from '../auth/permissions.js';
import { PageHeader, QueryStatus, inr, pendingLabel } from '../components/ui.jsx';

export default function SettingsPage() {
  const qc = useQueryClient();
  const canView = can('settings', 'view');
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
    enabled: canView,
  });
  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: api.warehouses.list,
    enabled: canView,
  });
  const [threshold, setThreshold] = useState('');
  const [autoPr, setAutoPr] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');

  useEffect(() => {
    if (settings.data) {
      setThreshold(String(settings.data.poApprovalThreshold ?? ''));
      setAutoPr(Boolean(settings.data.autoPrOnLowStock));
      setWarehouseId(settings.data.defaultWarehouseId || '');
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      api.settings.update({
        poApprovalThreshold: Number(threshold),
        autoPrOnLowStock: autoPr,
        defaultWarehouseId: warehouseId || null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (!canView) {
    return (
      <div>
        <PageHeader title="Settings" subtitle="Not available for your role" />
        <p className="text-sm text-warn">
          Your role cannot view association settings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Association-level inventory configuration"
      />
      <QueryStatus query={settings} empty="" isEmpty={() => false} />
      {settings.data ? (
      <div className="panel max-w-lg space-y-4">
        <p className="text-sm text-muted">
          Current PO approval threshold:{' '}
          <strong className="text-ink">
            {inr(settings.data?.poApprovalThreshold)}
          </strong>
        </p>
        <Can
          resource="settings"
          action="createEdit"
          fallback={
            <p className="text-sm text-warn">
              Only Secretary can change these settings.
            </p>
          }
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <label>
              <span className="label">PO approval threshold (INR)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoPr}
                onChange={(e) => setAutoPr(e.target.checked)}
              />
              Auto-create purchase requisition on low stock
            </label>
            <label>
              <span className="label">Default warehouse</span>
              <select
                className="input"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">—</option>
                {(warehouses.data || []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-primary" type="submit" disabled={save.isPending}>
              {pendingLabel(save.isPending, 'Save settings')}
            </button>
            {save.isError ? (
              <p className="text-sm text-err">{save.error.message}</p>
            ) : null}
            {save.isSuccess ? (
              <p className="text-sm text-ok">Saved.</p>
            ) : null}
          </form>
        </Can>
      </div>
      ) : null}
    </div>
  );
}
