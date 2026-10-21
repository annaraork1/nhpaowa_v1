import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals } from '../db.js';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export function createCategoryRouter({ prisma, requirePermission }) {
  const router = Router();
  const canView = requirePermission('categories', 'view');
  const canEdit = requirePermission('categories', 'createEdit');
  const canDelete = requirePermission('categories', 'delete');

  router.get('/', canView, async (req, res, next) => {
    try {
      const rows = await prisma.category.findMany({
        where: { associationId: req.user.associationId, deletedAt: null },
        orderBy: { name: 'asc' },
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const row = await prisma.category.create({
        data: {
          associationId: req.user.associationId,
          name: body.name,
          description: body.description || null,
        },
      });
      res.status(201).json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', canEdit, async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const existing = await prisma.category.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Category not found' });
      const row = await prisma.category.update({
        where: { id: existing.id },
        data: { name: body.name, description: body.description || null },
      });
      res.json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', canDelete, async (req, res, next) => {
    try {
      const existing = await prisma.category.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Category not found' });
      await prisma.category.update({
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
