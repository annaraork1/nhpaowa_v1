import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  formatCampusFlatId,
  parseCampusFlatQuery,
} from '@nhpaowa/shared-ui';

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function last4(phone) {
  const d = digitsOnly(phone);
  return d.length >= 4 ? d.slice(-4) : '';
}

/** Resolve tower + flatNumber from tower number (21031 / T21031) or legacy fields. */
function resolveTowerFlat(body) {
  const towerNumberRaw = String(
    body.towerNumber || body.campusFlatId || body.flatId || ''
  ).trim();
  if (towerNumberRaw) {
    const parsed = parseCampusFlatQuery(towerNumberRaw);
    if (!parsed) {
      return { error: 'Invalid tower number — use e.g. 21031 or T21031' };
    }
    return parsed;
  }
  const tower = String(body.tower || '').trim();
  const flatNumber = String(body.flatNumber || '').trim();
  if (tower && flatNumber) {
    return { tower, flatNumber };
  }
  return { error: 'Enter tower number e.g. 21031 or T21031' };
}

export function createPublicFlatUpdateRouter({ prisma, associationId }) {
  const router = Router();

  router.post('/verify', async (req, res, next) => {
    try {
      const body = z
        .object({
          towerNumber: z.string().optional(),
          campusFlatId: z.string().optional(),
          flatId: z.string().optional(),
          tower: z.string().optional(),
          flatNumber: z.string().optional(),
        })
        .parse(req.body);

      const resolved = resolveTowerFlat(body);
      if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
      }

      const flat = await prisma.flat.findFirst({
        where: {
          associationId,
          tower: resolved.tower,
          flatNumber: resolved.flatNumber,
          deletedAt: null,
        },
        include: {
          members: {
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!flat) {
        return res.status(404).json({
          error: `Flat not found for tower number ${formatCampusFlatId(resolved.tower, resolved.flatNumber)}`,
        });
      }

      const primary =
        flat.members.find((m) => m.role === 'PRIMARY_OWNER') || null;
      const secondary =
        flat.members.find((m) => m.role === 'ASSOCIATE_OWNER') || null;
      const tenant = flat.members.find((m) => m.role === 'TENANT') || null;

      await prisma.flatUpdateSession.deleteMany({
        where: { flatId: flat.id, expiresAt: { lt: new Date() } },
      });

      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.flatUpdateSession.create({
        data: {
          associationId,
          flatId: flat.id,
          token,
          expiresAt,
        },
      });

      const hasExisting =
        Boolean(primary?.name || primary?.phone) ||
        Boolean(secondary?.name || secondary?.phone) ||
        Boolean(tenant?.name || tenant?.phone);

      res.json({
        token,
        expiresAt,
        flat: {
          id: flat.id,
          tower: flat.tower,
          flatNumber: flat.flatNumber,
          campusFlatId: formatCampusFlatId(flat.tower, flat.flatNumber),
          towerNumber: formatCampusFlatId(flat.tower, flat.flatNumber),
          occupancyStatus: flat.occupancyStatus || 'OWNER_OCCUPIED',
          collectionPhase: flat.collectionPhase,
          notes: flat.notes || '',
          hasExisting,
          primaryName: primary?.name || '',
          primaryPhone: primary?.phone || '',
          secondaryName: secondary?.name || '',
          secondaryPhone: secondary?.phone || '',
          tenantName: tenant?.name || '',
          tenantPhone: tenant?.phone || '',
        },
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/submit', async (req, res, next) => {
    try {
      const body = z
        .object({
          token: z.string().min(10),
          occupancyStatus: z.enum([
            'OWNER_OCCUPIED',
            'TENANT_OCCUPIED',
            'VACANT',
          ]),
          primaryName: z.string().min(1),
          primaryPhone: z.string().min(8),
          secondaryName: z.string().optional().nullable(),
          secondaryPhone: z.string().optional().nullable(),
          tenantName: z.string().optional().nullable(),
          tenantPhone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
        .parse(req.body);

      if (body.occupancyStatus === 'TENANT_OCCUPIED') {
        if (!String(body.tenantName || '').trim() || !String(body.tenantPhone || '').trim()) {
          return res.status(400).json({
            error: 'Tenant name and phone are required for tenant-occupied flats',
          });
        }
      }

      const session = await prisma.flatUpdateSession.findFirst({
        where: { token: body.token, associationId },
        include: { flat: true },
      });
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Session expired — verify again' });
      }

      const secondaryName = body.secondaryName?.trim() || null;
      const secondaryPhone = body.secondaryPhone?.trim() || null;
      if ((secondaryName && !secondaryPhone) || (!secondaryName && secondaryPhone)) {
        return res.status(400).json({
          error: 'Secondary owner needs both name and phone, or leave both blank',
        });
      }

      const row = await prisma.flatSelfUpdate.create({
        data: {
          associationId,
          flatId: session.flatId,
          phase: 'P1',
          phoneLast4Used: last4(body.primaryPhone) || '****',
          payload: {
            occupancyStatus: body.occupancyStatus,
            primaryName: body.primaryName.trim(),
            primaryPhone: body.primaryPhone.trim(),
            secondaryName,
            secondaryPhone,
            tenantName: body.tenantName?.trim() || null,
            tenantPhone: body.tenantPhone?.trim() || null,
            notes: body.notes?.trim() || null,
          },
          status: 'PENDING',
        },
      });

      await prisma.flatUpdateSession.delete({ where: { id: session.id } });

      res.status(201).json({
        id: row.id,
        status: row.status,
        message: 'Submitted for association review',
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

export function createFlatSelfUpdateStaffRouter({
  prisma,
  requirePermission,
}) {
  const router = Router();

  router.get(
    '/flat-self-updates',
    requirePermission('flatOwners', 'view'),
    async (req, res, next) => {
      try {
        const status = String(req.query.status || 'PENDING');
        const rows = await prisma.flatSelfUpdate.findMany({
          where: {
            associationId: req.user.associationId,
            ...(status !== 'ALL' ? { status } : {}),
          },
          include: {
            flat: { select: { tower: true, flatNumber: true, occupancyStatus: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        res.json(rows);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/flat-self-updates/:id/approve',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        const row = await prisma.flatSelfUpdate.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
            status: 'PENDING',
          },
          include: { flat: true },
        });
        if (!row) return res.status(404).json({ error: 'Not found' });
        const p = row.payload || {};

        await prisma.$transaction(async (tx) => {
          await tx.flat.update({
            where: { id: row.flatId },
            data: {
              occupancyStatus: p.occupancyStatus || row.flat.occupancyStatus,
              collectionPhase: 'P1_VERIFIED',
              ...(p.notes ? { notes: p.notes } : {}),
            },
          });

          async function upsertMember(role, name, phone) {
            if (!name || !phone) return;
            const existing = await tx.flatMember.findFirst({
              where: {
                flatId: row.flatId,
                role,
                deletedAt: null,
              },
            });
            if (existing) {
              await tx.flatMember.update({
                where: { id: existing.id },
                data: { name, phone, isActive: true },
              });
            } else {
              await tx.flatMember.create({
                data: {
                  flatId: row.flatId,
                  role,
                  name,
                  phone,
                },
              });
            }
          }

          await upsertMember('PRIMARY_OWNER', p.primaryName, p.primaryPhone);
          await upsertMember(
            'ASSOCIATE_OWNER',
            p.secondaryName,
            p.secondaryPhone
          );

          if (p.occupancyStatus === 'TENANT_OCCUPIED') {
            await upsertMember('TENANT', p.tenantName, p.tenantPhone);
          }

          await tx.flatSelfUpdate.update({
            where: { id: row.id },
            data: {
              status: 'APPROVED',
              reviewedAt: new Date(),
              reviewedByUserId: req.user.id || null,
            },
          });
        });

        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/flat-self-updates/:id/reject',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        const reason = String(req.body?.reason || '').trim() || 'Rejected';
        const row = await prisma.flatSelfUpdate.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
            status: 'PENDING',
          },
        });
        if (!row) return res.status(404).json({ error: 'Not found' });
        await prisma.flatSelfUpdate.update({
          where: { id: row.id },
          data: {
            status: 'REJECTED',
            rejectionReason: reason,
            reviewedAt: new Date(),
            reviewedByUserId: req.user.id || null,
          },
        });
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/flats/collection-summary',
    requirePermission('flatOwners', 'view'),
    async (req, res, next) => {
      try {
        const flats = await prisma.flat.findMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          select: { tower: true, collectionPhase: true },
        });
        const byTower = new Map();
        const totals = { total: 0, seed: 0, p1: 0, p2: 0 };
        for (const f of flats) {
          totals.total += 1;
          const phase = f.collectionPhase || 'SEED';
          if (phase === 'P2_HOUSEHOLD') totals.p2 += 1;
          else if (phase === 'P1_VERIFIED') totals.p1 += 1;
          else totals.seed += 1;
          if (!byTower.has(f.tower)) {
            byTower.set(f.tower, { tower: f.tower, total: 0, seed: 0, p1: 0, p2: 0 });
          }
          const t = byTower.get(f.tower);
          t.total += 1;
          if (phase === 'P2_HOUSEHOLD') t.p2 += 1;
          else if (phase === 'P1_VERIFIED') t.p1 += 1;
          else t.seed += 1;
        }
        const towers = [...byTower.values()]
          .map((t) => ({
            ...t,
            p1Pct: t.total
              ? Math.round(((t.p1 + t.p2) / t.total) * 100)
              : 0,
          }))
          .sort((a, b) => a.tower.localeCompare(b.tower));
        res.json({
          towers,
          totals: {
            ...totals,
            p1Pct: totals.total
              ? Math.round(((totals.p1 + totals.p2) / totals.total) * 100)
              : 0,
          },
        });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/flats/update-links.csv',
    requirePermission('flatOwners', 'view'),
    async (req, res, next) => {
      try {
        const base =
          String(req.query.baseUrl || '').replace(/\/$/, '') ||
          'http://localhost:5173';
        const flats = await prisma.flat.findMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          orderBy: [{ tower: 'asc' }, { flatNumber: 'asc' }],
          select: { tower: true, flatNumber: true, collectionPhase: true },
        });
        const lines = [
          'towerNumber,tower,flatNumber,collectionPhase,url',
          ...flats.map((f) => {
            const towerNumber = formatCampusFlatId(f.tower, f.flatNumber);
            const digits = `${f.tower}${f.flatNumber}`;
            const q = new URLSearchParams({ flat: digits });
            const url = `${base}/flat-update?${q.toString()}`;
            return [
              towerNumber,
              f.tower,
              f.flatNumber,
              f.collectionPhase || 'SEED',
              `"${url}"`,
            ].join(',');
          }),
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="flat-update-links.csv"'
        );
        res.send(lines.join('\n'));
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}
