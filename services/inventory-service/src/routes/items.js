import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals, withItemStatus } from '../db.js';
import { resolveDefaultWarehouse } from './warehouses.js';

const itemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable().or(z.literal('')),
  categoryId: z.string().uuid(),
  unit: z.string().min(1),
  currentStock: z.coerce.number().nonnegative().optional(),
  minStockLevel: z.coerce.number().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  preferredSupplierId: z.string().uuid().optional().nullable(),
  photoUrl: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (v) => !v || v.startsWith('/') || /^https?:\/\//.test(v),
      'Invalid photo URL'
    ),
});

export function createItemRouter({ prisma, requirePermission }) {
  const router = Router();
  const canEdit = requirePermission('items', 'createEdit');
  const canDelete = requirePermission('items', 'delete');
  const canView = requirePermission('items', 'view');

  router.get('/', canView, async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      const categoryId = String(req.query.categoryId || '').trim();
      const status = String(req.query.status || '')
        .trim()
        .toUpperCase();
      const unit = String(req.query.unit || '').trim();

      const where = {
        associationId: req.user.associationId,
        deletedAt: null,
      };
      if (categoryId) where.categoryId = categoryId;
      if (unit) where.unit = { equals: unit, mode: 'insensitive' };
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { unit: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
        ];
      }
      // Narrow OUT_OF_STOCK in SQL; IN/LOW compared after derive (stock vs min).
      if (status === 'OUT_OF_STOCK') {
        where.currentStock = { lte: 0 };
      }

      const rows = await prisma.item.findMany({
        where,
        include: { category: true },
        orderBy: { updatedAt: 'desc' },
      });

      let mapped = serializeDecimals(rows.map(withItemStatus));
      if (
        status === 'IN_STOCK' ||
        status === 'LOW_STOCK' ||
        status === 'OUT_OF_STOCK'
      ) {
        mapped = mapped.filter((i) => i.status === status);
      }
      res.json(mapped);
    } catch (e) {
      next(e);
    }
  });

  router.get('/:id', canView, async (req, res, next) => {
    try {
      const row = await prisma.item.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
        include: { category: true },
      });
      if (!row) return res.status(404).json({ error: 'Item not found' });
      res.json(serializeDecimals(withItemStatus(row)));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = itemSchema.parse(req.body);
      const opening = body.currentStock ?? 0;
      const wh = await resolveDefaultWarehouse(prisma, req.user.associationId);
      const row = await prisma.$transaction(async (tx) => {
        const item = await tx.item.create({
          data: {
            associationId: req.user.associationId,
            name: body.name,
            sku: body.sku,
            barcode: body.barcode || body.sku,
            categoryId: body.categoryId,
            unit: body.unit,
            currentStock: opening,
            minStockLevel: body.minStockLevel,
            unitPrice: body.unitPrice,
            photoUrl: body.photoUrl || null,
            preferredSupplierId: body.preferredSupplierId || null,
          },
          include: { category: true },
        });
        if (opening > 0) {
          await tx.warehouseStock.create({
            data: {
              warehouseId: wh.id,
              itemId: item.id,
              quantity: opening,
            },
          });
        }
        return item;
      });
      res.status(201).json(serializeDecimals(withItemStatus(row)));
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', canEdit, async (req, res, next) => {
    try {
      const body = itemSchema.omit({ currentStock: true }).parse(req.body);
      const existing = await prisma.item.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Item not found' });
      const row = await prisma.item.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          sku: body.sku,
          barcode: body.barcode || body.sku,
          categoryId: body.categoryId,
          unit: body.unit,
          minStockLevel: body.minStockLevel,
          unitPrice: body.unitPrice,
          photoUrl: body.photoUrl || null,
          preferredSupplierId: body.preferredSupplierId || null,
        },
        include: { category: true },
      });
      res.json(serializeDecimals(withItemStatus(row)));
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', canDelete, async (req, res, next) => {
    try {
      const existing = await prisma.item.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Item not found' });
      await prisma.item.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  return router;
}
