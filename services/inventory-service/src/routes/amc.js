import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals } from '../db.js';

const amcSchema = z.object({
  itemId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid(),
  description: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  reminderLeadDays: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'RENEWED']).optional(),
});

export function createAmcRouter({ prisma, requirePermission }) {
  const router = Router();
  const canView = requirePermission('amc', 'view');
  const canEdit = requirePermission('amc', 'createEdit');
  const canDelete = requirePermission('amc', 'delete');

  router.get('/', canView, async (req, res, next) => {
    try {
      const rows = await prisma.amcContract.findMany({
        where: { associationId: req.user.associationId },
        include: { item: true, vendor: true },
        orderBy: { endDate: 'asc' },
      });
      res.json(serializeDecimals(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = amcSchema.parse(req.body);
      const row = await prisma.amcContract.create({
        data: {
          associationId: req.user.associationId,
          itemId: body.itemId || null,
          vendorId: body.vendorId,
          description: body.description,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          reminderLeadDays: body.reminderLeadDays ?? 15,
          status: body.status || 'ACTIVE',
        },
        include: { item: true, vendor: true },
      });
      res.status(201).json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', canEdit, async (req, res, next) => {
    try {
      const body = amcSchema.parse(req.body);
      const existing = await prisma.amcContract.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!existing) return res.status(404).json({ error: 'AMC not found' });
      const row = await prisma.amcContract.update({
        where: { id: existing.id },
        data: {
          itemId: body.itemId || null,
          vendorId: body.vendorId,
          description: body.description,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          reminderLeadDays: body.reminderLeadDays ?? existing.reminderLeadDays,
          status: body.status || existing.status,
        },
        include: { item: true, vendor: true },
      });
      res.json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/renew', canEdit, async (req, res, next) => {
    try {
      const body = z
        .object({
          endDate: z.string(),
          startDate: z.string().optional(),
          reminderLeadDays: z.coerce.number().int().positive().optional(),
        })
        .parse(req.body);
      const existing = await prisma.amcContract.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!existing) return res.status(404).json({ error: 'AMC not found' });

      await prisma.amcContract.update({
        where: { id: existing.id },
        data: { status: 'RENEWED' },
      });

      const renewed = await prisma.amcContract.create({
        data: {
          associationId: req.user.associationId,
          itemId: existing.itemId,
          vendorId: existing.vendorId,
          description: existing.description,
          startDate: body.startDate
            ? new Date(body.startDate)
            : existing.endDate,
          endDate: new Date(body.endDate),
          reminderLeadDays: body.reminderLeadDays ?? existing.reminderLeadDays,
          status: 'ACTIVE',
        },
        include: { item: true, vendor: true },
      });
      res.status(201).json(serializeDecimals(renewed));
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', canDelete, async (req, res, next) => {
    try {
      const existing = await prisma.amcContract.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!existing) return res.status(404).json({ error: 'AMC not found' });
      await prisma.amcContract.update({
        where: { id: existing.id },
        data: { status: 'EXPIRED' },
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  return router;
}
