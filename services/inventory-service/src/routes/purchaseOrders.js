import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals, deriveItemStatus } from '../db.js';
import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';
import { resolveDefaultWarehouse } from './warehouses.js';
import { maybeCreateAutoPr } from './purchaseRequisitions.js';

const lineSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.string().uuid(),
  expectedDate: z.string().optional().nullable(),
  orderDate: z.string().optional().nullable(),
  isEmergency: z.boolean().optional(),
  emergencyReason: z.string().optional().nullable(),
  items: z.array(lineSchema).min(1),
});

const receiveSchema = z.object({
  warehouseId: z.string().uuid().optional().nullable(),
  lines: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
      })
    )
    .min(1),
});

async function getThreshold(prisma, associationId) {
  const setting = await prisma.associationSetting.findUnique({
    where: { associationId },
  });
  if (setting) return Number(setting.poApprovalThreshold);
  return Number(process.env.PO_APPROVAL_THRESHOLD || 10000);
}

async function nextPoNumber(prisma, associationId) {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({ where: { associationId } });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
}

export function createPurchaseOrderRouter({
  prisma,
  notifications,
  requirePermission,
}) {
  const router = Router();
  const canView = requirePermission('purchaseOrders', 'view');
  const canEdit = requirePermission('purchaseOrders', 'createEdit');
  const canApprove = requirePermission('purchaseOrders', 'approve');
  const canStock = requirePermission('stock', 'createEdit');

  router.get('/', canView, async (req, res, next) => {
    try {
      const rows = await prisma.purchaseOrder.findMany({
        where: { associationId: req.user.associationId },
        include: { supplier: true, items: { include: { item: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.get('/:id', canView, async (req, res, next) => {
    try {
      const row = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: { supplier: true, items: { include: { item: true } } },
      });
      if (!row) return res.status(404).json({ error: 'PO not found' });
      res.json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      if (body.isEmergency && !body.emergencyReason?.trim()) {
        return res
          .status(400)
          .json({ error: 'Emergency POs require an emergencyReason' });
      }
      const total = body.items.reduce(
        (sum, line) => sum + line.quantity * line.unitPrice,
        0
      );
      const poNumber = await nextPoNumber(prisma, req.user.associationId);

      const row = await prisma.purchaseOrder.create({
        data: {
          associationId: req.user.associationId,
          poNumber,
          supplierId: body.supplierId,
          status: 'DRAFT',
          orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
          totalAmount: total,
          createdBy: req.user.id,
          isEmergency: Boolean(body.isEmergency),
          emergencyReason: body.isEmergency ? body.emergencyReason : null,
          pendingPostApproval: false,
          items: {
            create: body.items.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subtotal: line.quantity * line.unitPrice,
            })),
          },
        },
        include: { supplier: true, items: { include: { item: true } } },
      });
      res.status(201).json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  /** Submit for approval (or auto-approve if under threshold). */
  router.post('/:id/submit', canEdit, async (req, res, next) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (po.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Only DRAFT POs can be submitted' });
      }

      const threshold = await getThreshold(prisma, req.user.associationId);
      const total = Number(po.totalAmount);

      let nextStatus = 'PENDING_APPROVAL';
      let approvedBy = null;
      let pendingPostApproval = false;

      if (po.isEmergency) {
        // Emergency path: bypass threshold, require post-hoc sign-off
        nextStatus = 'APPROVED';
        approvedBy = req.user.id;
        pendingPostApproval = true;
      } else if (total <= threshold) {
        nextStatus = 'APPROVED';
        approvedBy = req.user.id;
      }

      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: nextStatus, approvedBy, pendingPostApproval },
        include: { supplier: true, items: { include: { item: true } } },
      });

      if (po.isEmergency) {
        await notifications.emit({
          associationId: req.user.associationId,
          type: ALERT_TYPES.PO_DUE,
          severity: SEVERITY.WARNING,
          relatedEntityType: 'PurchaseOrder',
          relatedEntityId: po.id,
          message: `Emergency PO ${po.poNumber} submitted — post-approval required. Reason: ${po.emergencyReason}`,
        });
      }

      res.json(
        serializeDecimals({
          ...updated,
          approval: {
            required: !po.isEmergency && total > threshold,
            threshold,
            autoApproved: po.isEmergency || total <= threshold,
            emergency: Boolean(po.isEmergency),
            pendingPostApproval,
          },
        })
      );
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/approve', canApprove, async (req, res, next) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (po.status !== 'PENDING_APPROVAL') {
        return res
          .status(400)
          .json({ error: 'Only PENDING_APPROVAL POs can be approved' });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'APPROVED', approvedBy: req.user.id },
        include: { supplier: true, items: { include: { item: true } } },
      });
      res.json(serializeDecimals(updated));
    } catch (e) {
      next(e);
    }
  });

  /** Post-hoc sign-off for emergency POs that bypassed pre-approval. */
  router.post('/:id/post-approve', canApprove, async (req, res, next) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (!po.pendingPostApproval) {
        return res
          .status(400)
          .json({ error: 'PO does not require post-approval' });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          pendingPostApproval: false,
          postApprovedBy: req.user.id,
          postApprovedAt: new Date(),
        },
        include: { supplier: true, items: { include: { item: true } } },
      });
      res.json(serializeDecimals(updated));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/mark-ordered', canEdit, async (req, res, next) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (po.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only APPROVED POs can be ordered' });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'ORDERED', orderDate: po.orderDate || new Date() },
        include: { supplier: true, items: { include: { item: true } } },
      });
      res.json(serializeDecimals(updated));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/cancel', canEdit, async (req, res, next) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: { items: true },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (['RECEIVED', 'CLOSED', 'CANCELLED'].includes(po.status)) {
        return res.status(400).json({ error: `Cannot cancel from ${po.status}` });
      }
      const anyReceived = po.items.some((i) => Number(i.quantityReceived) > 0);
      if (anyReceived) {
        return res
          .status(400)
          .json({ error: 'Cannot cancel a PO that has received quantities' });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'CANCELLED' },
        include: { supplier: true, items: { include: { item: true } } },
      });
      res.json(serializeDecimals(updated));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/receive', canStock, async (req, res, next) => {
    try {
      const body = receiveSchema.parse(req.body);
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: { items: true, supplier: true },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (!['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        return res
          .status(400)
          .json({ error: 'PO must be ORDERED or PARTIALLY_RECEIVED to receive' });
      }

      const defaultWh = await resolveDefaultWarehouse(
        prisma,
        req.user.associationId
      );
      const warehouseId = body.warehouseId || defaultWh.id;

      const result = await prisma.$transaction(async (tx) => {
        for (const line of body.lines) {
          const poi = po.items.find((i) => i.id === line.purchaseOrderItemId);
          if (!poi) {
            const err = new Error('Invalid purchase order line');
            err.status = 400;
            throw err;
          }
          const remaining =
            Number(poi.quantity) - Number(poi.quantityReceived);
          if (line.quantity > remaining + 1e-9) {
            const err = new Error(
              `Receive qty exceeds remaining for line ${poi.id}`
            );
            err.status = 400;
            throw err;
          }

          await tx.purchaseOrderItem.update({
            where: { id: poi.id },
            data: {
              quantityReceived: Number(poi.quantityReceived) + line.quantity,
            },
          });

          const item = await tx.item.findUnique({ where: { id: poi.itemId } });
          const stockBefore = Number(item.currentStock);
          const newStock = stockBefore + line.quantity;
          await tx.item.update({
            where: { id: item.id },
            data: { currentStock: newStock },
          });

          const whStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_itemId: { warehouseId, itemId: item.id },
            },
          });
          const newWhQty = Number(whStock?.quantity || 0) + line.quantity;
          await tx.warehouseStock.upsert({
            where: {
              warehouseId_itemId: { warehouseId, itemId: item.id },
            },
            create: { warehouseId, itemId: item.id, quantity: newWhQty },
            update: { quantity: newWhQty },
          });

          await tx.stockTransaction.create({
            data: {
              associationId: req.user.associationId,
              itemId: poi.itemId,
              warehouseId,
              type: 'IN',
              quantity: line.quantity,
              stockBefore,
              stockAfter: newStock,
              referenceType: 'PURCHASE_ORDER',
              referenceId: po.id,
              performedBy: req.user.id,
              performedByName: req.user.name,
              notes: `Received against ${po.poNumber}`,
              transactionDate: new Date(),
            },
          });
        }

        const refreshed = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: po.id },
        });
        const fullyReceived = refreshed.every(
          (i) => Number(i.quantityReceived) >= Number(i.quantity)
        );
        const anyReceived = refreshed.some(
          (i) => Number(i.quantityReceived) > 0
        );
        const status = fullyReceived
          ? 'CLOSED'
          : anyReceived
            ? 'PARTIALLY_RECEIVED'
            : po.status;

        return tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status },
          include: { supplier: true, items: { include: { item: true } } },
        });
      });

      await notifications.emit({
        associationId: req.user.associationId,
        type: ALERT_TYPES.STOCK_RECEIVED,
        severity: SEVERITY.INFO,
        relatedEntityType: 'PurchaseOrder',
        relatedEntityId: po.id,
        message:
          result.status === 'CLOSED'
            ? `Stock fully received for ${po.poNumber} — PO closed`
            : `Stock received for ${po.poNumber}`,
      });

      // Low-stock check after receipt for each touched item
      for (const line of body.lines) {
        const poi = po.items.find((i) => i.id === line.purchaseOrderItemId);
        const item = await prisma.item.findUnique({ where: { id: poi.itemId } });
        const status = deriveItemStatus(item.currentStock, item.minStockLevel);
        if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') {
          await notifications.emit({
            associationId: req.user.associationId,
            type: ALERT_TYPES.LOW_STOCK,
            severity:
              status === 'OUT_OF_STOCK' ? SEVERITY.CRITICAL : SEVERITY.WARNING,
            relatedEntityType: 'Item',
            relatedEntityId: item.id,
            message: `${item.name} is ${status.replaceAll('_', ' ').toLowerCase()}`,
          });
          await maybeCreateAutoPr({
            prisma,
            associationId: req.user.associationId,
            item,
            createdBy: req.user.id,
          });
        }
      }

      res.json(serializeDecimals(result));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/close', canEdit, async (req, res, next) => {
    try {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!po) return res.status(404).json({ error: 'PO not found' });
      if (po.status !== 'RECEIVED') {
        return res.status(400).json({ error: 'Only RECEIVED POs can be closed' });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'CLOSED' },
        include: { supplier: true, items: { include: { item: true } } },
      });
      res.json(serializeDecimals(updated));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
