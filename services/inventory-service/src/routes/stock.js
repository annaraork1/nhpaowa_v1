import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals, deriveItemStatus } from '../db.js';
import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';
import { resolveDefaultWarehouse } from './warehouses.js';
import { maybeCreateAutoPr } from './purchaseRequisitions.js';

const createSchema = z.object({
  itemId: z.string().uuid(),
  warehouseId: z.string().uuid().optional().nullable(),
  type: z.enum(['IN', 'OUT']),
  quantity: z.coerce.number().positive(),
  referenceType: z.enum(['PURCHASE_ORDER', 'MANUAL', 'ADJUSTMENT', 'ISSUE']),
  referenceId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  transactionDate: z.string().optional().nullable(),
});

export function createStockRouter({ prisma, notifications, requirePermission }) {
  const router = Router();
  const canView = requirePermission('stock', 'view');
  const canEdit = requirePermission('stock', 'createEdit');

  router.get('/', canView, async (req, res, next) => {
    try {
      const itemId = String(req.query.itemId || '').trim();
      const warehouseId = String(req.query.warehouseId || '').trim();
      const type = String(req.query.type || '')
        .trim()
        .toUpperCase();
      const q = String(req.query.q || '').trim();
      const from = String(req.query.from || '').trim();
      const to = String(req.query.to || '').trim();
      const takeRaw = Number(req.query.limit);
      const take = Number.isFinite(takeRaw)
        ? Math.min(Math.max(Math.floor(takeRaw), 1), 200)
        : 200;

      const where = {
        associationId: req.user.associationId,
      };
      if (itemId) where.itemId = itemId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (type === 'IN' || type === 'OUT') where.type = type;

      if (from || to) {
        where.transactionDate = {};
        if (from) {
          const start = new Date(`${from}T00:00:00.000Z`);
          if (!Number.isNaN(start.getTime())) {
            where.transactionDate.gte = start;
          }
        }
        if (to) {
          const end = new Date(`${to}T23:59:59.999Z`);
          if (!Number.isNaN(end.getTime())) {
            where.transactionDate.lte = end;
          }
        }
        if (!Object.keys(where.transactionDate).length) {
          delete where.transactionDate;
        }
      }

      if (q) {
        const refMatches = [
          'PURCHASE_ORDER',
          'MANUAL',
          'ADJUSTMENT',
          'ISSUE',
        ].filter(
          (rt) =>
            rt.toLowerCase().includes(q.toLowerCase()) ||
            rt.replaceAll('_', ' ').toLowerCase().includes(q.toLowerCase()),
        );
        where.OR = [
          { performedByName: { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { item: { name: { contains: q, mode: 'insensitive' } } },
          { item: { sku: { contains: q, mode: 'insensitive' } } },
          { warehouse: { name: { contains: q, mode: 'insensitive' } } },
          ...(refMatches.length
            ? [{ referenceType: { in: refMatches } }]
            : []),
        ];
      }

      const rows = await prisma.stockTransaction.findMany({
        where,
        include: { item: true, warehouse: true },
        orderBy: { transactionDate: 'desc' },
        take,
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const defaultWh = await resolveDefaultWarehouse(
        prisma,
        req.user.associationId
      );
      const warehouseId = body.warehouseId || defaultWh.id;

      const txn = await prisma.$transaction(async (tx) => {
        const item = await tx.item.findFirst({
          where: {
            id: body.itemId,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!item) {
          const err = new Error('Item not found');
          err.status = 404;
          throw err;
        }

        const qty = body.quantity;
        let whStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: { warehouseId, itemId: item.id },
          },
        });
        const whQty = Number(whStock?.quantity || 0);
        let newWhQty = whQty;
        const stockBefore = Number(item.currentStock);
        let newStock = stockBefore;

        if (body.type === 'IN') {
          newWhQty += qty;
          newStock += qty;
        } else {
          if (qty > whQty + 1e-9) {
            const err = new Error('Insufficient stock at warehouse');
            err.status = 400;
            throw err;
          }
          newWhQty -= qty;
          newStock -= qty;
        }

        await tx.warehouseStock.upsert({
          where: {
            warehouseId_itemId: { warehouseId, itemId: item.id },
          },
          create: { warehouseId, itemId: item.id, quantity: newWhQty },
          update: { quantity: newWhQty },
        });

        await tx.item.update({
          where: { id: item.id },
          data: { currentStock: newStock },
        });

        return tx.stockTransaction.create({
          data: {
            associationId: req.user.associationId,
            itemId: item.id,
            warehouseId,
            type: body.type,
            quantity: qty,
            stockBefore,
            stockAfter: newStock,
            referenceType: body.referenceType,
            referenceId: body.referenceId || null,
            performedBy: req.user.id,
            performedByName: req.user.name,
            notes: body.notes || null,
            department: body.department || null,
            transactionDate: body.transactionDate
              ? new Date(body.transactionDate)
              : new Date(),
          },
          include: { item: true, warehouse: true },
        });
      });

      const item = await prisma.item.findUnique({ where: { id: body.itemId } });
      const status = deriveItemStatus(item.currentStock, item.minStockLevel);
      if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') {
        await notifications.emit({
          associationId: req.user.associationId,
          type: ALERT_TYPES.LOW_STOCK,
          severity:
            status === 'OUT_OF_STOCK' ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          relatedEntityType: 'Item',
          relatedEntityId: item.id,
          message: `${item.name} is ${status.replaceAll('_', ' ').toLowerCase()} (${Number(item.currentStock)} ${item.unit} left)`,
        });
        await maybeCreateAutoPr({
          prisma,
          associationId: req.user.associationId,
          item,
          createdBy: req.user.id,
        });
      }

      res.status(201).json(serializeDecimals(txn));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
