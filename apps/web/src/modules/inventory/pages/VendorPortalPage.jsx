import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { RowActions } from '../components/RowActions.jsx';
import { EmptyState, PageHeader, StatusBadge, inr } from '../components/ui.jsx';

export default function VendorPortalPage() {
  const me = useQuery({ queryKey: ['vendor', 'me'], queryFn: api.vendor.me });
  const pos = useQuery({
    queryKey: ['vendor', 'pos'],
    queryFn: api.vendor.purchaseOrders,
  });

  return (
    <div>
      <PageHeader
        title="Vendor portal"
        subtitle="Supplier-scoped purchase orders (read-only)"
      />

      <div className="panel mb-6">
        {me.isError ? (
          <p className="text-sm text-warn">
            Sign in as a vendor user (role VENDOR with supplier link). Demo:{' '}
            vendor@shree.local / password123
          </p>
        ) : (
          <p className="text-sm">
            <strong>{me.data?.supplier?.name || '…'}</strong>
            {me.data?.user?.email ? (
              <span className="text-muted"> · {me.data.user.email}</span>
            ) : null}
          </p>
        )}
      </div>

      {pos.isError ? (
        <EmptyState message={pos.error.message} />
      ) : (pos.data || []).length === 0 ? (
        <EmptyState message="No purchase orders for your supplier yet" />
      ) : (
        <ul className="space-y-3">
          {(pos.data || []).map((po) => (
            <li key={po.id} className="panel">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{po.poNumber}</p>
                  <p className="text-xs text-muted">
                    {po.orderDate
                      ? new Date(po.orderDate).toLocaleDateString('en-IN')
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={po.status} />
                  <span className="text-sm font-medium">{inr(po.totalAmount)}</span>
                  <RowActions
                    resource="vendor"
                    entityLabel={po.poNumber}
                    viewTitle={po.poNumber}
                    viewContent={
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-muted">Status</dt>
                          <dd>
                            <StatusBadge status={po.status} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Total</dt>
                          <dd>{inr(po.totalAmount)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Lines</dt>
                          <dd>
                            <ul className="mt-1 space-y-1">
                              {(po.items || []).map((line) => (
                                <li key={line.id}>
                                  {line.item?.name} · {Number(line.quantity)} ×{' '}
                                  {inr(line.unitPrice)}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      </dl>
                    }
                  />
                </div>
              </div>
              <ul className="space-y-1 text-sm text-muted">
                {(po.items || []).map((line) => (
                  <li key={line.id}>
                    {line.item?.name} · {Number(line.quantity)} ×{' '}
                    {inr(line.unitPrice)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
