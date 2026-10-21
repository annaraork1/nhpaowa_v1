import { Router } from 'express';
import { serializeDecimals } from '../db.js';

export function createAlertsRouter({ notifications }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const unreadOnly = req.query.unread === 'true';
      const rows = await notifications.list({
        associationId: req.user.associationId,
        unreadOnly,
        take: Number(req.query.take || 50),
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.patch('/:id/read', async (req, res, next) => {
    try {
      await notifications.markRead({
        associationId: req.user.associationId,
        id: req.params.id,
      });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
