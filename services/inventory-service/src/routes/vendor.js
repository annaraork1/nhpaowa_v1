import { Router } from 'express';
import { requireVendor, requirePermission } from '@nhpaowa/shared-auth';
import { serializeDecimals } from '../db.js';

export function createVendorRouter({ prisma }) {
  const router = Router();
  router.use(requirePermission('vendor', 'view'));
  router.use(requireVendor);

  router.get('/purchase-orders', async (req, res, next) => {
    try {
      const rows = await prisma.purchaseOrder.findMany({
        where: {
          associationId: req.user.associationId,
          supplierId: req.user.supplierId,
          status: { not: 'DRAFT' },
        },
        include: { items: { include: { item: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.get('/purchase-orders/:id', async (req, res, next) => {
    try {
      const row = await prisma.purchaseOrder.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          supplierId: req.user.supplierId,
        },
        include: { items: { include: { item: true } }, supplier: true },
      });
      if (!row) return res.status(404).json({ error: 'PO not found' });
      res.json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.get('/me', async (req, res, next) => {
    try {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: req.user.supplierId,
          associationId: req.user.associationId,
        },
      });
      res.json({ user: req.user, supplier });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
