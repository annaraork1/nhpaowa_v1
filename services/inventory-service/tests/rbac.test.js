import { createApp } from '../src/index.js';
import request from 'supertest';
import { can, ROLES } from '@nhpaowa/shared-auth';

describe('RBAC permission matrix', () => {
  test('resident cannot createEdit or delete items', () => {
    expect(can(ROLES.RESIDENT, 'items', 'view')).toBe(true);
    expect(can(ROLES.RESIDENT, 'items', 'createEdit')).toBe(false);
    expect(can(ROLES.RESIDENT, 'items', 'delete')).toBe(false);
    expect(can(ROLES.RESIDENT, 'stock', 'createEdit')).toBe(false);
  });

  test('staff can stock but not delete items or settings', () => {
    expect(can(ROLES.STAFF, 'stock', 'createEdit')).toBe(true);
    expect(can(ROLES.STAFF, 'items', 'delete')).toBe(false);
    expect(can(ROLES.STAFF, 'settings', 'view')).toBe(false);
  });

  test('secretary has delete and settings', () => {
    expect(can(ROLES.SECRETARY, 'items', 'delete')).toBe(true);
    expect(can(ROLES.SECRETARY, 'settings', 'createEdit')).toBe(true);
  });

  test('superadmin manages users; secretary does not', () => {
    expect(can(ROLES.SUPERADMIN, 'users', 'createEdit')).toBe(true);
    expect(can(ROLES.SUPERADMIN, 'items', 'delete')).toBe(true);
    expect(can(ROLES.SECRETARY, 'users', 'view')).toBe(false);
    expect(can(ROLES.STAFF, 'users', 'createEdit')).toBe(false);
  });

  test('API denies resident item create and staff item delete', async () => {
    const app = createApp();
    const cats = await request(app)
      .get('/api/inventory/categories')
      .set('X-Dev-Role', 'SECRETARY');
    const categoryId = cats.body[0]?.id;
    expect(categoryId).toBeTruthy();

    const denied = await request(app)
      .post('/api/inventory/items')
      .set('X-Dev-Role', 'RESIDENT')
      .send({
        name: 'Hack',
        sku: `RBAC-${Date.now()}`,
        categoryId,
        unit: 'pcs',
        minStockLevel: 1,
        unitPrice: 1,
      });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/inventory/items')
      .set('X-Dev-Role', 'SECRETARY')
      .send({
        name: 'RBAC Temp',
        sku: `RBAC-DEL-${Date.now()}`,
        categoryId,
        unit: 'pcs',
        minStockLevel: 1,
        unitPrice: 1,
      });
    expect(created.status).toBe(201);

    const staffDelete = await request(app)
      .delete(`/api/inventory/items/${created.body.id}`)
      .set('X-Dev-Role', 'STAFF');
    expect(staffDelete.status).toBe(403);

    const secDelete = await request(app)
      .delete(`/api/inventory/items/${created.body.id}`)
      .set('X-Dev-Role', 'SECRETARY');
    expect(secDelete.status).toBe(204);
  });
});
