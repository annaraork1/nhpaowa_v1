import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals } from '../db.js';

const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export function createWarehouseRouter({ prisma, requirePermission }) {
  const router = Router();
  const canView = requirePermission('warehouses', 'view');
  const canEdit = requirePermission('warehouses', 'createEdit');

  router.get('/', canView, async (req, res, next) => {
    try {
      const rows = await prisma.warehouse.findMany({
        where: { associationId: req.user.associationId, deletedAt: null },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.get('/:id/stock', canView, async (req, res, next) => {
    try {
      const rows = await prisma.warehouseStock.findMany({
        where: {
          warehouseId: req.params.id,
          warehouse: { associationId: req.user.associationId },
        },
        include: { item: true },
        orderBy: { updatedAt: 'desc' },
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = warehouseSchema.parse(req.body);
      if (body.isDefault) {
        await prisma.warehouse.updateMany({
          where: { associationId: req.user.associationId },
          data: { isDefault: false },
        });
      }
      const row = await prisma.warehouse.create({
        data: {
          associationId: req.user.associationId,
          code: body.code,
          name: body.name,
          address: body.address || null,
          isDefault: Boolean(body.isDefault),
        },
      });
      res.status(201).json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', canEdit, async (req, res, next) => {
    try {
      const body = warehouseSchema.parse(req.body);
      const existing = await prisma.warehouse.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Warehouse not found' });
      if (body.isDefault) {
        await prisma.warehouse.updateMany({
          where: { associationId: req.user.associationId },
          data: { isDefault: false },
        });
      }
      const row = await prisma.warehouse.update({
        where: { id: existing.id },
        data: {
          code: body.code,
          name: body.name,
          address: body.address || null,
          isDefault: Boolean(body.isDefault),
        },
      });
      res.json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  return router;
}

export async function resolveDefaultWarehouse(prisma, associationId) {
  let wh = await prisma.warehouse.findFirst({
    where: { associationId, deletedAt: null, isDefault: true },
  });
  if (!wh) {
    wh = await prisma.warehouse.findFirst({
      where: { associationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }
  if (!wh) {
    wh = await prisma.warehouse.create({
      data: {
        associationId,
        code: 'MAIN',
        name: 'Main Store',
        isDefault: true,
      },
    });
  }
  return wh;
}
