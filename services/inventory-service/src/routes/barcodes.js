import { Router } from 'express';
import bwipjs from 'bwip-js';
import { serializeDecimals, withItemStatus } from '../db.js';

export function createBarcodeRouter({ prisma }) {
  const router = Router();

  router.get('/lookup/:code', async (req, res, next) => {
    try {
      const code = decodeURIComponent(req.params.code);
      const item = await prisma.item.findFirst({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          OR: [{ barcode: code }, { sku: code }],
        },
        include: { category: true, warehouseStocks: { include: { warehouse: true } } },
      });
      if (!item) return res.status(404).json({ error: 'No item for barcode/SKU' });
      res.json(serializeDecimals(withItemStatus(item)));
    } catch (e) {
      next(e);
    }
  });

  router.get('/:itemId.png', async (req, res, next) => {
    try {
      const item = await prisma.item.findFirst({
        where: {
          id: req.params.itemId,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      const text = item.barcode || item.sku;
      const png = await bwipjs.toBuffer({
        bcid: 'code128',
        text,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center',
      });
      res.setHeader('Content-Type', 'image/png');
      res.send(png);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
