import { Router } from 'express';
import { serializeDecimals, deriveItemStatus } from '../db.js';

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfPrevMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

export function createDashboardRouter({ prisma }) {
  const router = Router();

  router.get('/summary', async (req, res, next) => {
    try {
      const associationId = req.user.associationId;
      const items = await prisma.item.findMany({
        where: { associationId, deletedAt: null },
      });
      const totalItems = items.length;
      const totalStockValue = items.reduce(
        (sum, i) => sum + Number(i.currentStock) * Number(i.unitPrice),
        0
      );
      const lowStockItems = items.filter((i) => {
        const s = deriveItemStatus(i.currentStock, i.minStockLevel);
        return s === 'LOW_STOCK' || s === 'OUT_OF_STOCK';
      }).length;

      const pendingWhere = {
        associationId,
        status: {
          in: ['PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'],
        },
      };
      const [pendingPurchaseOrders, pendingAgg] = await Promise.all([
        prisma.purchaseOrder.count({ where: pendingWhere }),
        prisma.purchaseOrder.aggregate({
          where: pendingWhere,
          _sum: { totalAmount: true },
        }),
      ]);

      const monthStart = startOfMonth();
      const prevStart = startOfPrevMonth();
      const itemsAddedThisMonth = await prisma.item.count({
        where: {
          associationId,
          deletedAt: null,
          createdAt: { gte: monthStart },
        },
      });
      const itemsAddedPrevMonth = await prisma.item.count({
        where: {
          associationId,
          deletedAt: null,
          createdAt: { gte: prevStart, lt: monthStart },
        },
      });

      // Approximate stock-value MoM from OUT/IN value this vs prev month
      const [txThis, txPrev] = await Promise.all([
        prisma.stockTransaction.findMany({
          where: { associationId, transactionDate: { gte: monthStart } },
          include: { item: true },
        }),
        prisma.stockTransaction.findMany({
          where: {
            associationId,
            transactionDate: { gte: prevStart, lt: monthStart },
          },
          include: { item: true },
        }),
      ]);
      const netValue = (rows) =>
        rows.reduce((sum, t) => {
          const v = Number(t.quantity) * Number(t.item?.unitPrice || 0);
          return sum + (t.type === 'IN' ? v : -v);
        }, 0);
      const netThis = netValue(txThis);
      const netPrev = netValue(txPrev);
      const stockValueDeltaPct =
        netPrev === 0
          ? netThis === 0
            ? 0
            : 100
          : Math.round(((netThis - netPrev) / Math.abs(netPrev)) * 100);

      res.json(
        serializeDecimals({
          totalItems,
          totalStockValue,
          pendingPurchaseOrders,
          pendingPurchaseOrderValue: pendingAgg._sum.totalAmount || 0,
          lowStockItems,
          deltas: {
            itemsThisMonth: itemsAddedThisMonth,
            itemsPrevMonth: itemsAddedPrevMonth,
            stockValuePct: stockValueDeltaPct,
          },
        })
      );
    } catch (e) {
      next(e);
    }
  });

  router.get('/stock-value-by-category', async (req, res, next) => {
    try {
      const items = await prisma.item.findMany({
        where: { associationId: req.user.associationId, deletedAt: null },
        include: { category: true },
      });
      const map = new Map();
      let total = 0;
      for (const item of items) {
        const key = item.category?.name || 'Others';
        const value = Number(item.currentStock) * Number(item.unitPrice);
        map.set(key, (map.get(key) || 0) + value);
        total += value;
      }
      res.json(
        [...map.entries()]
          .map(([category, value]) => ({
            category,
            value,
            percent: total ? Math.round((value / total) * 100) : 0,
          }))
          .sort((a, b) => b.value - a.value)
      );
    } catch (e) {
      next(e);
    }
  });

  router.get('/top-consumed', async (req, res, next) => {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - 3);
      const rows = await prisma.stockTransaction.groupBy({
        by: ['itemId'],
        where: {
          associationId: req.user.associationId,
          type: 'OUT',
          transactionDate: { gte: since },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      });
      const items = await prisma.item.findMany({
        where: { id: { in: rows.map((r) => r.itemId) } },
      });
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      res.json(
        serializeDecimals(
          rows.map((r) => ({
            itemId: r.itemId,
            name: byId[r.itemId]?.name || 'Unknown',
            quantity: r._sum.quantity || 0,
          }))
        )
      );
    } catch (e) {
      next(e);
    }
  });

  router.get('/widgets', async (req, res, next) => {
    try {
      const associationId = req.user.associationId;
      const [recentItems, recentTxns, suppliers, upcomingPos] =
        await Promise.all([
          prisma.item.findMany({
            where: { associationId, deletedAt: null },
            include: { category: true },
            orderBy: { updatedAt: 'desc' },
            take: 6,
          }),
          prisma.stockTransaction.findMany({
            where: { associationId },
            include: { item: true },
            orderBy: { transactionDate: 'desc' },
            take: 6,
          }),
          prisma.supplier.findMany({
            where: { associationId, deletedAt: null },
            take: 20,
          }),
          prisma.purchaseOrder.findMany({
            where: {
              associationId,
              status: { in: ['ORDERED', 'APPROVED', 'PARTIALLY_RECEIVED'] },
            },
            include: {
              supplier: true,
              items: { include: { item: true }, take: 1 },
            },
            orderBy: { expectedDate: 'asc' },
            take: 5,
          }),
        ]);

      const topSuppliers = await Promise.all(
        suppliers.map(async (s) => {
          const agg = await prisma.purchaseOrder.aggregate({
            where: {
              associationId,
              supplierId: s.id,
              status: { not: 'CANCELLED' },
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
          });
          return {
            ...s,
            orderCount: agg._count._all,
            totalValue: agg._sum.totalAmount || 0,
          };
        })
      );
      topSuppliers.sort((a, b) => Number(b.totalValue) - Number(a.totalValue));

      res.json(
        serializeDecimals({
          recentItems: recentItems.map((i) => ({
            ...i,
            status: deriveItemStatus(i.currentStock, i.minStockLevel),
          })),
          recentTransactions: recentTxns,
          topSuppliers: topSuppliers.slice(0, 5),
          upcomingPurchaseOrders: upcomingPos,
        })
      );
    } catch (e) {
      next(e);
    }
  });

  return router;
}
