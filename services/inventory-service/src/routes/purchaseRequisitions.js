import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals } from '../db.js';

async function nextPrNumber(prisma, associationId) {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseRequisition.count({ where: { associationId } });
  return `PR-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function maybeCreateAutoPr({ prisma, notifications, associationId, item, createdBy }) {
  const setting = await prisma.associationSetting.findUnique({
    where: { associationId },
  });
  if (!setting?.autoPrOnLowStock) return null;

  const existing = await prisma.purchaseRequisition.findFirst({
    where: {
      associationId,
      itemId: item.id,
      status: 'DRAFT',
      source: 'LOW_STOCK',
    },
  });
  if (existing) return existing;

  const qtyNeeded = Math.max(
    Number(item.minStockLevel) * 2 - Number(item.currentStock),
    Number(item.minStockLevel) || 1
  );

  const pr = await prisma.purchaseRequisition.create({
    data: {
      associationId,
      prNumber: await nextPrNumber(prisma, associationId),
      itemId: item.id,
      quantity: qtyNeeded,
      preferredSupplierId: item.preferredSupplierId || null,
      status: 'DRAFT',
      source: 'LOW_STOCK',
      notes: `Auto-created from low stock (${item.name})`,
      createdBy: createdBy || null,
    },
  });
  return pr;
}

export function createPurchaseRequisitionRouter({
  prisma,
  requirePermission,
}) {
  const router = Router();
  const canView = requirePermission('purchaseRequisitions', 'view');
  const canEdit = requirePermission('purchaseRequisitions', 'createEdit');

  router.get('/', canView, async (req, res, next) => {
    try {
      const rows = await prisma.purchaseRequisition.findMany({
        where: { associationId: req.user.associationId },
        include: { item: true, preferredSupplier: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = z
        .object({
          itemId: z.string().uuid(),
          quantity: z.coerce.number().positive(),
          preferredSupplierId: z.string().uuid().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
        .parse(req.body);
      const row = await prisma.purchaseRequisition.create({
        data: {
          associationId: req.user.associationId,
          prNumber: await nextPrNumber(prisma, req.user.associationId),
          itemId: body.itemId,
          quantity: body.quantity,
          preferredSupplierId: body.preferredSupplierId || null,
          notes: body.notes || null,
          source: 'MANUAL',
          createdBy: req.user.id,
        },
        include: { item: true, preferredSupplier: true },
      });
      res.status(201).json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/convert-to-po', canEdit, async (req, res, next) => {
    try {
      const pr = await prisma.purchaseRequisition.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          status: 'DRAFT',
        },
        include: { item: true },
      });
      if (!pr) return res.status(404).json({ error: 'PR not found' });
      const supplierId =
        req.body.supplierId || pr.preferredSupplierId || pr.item.preferredSupplierId;
      if (!supplierId) {
        return res
          .status(400)
          .json({ error: 'supplierId required to convert PR to PO' });
      }

      const year = new Date().getFullYear();
      const count = await prisma.purchaseOrder.count({
        where: { associationId: req.user.associationId },
      });
      const poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
      const unitPrice = Number(pr.item.unitPrice);
      const qty = Number(pr.quantity);

      const po = await prisma.$transaction(async (tx) => {
        const created = await tx.purchaseOrder.create({
          data: {
            associationId: req.user.associationId,
            poNumber,
            supplierId,
            status: 'DRAFT',
            orderDate: new Date(),
            totalAmount: qty * unitPrice,
            createdBy: req.user.id,
            items: {
              create: [
                {
                  itemId: pr.itemId,
                  quantity: qty,
                  unitPrice,
                  subtotal: qty * unitPrice,
                },
              ],
            },
          },
          include: { items: { include: { item: true } }, supplier: true },
        });
        await tx.purchaseRequisition.update({
          where: { id: pr.id },
          data: { status: 'CONVERTED', purchaseOrderId: created.id },
        });
        return created;
      });

      res.status(201).json(serializeDecimals(po));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/cancel', canEdit, async (req, res, next) => {
    try {
      const pr = await prisma.purchaseRequisition.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          status: 'DRAFT',
        },
      });
      if (!pr) return res.status(404).json({ error: 'PR not found' });
      const updated = await prisma.purchaseRequisition.update({
        where: { id: pr.id },
        data: { status: 'CANCELLED' },
      });
      res.json(serializeDecimals(updated));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
