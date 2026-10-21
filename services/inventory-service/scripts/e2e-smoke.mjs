/**
 * End-to-end smoke: create item → PO → approve → receive → stock + alerts.
 * Run: node --env-file=.env services/inventory-service/scripts/e2e-smoke.mjs
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:4001/api/inventory';

async function api(path, { method = 'GET', body, role = 'SECRETARY' } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-Role': role,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data?.error || text}`);
  return data;
}

async function main() {
  const stamp = Date.now();
  const cat = await api('/categories', {
    method: 'POST',
    body: { name: `Smoke Cat ${stamp}` },
  });
  const item = await api('/items', {
    method: 'POST',
    body: {
      name: `Smoke Item ${stamp}`,
      sku: `SMK-${stamp}`,
      categoryId: cat.id,
      unit: 'pcs',
      currentStock: 1,
      minStockLevel: 5,
      unitPrice: 50,
    },
  });
  const supplier = await api('/suppliers', {
    method: 'POST',
    body: { name: `Smoke Supplier ${stamp}` },
  });
  const po = await api('/purchase-orders', {
    method: 'POST',
    body: {
      supplierId: supplier.id,
      items: [{ itemId: item.id, quantity: 10, unitPrice: 50 }],
    },
  });
  let cur = await api(`/purchase-orders/${po.id}/submit`, { method: 'POST' });
  if (cur.status === 'PENDING_APPROVAL') {
    cur = await api(`/purchase-orders/${po.id}/approve`, {
      method: 'POST',
      role: 'TREASURER',
    });
  }
  cur = await api(`/purchase-orders/${po.id}/mark-ordered`, { method: 'POST' });
  const line = cur.items[0];
  cur = await api(`/purchase-orders/${po.id}/receive`, {
    method: 'POST',
    body: {
      lines: [{ purchaseOrderItemId: line.id, quantity: Number(line.quantity) }],
    },
  });
  const after = await api(`/items/${item.id}`);
  const alerts = await api('/alerts');

  console.log(
    JSON.stringify(
      {
        ok: true,
        poStatus: cur.status,
        stock: after.currentStock,
        status: after.status,
        alerts: alerts.length,
      },
      null,
      2
    )
  );
  if (cur.status !== 'CLOSED') process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
