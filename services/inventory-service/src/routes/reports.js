import { Router } from 'express';
import { serializeDecimals, deriveItemStatus } from '../db.js';
import { sendPdfTable } from '../lib/pdf.js';

function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = c.value(row);
        const s = val == null ? '' : String(val);
        return `"${s.replaceAll('"', '""')}"`;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export function createReportsRouter({ prisma }) {
  const router = Router();

  router.get('/valuation', async (req, res, next) => {
    try {
      const items = await prisma.item.findMany({
        where: { associationId: req.user.associationId, deletedAt: null },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      const rows = items.map((i) => ({
        name: i.name,
        sku: i.sku,
        category: i.category?.name,
        unit: i.unit,
        currentStock: Number(i.currentStock),
        unitPrice: Number(i.unitPrice),
        value: Number(i.currentStock) * Number(i.unitPrice),
        status: deriveItemStatus(i.currentStock, i.minStockLevel),
      }));

      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="stock-valuation.csv"'
        );
        return res.send(
          toCsv(rows, [
            { label: 'Name', value: (r) => r.name },
            { label: 'SKU', value: (r) => r.sku },
            { label: 'Category', value: (r) => r.category },
            { label: 'Stock', value: (r) => r.currentStock },
            { label: 'Unit Price', value: (r) => r.unitPrice },
            { label: 'Value', value: (r) => r.value },
            { label: 'Status', value: (r) => r.status },
          ])
        );
      }
      if (req.query.format === 'pdf') {
        return sendPdfTable(res, {
          title: 'Stock Valuation Report',
          filename: 'stock-valuation.pdf',
          associationId: req.user.associationId,
          columns: [
            { label: 'Name', value: (r) => r.name },
            { label: 'SKU', value: (r) => r.sku },
            { label: 'Category', value: (r) => r.category },
            { label: 'Stock', value: (r) => r.currentStock },
            { label: 'Value', value: (r) => r.value },
          ],
          rows,
        });
      }
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.get('/consumption', async (req, res, next) => {
    try {
      const from = req.query.from
        ? new Date(req.query.from)
        : new Date(Date.now() - 90 * 86400000);
      const to = req.query.to ? new Date(req.query.to) : new Date();
      const grouped = await prisma.stockTransaction.groupBy({
        by: ['itemId'],
        where: {
          associationId: req.user.associationId,
          type: 'OUT',
          transactionDate: { gte: from, lte: to },
        },
        _sum: { quantity: true },
      });
      const items = await prisma.item.findMany({
        where: { id: { in: grouped.map((g) => g.itemId) } },
        include: { category: true },
      });
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const rows = grouped.map((g) => ({
        itemId: g.itemId,
        name: byId[g.itemId]?.name,
        category: byId[g.itemId]?.category?.name,
        quantityOut: Number(g._sum.quantity || 0),
      }));

      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="consumption.csv"'
        );
        return res.send(
          toCsv(rows, [
            { label: 'Item', value: (r) => r.name },
            { label: 'Category', value: (r) => r.category },
            { label: 'Qty Out', value: (r) => r.quantityOut },
          ])
        );
      }
      if (req.query.format === 'pdf') {
        return sendPdfTable(res, {
          title: 'Consumption Report',
          filename: 'consumption.pdf',
          associationId: req.user.associationId,
          columns: [
            { label: 'Item', value: (r) => r.name },
            { label: 'Category', value: (r) => r.category },
            { label: 'Qty Out', value: (r) => r.quantityOut },
          ],
          rows,
        });
      }
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.get('/supplier-spend', async (req, res, next) => {
    try {
      const from = req.query.from
        ? new Date(req.query.from)
        : new Date(Date.now() - 365 * 86400000);
      const to = req.query.to ? new Date(req.query.to) : new Date();
      const pos = await prisma.purchaseOrder.findMany({
        where: {
          associationId: req.user.associationId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: from, lte: to },
        },
        include: { supplier: true },
      });
      const map = new Map();
      for (const po of pos) {
        const key = po.supplierId;
        const cur = map.get(key) || {
          supplierId: key,
          name: po.supplier?.name,
          orderCount: 0,
          totalSpend: 0,
        };
        cur.orderCount += 1;
        cur.totalSpend += Number(po.totalAmount);
        map.set(key, cur);
      }
      const rows = [...map.values()].sort((a, b) => b.totalSpend - a.totalSpend);

      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="supplier-spend.csv"'
        );
        return res.send(
          toCsv(rows, [
            { label: 'Supplier', value: (r) => r.name },
            { label: 'Orders', value: (r) => r.orderCount },
            { label: 'Total Spend', value: (r) => r.totalSpend },
          ])
        );
      }
      if (req.query.format === 'pdf') {
        return sendPdfTable(res, {
          title: 'Supplier Spend Report',
          filename: 'supplier-spend.pdf',
          associationId: req.user.associationId,
          columns: [
            { label: 'Supplier', value: (r) => r.name },
            { label: 'Orders', value: (r) => r.orderCount },
            { label: 'Total Spend', value: (r) => r.totalSpend },
          ],
          rows,
        });
      }
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
