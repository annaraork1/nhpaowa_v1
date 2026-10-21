import { Router } from 'express';
import { serializeDecimals, withItemStatus } from '../db.js';

export function createSearchRouter({ prisma }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) {
        return res.json({ items: [], suppliers: [], purchaseOrders: [] });
      }

      const associationId = req.user.associationId;
      const take = Math.min(Number(req.query.take) || 8, 20);

      const [items, suppliers, purchaseOrders] = await Promise.all([
        prisma.item.findMany({
          where: {
            associationId,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          },
          include: { category: true },
          take,
          orderBy: { name: 'asc' },
        }),
        prisma.supplier.findMany({
          where: {
            associationId,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { contactPerson: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          take,
          orderBy: { name: 'asc' },
        }),
        prisma.purchaseOrder.findMany({
          where: {
            associationId,
            OR: [
              { poNumber: { contains: q, mode: 'insensitive' } },
              { supplier: { name: { contains: q, mode: 'insensitive' } } },
            ],
          },
          include: { supplier: true },
          take,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      res.json(
        serializeDecimals({
          items: items.map(withItemStatus),
          suppliers,
          purchaseOrders,
        })
      );
    } catch (e) {
      next(e);
    }
  });

  return router;
}
