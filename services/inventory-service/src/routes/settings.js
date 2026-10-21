import { Router } from 'express';
import { z } from 'zod';
import { serializeDecimals } from '../db.js';
const updateSchema = z.object({
  poApprovalThreshold: z.coerce.number().nonnegative().optional(),
  autoPrOnLowStock: z.boolean().optional(),
  defaultWarehouseId: z.string().uuid().optional().nullable(),
});

export function createSettingsRouter({ prisma, requirePermission }) {
  const router = Router();
  const canView = requirePermission('settings', 'view');
  const canEdit = requirePermission('settings', 'createEdit');

  router.get('/', canView, async (req, res, next) => {
    try {
      let setting = await prisma.associationSetting.findUnique({
        where: { associationId: req.user.associationId },
      });
      if (!setting) {
        setting = await prisma.associationSetting.create({
          data: {
            associationId: req.user.associationId,
            poApprovalThreshold: Number(
              process.env.PO_APPROVAL_THRESHOLD || 10000
            ),
            autoPrOnLowStock: false,
          },
        });
      }
      res.json(serializeDecimals(setting));
    } catch (e) {
      next(e);
    }
  });

  router.put('/', canEdit, async (req, res, next) => {
    try {
      const body = updateSchema.parse(req.body);
      const setting = await prisma.associationSetting.upsert({
        where: { associationId: req.user.associationId },
        create: {
          associationId: req.user.associationId,
          poApprovalThreshold:
            body.poApprovalThreshold ??
            Number(process.env.PO_APPROVAL_THRESHOLD || 10000),
          autoPrOnLowStock: body.autoPrOnLowStock ?? false,
          defaultWarehouseId: body.defaultWarehouseId || null,
        },
        update: {
          ...(body.poApprovalThreshold != null
            ? { poApprovalThreshold: body.poApprovalThreshold }
            : {}),
          ...(body.autoPrOnLowStock != null
            ? { autoPrOnLowStock: body.autoPrOnLowStock }
            : {}),
          ...(body.defaultWarehouseId !== undefined
            ? { defaultWarehouseId: body.defaultWarehouseId }
            : {}),
        },
      });
      res.json(serializeDecimals(setting));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
