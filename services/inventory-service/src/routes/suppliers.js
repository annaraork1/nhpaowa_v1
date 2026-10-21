import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals } from '../db.js';
import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';

const supplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
});

export function createSupplierRouter({ prisma, notifications, requirePermission }) {
  const router = Router();
  const canView = requirePermission('suppliers', 'view');
  const canEdit = requirePermission('suppliers', 'createEdit');
  const canDelete = requirePermission('suppliers', 'delete');

  router.get('/', canView, async (req, res, next) => {
    try {
      const rows = await prisma.supplier.findMany({
        where: { associationId: req.user.associationId, deletedAt: null },
        orderBy: { name: 'asc' },
      });

      const withStats = await Promise.all(
        rows.map(async (s) => {
          const aggregates = await prisma.purchaseOrder.aggregate({
            where: {
              associationId: req.user.associationId,
              supplierId: s.id,
              status: { not: 'CANCELLED' },
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
          });
          return {
            ...s,
            orderCount: aggregates._count._all,
            totalValue: aggregates._sum.totalAmount || 0,
          };
        })
      );

      res.json(serializeDecimals(withStats));
    } catch (e) {
      next(e);
    }
  });

  router.post('/', canEdit, async (req, res, next) => {
    try {
      const body = supplierSchema.parse(req.body);
      const row = await prisma.supplier.create({
        data: {
          associationId: req.user.associationId,
          name: body.name,
          contactPerson: body.contactPerson || null,
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
          gstNumber: body.gstNumber || null,
        },
      });
      await notifications.emit({
        associationId: req.user.associationId,
        type: ALERT_TYPES.NEW_SUPPLIER,
        severity: SEVERITY.INFO,
        relatedEntityType: 'Supplier',
        relatedEntityId: row.id,
        message: `New supplier added: ${row.name}`,
      });
      res.status(201).json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', canEdit, async (req, res, next) => {
    try {
      const body = supplierSchema.parse(req.body);
      const existing = await prisma.supplier.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Supplier not found' });
      const row = await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          contactPerson: body.contactPerson || null,
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
          gstNumber: body.gstNumber || null,
        },
      });
      res.json(serializeDecimals(row));
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', canDelete, async (req, res, next) => {
    try {
      const existing = await prisma.supplier.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Supplier not found' });
      await prisma.supplier.update({
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
