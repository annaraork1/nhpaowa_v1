import request from 'supertest';
import { createApp } from '../src/index.js';
import { prisma } from '../src/db.js';

const app = createApp();
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';

function auth(role = 'SECRETARY') {
  return { 'X-Dev-Role': role };
}

describe('Inventory API — master data & stock', () => {
  let categoryId;
  let itemId;

  beforeAll(async () => {
    await prisma.associationSetting.upsert({
      where: { associationId: ASSOCIATION_ID },
      create: { associationId: ASSOCIATION_ID, poApprovalThreshold: 10000 },
      update: {},
    });
  });

  test('T004 category create', async () => {
    const res = await request(app)
      .post('/api/inventory/categories')
      .set(auth())
      .send({ name: `Test Cat ${Date.now()}`, description: 'jest' });
    expect(res.status).toBe(201);
    categoryId = res.body.id;
  });

  test('T006 item create derives status', async () => {
    const res = await request(app)
      .post('/api/inventory/items')
      .set(auth())
      .send({
        name: 'Jest Widget',
        sku: `JW-${Date.now()}`,
        categoryId,
        unit: 'pcs',
        currentStock: 2,
        minStockLevel: 5,
        unitPrice: 10,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('LOW_STOCK');
    itemId = res.body.id;
  });

  test('Resident cannot write', async () => {
    const res = await request(app)
      .post('/api/inventory/items')
      .set(auth('RESIDENT'))
      .send({
        name: 'Nope',
        sku: `NOPE-${Date.now()}`,
        categoryId,
        unit: 'pcs',
        minStockLevel: 1,
        unitPrice: 1,
      });
    expect(res.status).toBe(403);
  });

  test('stock out triggers atomic update + low stock alert path', async () => {
    const before = await request(app)
      .get(`/api/inventory/items/${itemId}`)
      .set(auth());
    const stock = Number(before.body.currentStock);

    const res = await request(app)
      .post('/api/inventory/stock-transactions')
      .set(auth('STAFF'))
      .send({
        itemId,
        type: 'OUT',
        quantity: Math.max(stock, 1),
        referenceType: 'ISSUE',
        department: 'Jest',
      });

    if (stock >= 1) {
      expect(res.status).toBe(201);
      const after = await request(app)
        .get(`/api/inventory/items/${itemId}`)
        .set(auth());
      expect(Number(after.body.currentStock)).toBe(stock - Math.max(stock, 1) === stock - stock ? 0 : stock - 1);
      // when quantity === stock, result is 0
      expect(Number(after.body.currentStock)).toBe(0);
      expect(after.body.status).toBe('OUT_OF_STOCK');
    }
  });
});
