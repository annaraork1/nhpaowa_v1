import request from 'supertest';
import { createApp } from '../src/index.js';
import { prisma } from '../src/db.js';

const app = createApp();
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';

function auth(role = 'SECRETARY') {
  return { 'X-Dev-Role': role };
}

describe('PO lifecycle + approval', () => {
  let supplierId;
  let itemId;
  let poId;

  beforeAll(async () => {
    await prisma.associationSetting.upsert({
      where: { associationId: ASSOCIATION_ID },
      create: { associationId: ASSOCIATION_ID, poApprovalThreshold: 1000 },
      update: { poApprovalThreshold: 1000 },
    });

    const cat = await request(app)
      .post('/api/inventory/categories')
      .set(auth())
      .send({ name: `PO Cat ${Date.now()}` });
    const item = await request(app)
      .post('/api/inventory/items')
      .set(auth())
      .send({
        name: 'PO Item',
        sku: `POI-${Date.now()}`,
        categoryId: cat.body.id,
        unit: 'pcs',
        currentStock: 0,
        minStockLevel: 1,
        unitPrice: 100,
      });
    itemId = item.body.id;
    const sup = await request(app)
      .post('/api/inventory/suppliers')
      .set(auth())
      .send({ name: `PO Supplier ${Date.now()}` });
    supplierId = sup.body.id;
  });

  test('above threshold requires approval', async () => {
    const create = await request(app)
      .post('/api/inventory/purchase-orders')
      .set(auth())
      .send({
        supplierId,
        items: [{ itemId, quantity: 20, unitPrice: 100 }],
      });
    expect(create.status).toBe(201);
    poId = create.body.id;
    expect(Number(create.body.totalAmount)).toBe(2000);

    const submit = await request(app)
      .post(`/api/inventory/purchase-orders/${poId}/submit`)
      .set(auth());
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('PENDING_APPROVAL');

    const approve = await request(app)
      .post(`/api/inventory/purchase-orders/${poId}/approve`)
      .set(auth('TREASURER'));
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('APPROVED');
  });

  test('emergency PO bypasses and needs post-approve', async () => {
    const create = await request(app)
      .post('/api/inventory/purchase-orders')
      .set(auth())
      .send({
        supplierId,
        isEmergency: true,
        emergencyReason: 'Lift outage',
        items: [{ itemId, quantity: 50, unitPrice: 100 }],
      });
    expect(create.status).toBe(201);

    const submit = await request(app)
      .post(`/api/inventory/purchase-orders/${create.body.id}/submit`)
      .set(auth());
    expect(submit.body.status).toBe('APPROVED');
    expect(submit.body.pendingPostApproval).toBe(true);

    const post = await request(app)
      .post(`/api/inventory/purchase-orders/${create.body.id}/post-approve`)
      .set(auth('SECRETARY'));
    expect(post.status).toBe(200);
    expect(post.body.pendingPostApproval).toBe(false);
  });

  test('receive fully auto-closes PO and increments stock', async () => {
    const beforeItem = await request(app)
      .get(`/api/inventory/items/${itemId}`)
      .set(auth());
    const beforeStock = Number(beforeItem.body.currentStock);

    await request(app)
      .post(`/api/inventory/purchase-orders/${poId}/mark-ordered`)
      .set(auth());

    const po = await request(app)
      .get(`/api/inventory/purchase-orders/${poId}`)
      .set(auth());
    const line = po.body.items[0];

    const receive = await request(app)
      .post(`/api/inventory/purchase-orders/${poId}/receive`)
      .set(auth())
      .send({
        lines: [
          {
            purchaseOrderItemId: line.id,
            quantity: Number(line.quantity) - Number(line.quantityReceived),
          },
        ],
      });
    expect(receive.status).toBe(200);
    expect(receive.body.status).toBe('CLOSED');

    const afterItem = await request(app)
      .get(`/api/inventory/items/${itemId}`)
      .set(auth());
    expect(Number(afterItem.body.currentStock)).toBe(
      beforeStock + Number(line.quantity)
    );
  });
});
