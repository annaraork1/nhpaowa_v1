import { Router } from 'express';
import { z } from 'zod';
import { associationCalendarYmd } from '@nhpaowa/shared-ui';
import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';
import {
  parseTimeToDate,
  serializeBusEntity,
  minutesOfTime,
  minutesOfClock,
} from '../lib/time.js';
import {
  csvEscape as csvEsc,
  parseCsv,
  SCHOOL_CSV_TEMPLATE,
  BUS_CSV_TEMPLATE,
} from '../lib/csv.js';
import { buildRegistryPdf, buildDailyTripsPdf } from '../lib/pdf.js';

const directionSchema = z.enum(['PICKUP', 'DROPOFF']);

async function getSettings(prisma, associationId) {
  return (
    (await prisma.busSetting.findUnique({ where: { associationId } })) ||
    (await prisma.busSetting.create({
      data: { associationId },
    }))
  );
}

function csvEscape(v) {
  return csvEsc(v);
}

function fmtClock(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  return x.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function createBusRouter({ prisma, requirePermission, notifications }) {
  const router = Router();

  // ——— Schools ———
  router.get('/schools', requirePermission('schoolBusAdmin', 'view'), async (req, res, next) => {
    try {
      const rows = await prisma.school.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(req.query.activeOnly === 'true' ? { active: true } : {}),
        },
        orderBy: { name: 'asc' },
        include: { buses: { where: { deletedAt: null }, orderBy: { vehicleRegistrationNumber: 'asc' } } },
      });
      res.json(serializeBusEntity(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/schools', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          primaryContactName: z.string().min(1),
          primaryContactPhone: z.string().min(1),
          address: z.string().optional().nullable(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const row = await prisma.school.create({
        data: {
          associationId: req.user.associationId,
          name: body.name,
          primaryContactName: body.primaryContactName,
          primaryContactPhone: body.primaryContactPhone,
          address: body.address || null,
          active: body.active !== false,
        },
      });
      res.status(201).json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  router.patch('/schools/:id', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.school.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'School not found' });
      const body = z
        .object({
          name: z.string().min(1).optional(),
          primaryContactName: z.string().min(1).optional(),
          primaryContactPhone: z.string().min(1).optional(),
          address: z.string().optional().nullable(),
          active: z.boolean().optional(),
          deleted: z.boolean().optional(),
        })
        .parse(req.body);
      const row = await prisma.school.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.primaryContactName !== undefined
            ? { primaryContactName: body.primaryContactName }
            : {}),
          ...(body.primaryContactPhone !== undefined
            ? { primaryContactPhone: body.primaryContactPhone }
            : {}),
          ...(body.address !== undefined ? { address: body.address || null } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
          ...(body.deleted ? { deletedAt: new Date(), active: false } : {}),
        },
      });
      res.json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  router.get(
    '/schools/csv-template',
    requirePermission('schoolBusAdmin', 'view'),
    async (_req, res) => {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="schools-template.csv"'
      );
      res.send(SCHOOL_CSV_TEMPLATE);
    }
  );

  router.get(
    '/schools/export.csv',
    requirePermission('schoolBusAdmin', 'view'),
    async (req, res, next) => {
      try {
        const rows = await prisma.school.findMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        const lines = [
          'name,primary_contact_name,primary_contact_phone,address,active',
          ...rows.map((s) =>
            [
              s.name,
              s.primaryContactName,
              s.primaryContactPhone,
              s.address || '',
              s.active ? 'yes' : 'no',
            ]
              .map(csvEscape)
              .join(',')
          ),
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="schools-export.csv"'
        );
        res.send(lines.join('\n'));
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/schools/import',
    requirePermission('schoolBusAdmin', 'createEdit'),
    async (req, res, next) => {
      try {
        const csv = String(req.body?.csv || '');
        const { rows } = parseCsv(csv);
        if (!rows.length) {
          return res.status(400).json({ error: 'No data rows in CSV' });
        }
        const created = [];
        const updated = [];
        const errors = [];
        for (const row of rows) {
          const name = row.name || row.school_name;
          const contact = row.primary_contact_name || row.contact_name || row.contact;
          const phone =
            row.primary_contact_phone || row.contact_phone || row.phone;
          if (!name || !contact || !phone) {
            errors.push({
              row: row.__row,
              error: 'name, primary_contact_name, primary_contact_phone required',
            });
            continue;
          }
          const address = row.address || null;
          const activeRaw = String(row.active || 'yes').toLowerCase();
          const active = !['no', 'false', '0', 'inactive'].includes(activeRaw);
          const existing = await prisma.school.findFirst({
            where: {
              associationId: req.user.associationId,
              deletedAt: null,
              name: { equals: name, mode: 'insensitive' },
            },
          });
          if (existing) {
            await prisma.school.update({
              where: { id: existing.id },
              data: {
                primaryContactName: contact,
                primaryContactPhone: phone,
                address,
                active,
              },
            });
            updated.push(name);
          } else {
            await prisma.school.create({
              data: {
                associationId: req.user.associationId,
                name,
                primaryContactName: contact,
                primaryContactPhone: phone,
                address,
                active,
              },
            });
            created.push(name);
          }
        }
        res.json({
          created: created.length,
          updated: updated.length,
          errors,
          createdNames: created,
          updatedNames: updated,
        });
      } catch (e) {
        next(e);
      }
    }
  );

  // ——— Buses ———
  router.get('/buses', requirePermission('schoolBusAdmin', 'view'), async (req, res, next) => {
    try {
      const rows = await prisma.bus.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(req.query.activeOnly === 'true' ? { active: true } : {}),
          ...(req.query.schoolId ? { schoolId: String(req.query.schoolId) } : {}),
        },
        orderBy: { vehicleRegistrationNumber: 'asc' },
        include: { school: true, slots: { include: { batch: true } } },
      });
      res.json(serializeBusEntity(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/buses', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          schoolId: z.string().uuid(),
          vehicleRegistrationNumber: z.string().min(1),
          driverName: z.string().min(1),
          driverPhone: z.string().min(1),
          conductorName: z.string().optional().nullable(),
          conductorPhone: z.string().optional().nullable(),
          seatingCapacity: z.number().int().positive().optional().nullable(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const school = await prisma.school.findFirst({
        where: {
          id: body.schoolId,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!school) return res.status(400).json({ error: 'Invalid school' });
      const row = await prisma.bus.create({
        data: {
          associationId: req.user.associationId,
          schoolId: body.schoolId,
          vehicleRegistrationNumber: body.vehicleRegistrationNumber.trim().toUpperCase(),
          driverName: body.driverName,
          driverPhone: body.driverPhone,
          conductorName: body.conductorName || null,
          conductorPhone: body.conductorPhone || null,
          seatingCapacity: body.seatingCapacity ?? null,
          active: body.active !== false,
        },
        include: { school: true },
      });
      res.status(201).json(serializeBusEntity(row));
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'Vehicle registration already exists' });
      }
      next(e);
    }
  });

  router.patch('/buses/:id', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.bus.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'Bus not found' });
      const body = z
        .object({
          schoolId: z.string().uuid().optional(),
          vehicleRegistrationNumber: z.string().min(1).optional(),
          driverName: z.string().min(1).optional(),
          driverPhone: z.string().min(1).optional(),
          conductorName: z.string().optional().nullable(),
          conductorPhone: z.string().optional().nullable(),
          seatingCapacity: z.number().int().positive().optional().nullable(),
          active: z.boolean().optional(),
          deleted: z.boolean().optional(),
        })
        .parse(req.body);
      if (body.schoolId) {
        const school = await prisma.school.findFirst({
          where: {
            id: body.schoolId,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!school) return res.status(400).json({ error: 'Invalid school' });
      }
      const row = await prisma.bus.update({
        where: { id: existing.id },
        data: {
          ...(body.schoolId !== undefined ? { schoolId: body.schoolId } : {}),
          ...(body.vehicleRegistrationNumber !== undefined
            ? {
                vehicleRegistrationNumber: body.vehicleRegistrationNumber
                  .trim()
                  .toUpperCase(),
              }
            : {}),
          ...(body.driverName !== undefined ? { driverName: body.driverName } : {}),
          ...(body.driverPhone !== undefined ? { driverPhone: body.driverPhone } : {}),
          ...(body.conductorName !== undefined
            ? { conductorName: body.conductorName || null }
            : {}),
          ...(body.conductorPhone !== undefined
            ? { conductorPhone: body.conductorPhone || null }
            : {}),
          ...(body.seatingCapacity !== undefined
            ? { seatingCapacity: body.seatingCapacity }
            : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
          ...(body.deleted ? { deletedAt: new Date(), active: false } : {}),
        },
        include: { school: true },
      });
      res.json(serializeBusEntity(row));
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'Vehicle registration already exists' });
      }
      next(e);
    }
  });

  router.get(
    '/buses/csv-template',
    requirePermission('schoolBusAdmin', 'view'),
    async (_req, res) => {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="buses-template.csv"'
      );
      res.send(BUS_CSV_TEMPLATE);
    }
  );

  router.get(
    '/buses/export.csv',
    requirePermission('schoolBusAdmin', 'view'),
    async (req, res, next) => {
      try {
        const rows = await prisma.bus.findMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          include: { school: true },
          orderBy: { vehicleRegistrationNumber: 'asc' },
        });
        const lines = [
          'school_name,vehicle_registration_number,driver_name,driver_phone,conductor_name,conductor_phone,seating_capacity,active',
          ...rows.map((b) =>
            [
              b.school?.name || '',
              b.vehicleRegistrationNumber,
              b.driverName,
              b.driverPhone,
              b.conductorName || '',
              b.conductorPhone || '',
              b.seatingCapacity ?? '',
              b.active ? 'yes' : 'no',
            ]
              .map(csvEscape)
              .join(',')
          ),
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="buses-export.csv"'
        );
        res.send(lines.join('\n'));
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/buses/import',
    requirePermission('schoolBusAdmin', 'createEdit'),
    async (req, res, next) => {
      try {
        const csv = String(req.body?.csv || '');
        const { rows } = parseCsv(csv);
        if (!rows.length) {
          return res.status(400).json({ error: 'No data rows in CSV' });
        }
        const created = [];
        const updated = [];
        const errors = [];
        for (const row of rows) {
          const schoolName = row.school_name || row.school;
          const vehicle = (
            row.vehicle_registration_number ||
            row.vehicle ||
            row.registration ||
            ''
          )
            .trim()
            .toUpperCase();
          const driverName = row.driver_name;
          const driverPhone = row.driver_phone;
          if (!schoolName || !vehicle || !driverName || !driverPhone) {
            errors.push({
              row: row.__row,
              error:
                'school_name, vehicle_registration_number, driver_name, driver_phone required',
            });
            continue;
          }
          const school = await prisma.school.findFirst({
            where: {
              associationId: req.user.associationId,
              deletedAt: null,
              name: { equals: schoolName, mode: 'insensitive' },
            },
          });
          if (!school) {
            errors.push({
              row: row.__row,
              error: `School not found: ${schoolName}`,
            });
            continue;
          }
          const seatingRaw = row.seating_capacity || row.capacity;
          const seatingCapacity = seatingRaw
            ? Number.parseInt(String(seatingRaw), 10)
            : null;
          const activeRaw = String(row.active || 'yes').toLowerCase();
          const active = !['no', 'false', '0', 'inactive'].includes(activeRaw);
          const data = {
            schoolId: school.id,
            driverName,
            driverPhone,
            conductorName: row.conductor_name || null,
            conductorPhone: row.conductor_phone || null,
            seatingCapacity:
              Number.isFinite(seatingCapacity) && seatingCapacity > 0
                ? seatingCapacity
                : null,
            active,
          };
          const existing = await prisma.bus.findFirst({
            where: {
              associationId: req.user.associationId,
              deletedAt: null,
              vehicleRegistrationNumber: vehicle,
            },
          });
          if (existing) {
            await prisma.bus.update({ where: { id: existing.id }, data });
            updated.push(vehicle);
          } else {
            await prisma.bus.create({
              data: {
                associationId: req.user.associationId,
                vehicleRegistrationNumber: vehicle,
                ...data,
              },
            });
            created.push(vehicle);
          }
        }
        res.json({
          created: created.length,
          updated: updated.length,
          errors,
          createdNames: created,
          updatedNames: updated,
        });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/registry/export.pdf',
    requirePermission('schoolBusAdmin', 'view'),
    async (req, res, next) => {
      try {
        const schools = await prisma.school.findMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        const buses = await prisma.bus.findMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          include: { school: true },
          orderBy: { vehicleRegistrationNumber: 'asc' },
        });
        const buf = await buildRegistryPdf({ schools, buses });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="schools-buses-registry.pdf"'
        );
        res.send(buf);
      } catch (e) {
        next(e);
      }
    }
  );

  // ——— Batches ———
  router.get('/batches', requirePermission('schoolBusAdmin', 'view'), async (req, res, next) => {
    try {
      const rows = await prisma.gateBatch.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(req.query.direction
            ? { tripDirection: directionSchema.parse(String(req.query.direction)) }
            : {}),
        },
        orderBy: [{ startTime: 'asc' }],
        include: { slots: { include: { bus: { include: { school: true } } } } },
      });
      res.json(serializeBusEntity(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/batches', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          label: z.string().min(1),
          startTime: z.string().min(1),
          endTime: z.string().min(1),
          bayCapacity: z.number().int().positive().optional(),
          tripDirection: directionSchema,
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const row = await prisma.gateBatch.create({
        data: {
          associationId: req.user.associationId,
          label: body.label,
          startTime: parseTimeToDate(body.startTime),
          endTime: parseTimeToDate(body.endTime),
          bayCapacity: body.bayCapacity || 3,
          tripDirection: body.tripDirection,
          active: body.active !== false,
        },
      });
      res.status(201).json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  router.patch('/batches/:id', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.gateBatch.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'Batch not found' });
      const body = z
        .object({
          label: z.string().min(1).optional(),
          startTime: z.string().min(1).optional(),
          endTime: z.string().min(1).optional(),
          bayCapacity: z.number().int().positive().optional(),
          tripDirection: directionSchema.optional(),
          active: z.boolean().optional(),
          deleted: z.boolean().optional(),
        })
        .parse(req.body);
      const row = await prisma.gateBatch.update({
        where: { id: existing.id },
        data: {
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.startTime !== undefined
            ? { startTime: parseTimeToDate(body.startTime) }
            : {}),
          ...(body.endTime !== undefined ? { endTime: parseTimeToDate(body.endTime) } : {}),
          ...(body.bayCapacity !== undefined ? { bayCapacity: body.bayCapacity } : {}),
          ...(body.tripDirection !== undefined
            ? { tripDirection: body.tripDirection }
            : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
          ...(body.deleted ? { deletedAt: new Date(), active: false } : {}),
        },
      });
      res.json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  // ——— Slots ———
  router.get('/slots', requirePermission('schoolBusAdmin', 'view'), async (req, res, next) => {
    try {
      const rows = await prisma.busSlot.findMany({
        where: {
          associationId: req.user.associationId,
          ...(req.query.batchId ? { batchId: String(req.query.batchId) } : {}),
          ...(req.query.busId ? { busId: String(req.query.busId) } : {}),
        },
        orderBy: [{ staggerOrder: 'asc' }, { assignedTime: 'asc' }],
        include: {
          bus: { include: { school: true } },
          batch: true,
        },
      });
      res.json(serializeBusEntity(rows));
    } catch (e) {
      next(e);
    }
  });

  router.post('/slots', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          busId: z.string().uuid(),
          batchId: z.string().uuid(),
          assignedTime: z.string().min(1),
          staggerOrder: z.number().int().optional(),
        })
        .parse(req.body);
      const bus = await prisma.bus.findFirst({
        where: { id: body.busId, associationId: req.user.associationId, deletedAt: null },
      });
      const batch = await prisma.gateBatch.findFirst({
        where: { id: body.batchId, associationId: req.user.associationId, deletedAt: null },
      });
      if (!bus || !batch) return res.status(400).json({ error: 'Invalid bus or batch' });
      const row = await prisma.busSlot.create({
        data: {
          associationId: req.user.associationId,
          busId: body.busId,
          batchId: body.batchId,
          assignedTime: parseTimeToDate(body.assignedTime),
          staggerOrder: body.staggerOrder ?? 0,
        },
        include: { bus: { include: { school: true } }, batch: true },
      });
      res.status(201).json(serializeBusEntity(row));
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'Slot already exists for this bus and batch' });
      }
      next(e);
    }
  });

  router.patch('/slots/:id', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.busSlot.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!existing) return res.status(404).json({ error: 'Slot not found' });
      const body = z
        .object({
          assignedTime: z.string().min(1).optional(),
          staggerOrder: z.number().int().optional(),
        })
        .parse(req.body);
      const row = await prisma.busSlot.update({
        where: { id: existing.id },
        data: {
          ...(body.assignedTime !== undefined
            ? { assignedTime: parseTimeToDate(body.assignedTime) }
            : {}),
          ...(body.staggerOrder !== undefined ? { staggerOrder: body.staggerOrder } : {}),
        },
        include: { bus: { include: { school: true } }, batch: true },
      });
      res.json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  router.delete('/slots/:id', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.busSlot.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!existing) return res.status(404).json({ error: 'Slot not found' });
      await prisma.busSlot.delete({ where: { id: existing.id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  // ——— Settings ———
  router.get('/settings', requirePermission('schoolBusAdmin', 'view'), async (req, res, next) => {
    try {
      const row = await getSettings(prisma, req.user.associationId);
      res.json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  router.patch('/settings', requirePermission('schoolBusAdmin', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          longWaitMinutes: z.number().int().positive().optional(),
          offSlotBufferMinutes: z.number().int().nonnegative().optional(),
          unmatchedCutoffTime: z.string().min(1).optional(),
        })
        .parse(req.body);
      await getSettings(prisma, req.user.associationId);
      const row = await prisma.busSetting.update({
        where: { associationId: req.user.associationId },
        data: {
          ...(body.longWaitMinutes !== undefined
            ? { longWaitMinutes: body.longWaitMinutes }
            : {}),
          ...(body.offSlotBufferMinutes !== undefined
            ? { offSlotBufferMinutes: body.offSlotBufferMinutes }
            : {}),
          ...(body.unmatchedCutoffTime !== undefined
            ? { unmatchedCutoffTime: parseTimeToDate(body.unmatchedCutoffTime) }
            : {}),
        },
      });
      res.json(serializeBusEntity(row));
    } catch (e) {
      next(e);
    }
  });

  // ——— Gate ———
  async function buildGateToday(associationId, direction) {
    const tripDate = associationCalendarYmd();
    const dateObj = new Date(`${tripDate}T00:00:00.000Z`);
    const buses = await prisma.bus.findMany({
      where: { associationId, deletedAt: null, active: true },
      include: {
        school: true,
        slots: {
          where: { batch: { tripDirection: direction, deletedAt: null, active: true } },
          include: { batch: true },
        },
      },
      orderBy: { vehicleRegistrationNumber: 'asc' },
    });
    const trips = await prisma.gateTransaction.findMany({
      where: {
        associationId,
        tripDate: dateObj,
      },
      orderBy: { createdAt: 'desc' },
    });
    const openByBus = new Map();
    const doneByBus = new Map();
    const pickupDoneByBus = new Map();
    const dropoffDoneByBus = new Map();
    const dropoffOpenByBus = new Map();
    for (const t of trips) {
      if (t.tripDirection === direction) {
        if (!t.gateOutAt && !openByBus.has(t.busId)) openByBus.set(t.busId, t);
        if (t.gateOutAt && !doneByBus.has(t.busId)) doneByBus.set(t.busId, t);
      }
      if (t.tripDirection === 'PICKUP' && t.gateOutAt && !pickupDoneByBus.has(t.busId)) {
        pickupDoneByBus.set(t.busId, t);
      }
      if (t.tripDirection === 'DROPOFF') {
        if (!t.gateOutAt && !dropoffOpenByBus.has(t.busId)) {
          dropoffOpenByBus.set(t.busId, t);
        }
        if (t.gateOutAt && !dropoffDoneByBus.has(t.busId)) {
          dropoffDoneByBus.set(t.busId, t);
        }
      }
    }
    return buses.map((b) => {
      const slot = b.slots[0] || null;
      const open = openByBus.get(b.id) || null;
      const done = doneByBus.get(b.id) || null;
      let status = 'EXPECTED';
      if (open) status = 'IN_GATE';
      else if (done) status = 'LEFT';

      const pickupTrip = pickupDoneByBus.get(b.id) || null;
      const dropoffTrip =
        dropoffDoneByBus.get(b.id) || dropoffOpenByBus.get(b.id) || null;
      const pickupChildren = pickupTrip?.childCount;
      const dropoffChildren = dropoffTrip?.childCount;
      const bothCounted =
        pickupTrip != null &&
        dropoffTrip != null &&
        pickupChildren != null &&
        dropoffChildren != null;
      const countMismatch =
        bothCounted && Number(pickupChildren) !== Number(dropoffChildren);

      return serializeBusEntity({
        bus: b,
        slot,
        openTrip: open,
        closedTrip: done,
        status,
        pickupChildren: pickupTrip != null ? pickupChildren : null,
        dropoffChildren: dropoffTrip != null ? dropoffChildren : null,
        countMismatch,
        countMismatchMessage: countMismatch
          ? `Pickup OUT ${pickupChildren} ≠ Drop-off IN ${dropoffChildren} — verify`
          : null,
      });
    });
  }

  router.get('/gate/today', requirePermission('schoolBus', 'view'), async (req, res, next) => {
    try {
      const direction = directionSchema.parse(String(req.query.direction || 'PICKUP'));
      const rows = await buildGateToday(req.user.associationId, direction);
      res.json({ date: associationCalendarYmd(), direction, rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/gate/live', requirePermission('schoolBus', 'view'), async (req, res, next) => {
    try {
      const associationId = req.user.associationId;
      const open = await prisma.gateTransaction.findMany({
        where: { associationId, gateOutAt: null },
        include: { bus: { include: { school: true } } },
        orderBy: { gateInAt: 'asc' },
      });
      const byDirection = { PICKUP: [], DROPOFF: [] };
      for (const t of open) {
        byDirection[t.tripDirection].push(t);
      }
      const batches = await prisma.gateBatch.findMany({
        where: { associationId, deletedAt: null, active: true },
      });
      const nowMin = minutesOfClock(new Date());
      let activeBatch = null;
      for (const b of batches) {
        const start = minutesOfTime(b.startTime);
        const end = minutesOfTime(b.endTime);
        if (nowMin >= start && nowMin <= end) {
          activeBatch = b;
          break;
        }
      }
      const occupancy = open.length;
      const bayCapacity = activeBatch?.bayCapacity ?? 3;
      const atCapacity = occupancy >= bayCapacity;
      if (atCapacity && notifications) {
        // Rate-limit: only emit if last similar alert older than 2 min — skip here; job handles recurring
      }
      res.json(
        serializeBusEntity({
          occupancy,
          bayCapacity,
          atCapacity,
          holdAtApproach: atCapacity,
          activeBatch,
          openTrips: open,
        })
      );
    } catch (e) {
      next(e);
    }
  });

  router.post('/trips/in', requirePermission('schoolBus', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          busId: z.string().uuid(),
          tripDirection: directionSchema,
          childCount: z.number().int().nonnegative().optional(),
          notes: z.string().optional().nullable(),
          correctsTransactionId: z.string().uuid().optional().nullable(),
        })
        .parse(req.body);
      if (body.tripDirection === 'DROPOFF' && body.childCount === undefined) {
        return res
          .status(400)
          .json({ error: 'Child count is required on DROP-OFF IN' });
      }
      const bus = await prisma.bus.findFirst({
        where: {
          id: body.busId,
          associationId: req.user.associationId,
          deletedAt: null,
          active: true,
        },
        include: {
          slots: {
            where: { batch: { tripDirection: body.tripDirection, active: true, deletedAt: null } },
            include: { batch: true },
          },
          school: true,
        },
      });
      if (!bus) return res.status(404).json({ error: 'Bus not found' });

      const open = await prisma.gateTransaction.findFirst({
        where: {
          associationId: req.user.associationId,
          busId: bus.id,
          tripDirection: body.tripDirection,
          gateOutAt: null,
        },
      });
      if (open) {
        return res.status(400).json({ error: 'Bus already has an open IN — check out first' });
      }

      const tripDate = associationCalendarYmd();
      const dateObj = new Date(`${tripDate}T00:00:00.000Z`);
      const doneToday = await prisma.gateTransaction.findFirst({
        where: {
          associationId: req.user.associationId,
          busId: bus.id,
          tripDate: dateObj,
          tripDirection: body.tripDirection,
          gateOutAt: { not: null },
        },
      });
      if (doneToday && !body.correctsTransactionId) {
        return res
          .status(400)
          .json({ error: 'Bus already completed this direction today — use a correction note' });
      }

      const gateInAt = new Date();
      const settings = await getSettings(prisma, req.user.associationId);
      const slot = bus.slots[0];
      if (slot && notifications) {
        const assigned = minutesOfTime(slot.assignedTime);
        const actual = minutesOfClock(gateInAt);
        const skew = Math.abs(actual - assigned);
        if (skew > settings.offSlotBufferMinutes) {
          try {
            await notifications.emit({
              associationId: req.user.associationId,
              type: ALERT_TYPES.BUS_OFF_SLOT,
              severity: SEVERITY.WARNING,
              relatedEntityType: 'Bus',
              relatedEntityId: bus.id,
              message: `${bus.vehicleRegistrationNumber} (${bus.school.name}) arrived ${skew} min off assigned slot`,
            });
          } catch (e) {
            console.error('bus alert emit failed', e.message);
          }
        }
      }

      const liveOpen = await prisma.gateTransaction.count({
        where: { associationId: req.user.associationId, gateOutAt: null },
      });
      const bayCapacity = slot?.batch?.bayCapacity ?? 3;
      if (liveOpen >= bayCapacity && notifications) {
        try {
          await notifications.emit({
            associationId: req.user.associationId,
            type: ALERT_TYPES.BUS_BATCH_CAPACITY,
            severity: SEVERITY.WARNING,
            relatedEntityType: 'Bus',
            relatedEntityId: bus.id,
            message: `Gate at capacity (${liveOpen}/${bayCapacity}) — hold next buses at approach`,
          });
        } catch (e) {
          console.error('bus alert emit failed', e.message);
        }
      }

      // Single count: DROPOFF at IN; PICKUP placeholder 0 until OUT
      const childCount =
        body.tripDirection === 'DROPOFF' ? Number(body.childCount) || 0 : 0;

      const trip = await prisma.gateTransaction.create({
        data: {
          associationId: req.user.associationId,
          busId: bus.id,
          tripDate: dateObj,
          tripDirection: body.tripDirection,
          gateInAt,
          childCount,
          loggedByUserId: req.user.id || null,
          notes: body.notes || null,
          correctsTransactionId: body.correctsTransactionId || null,
        },
        include: { bus: { include: { school: true } } },
      });

      if (body.tripDirection === 'DROPOFF' && notifications) {
        const pickupDone = await prisma.gateTransaction.findFirst({
          where: {
            associationId: req.user.associationId,
            busId: bus.id,
            tripDate: dateObj,
            tripDirection: 'PICKUP',
            gateOutAt: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (
          pickupDone &&
          Number(pickupDone.childCount) !== Number(childCount)
        ) {
          try {
            await notifications.emit({
              associationId: req.user.associationId,
              type: ALERT_TYPES.BUS_AM_PM_MISMATCH,
              severity: SEVERITY.WARNING,
              relatedEntityType: 'Bus',
              relatedEntityId: bus.id,
              message: `${bus.vehicleRegistrationNumber} (${bus.school.name}): Pickup OUT ${pickupDone.childCount} ≠ Drop-off IN ${childCount} — verify`,
            });
          } catch (e) {
            console.error('bus alert emit failed', e.message);
          }
        }
      }

      res.status(201).json(serializeBusEntity(trip));
    } catch (e) {
      next(e);
    }
  });

  router.post('/trips/:id/out', requirePermission('schoolBus', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          childCount: z.number().int().nonnegative().optional(),
          notes: z.string().optional().nullable(),
        })
        .parse(req.body || {});
      const trip = await prisma.gateTransaction.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
        },
        include: { bus: { include: { school: true } } },
      });
      if (!trip) return res.status(404).json({ error: 'Trip not found' });
      if (trip.gateOutAt) {
        return res.status(400).json({ error: 'Trip already checked out — create a correction row' });
      }
      if (trip.tripDirection === 'PICKUP' && body.childCount === undefined) {
        return res
          .status(400)
          .json({ error: 'Child count is required on PICKUP OUT' });
      }
      const gateOutAt = new Date();
      const updated = await prisma.gateTransaction.update({
        where: { id: trip.id },
        data: {
          gateOutAt,
          ...(trip.tripDirection === 'PICKUP'
            ? { childCount: Number(body.childCount) || 0 }
            : {}),
          ...(body.notes
            ? { notes: trip.notes ? `${trip.notes}\n${body.notes}` : body.notes }
            : {}),
        },
        include: { bus: { include: { school: true } } },
      });

      const settings = await getSettings(prisma, req.user.associationId);
      const waitMin = (gateOutAt - new Date(trip.gateInAt)) / 60000;
      if (waitMin > settings.longWaitMinutes && notifications) {
        try {
          await notifications.emit({
            associationId: req.user.associationId,
            type: ALERT_TYPES.BUS_LONG_WAIT,
            severity: SEVERITY.WARNING,
            relatedEntityType: 'GateTransaction',
            relatedEntityId: trip.id,
            message: `${trip.bus.vehicleRegistrationNumber} waited ${waitMin.toFixed(1)} min at gate`,
          });
        } catch (e) {
          console.error('bus alert emit failed', e.message);
        }
      }

      if (trip.tripDirection === 'PICKUP' && notifications) {
        const dropoffTrip = await prisma.gateTransaction.findFirst({
          where: {
            associationId: req.user.associationId,
            busId: trip.busId,
            tripDate: trip.tripDate,
            tripDirection: 'DROPOFF',
          },
          orderBy: { createdAt: 'desc' },
        });
        const pickupCount = Number(body.childCount) || 0;
        if (
          dropoffTrip &&
          Number(dropoffTrip.childCount) !== pickupCount
        ) {
          try {
            await notifications.emit({
              associationId: req.user.associationId,
              type: ALERT_TYPES.BUS_AM_PM_MISMATCH,
              severity: SEVERITY.WARNING,
              relatedEntityType: 'Bus',
              relatedEntityId: trip.busId,
              message: `${trip.bus.vehicleRegistrationNumber} (${trip.bus.school.name}): Pickup OUT ${pickupCount} ≠ Drop-off IN ${dropoffTrip.childCount} — verify`,
            });
          } catch (e) {
            console.error('bus alert emit failed', e.message);
          }
        }
      }

      res.json(serializeBusEntity(updated));
    } catch (e) {
      next(e);
    }
  });

  // ——— Resident ———
  router.get('/resident/today', requirePermission('schoolBus', 'view'), async (req, res, next) => {
    try {
      if (req.user.role === 'VENDOR') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const pickup = await buildGateToday(req.user.associationId, 'PICKUP');
      const dropoff = await buildGateToday(req.user.associationId, 'DROPOFF');
      const sanitize = (rows) =>
        rows.map((r) => ({
          schoolName: r.bus?.school?.name,
          vehicleRegistrationNumber: r.bus?.vehicleRegistrationNumber,
          direction: r.slot?.batch?.tripDirection || null,
          assignedTime: r.slot?.assignedTime || null,
          batchLabel: r.slot?.batch?.label || null,
          status: r.status,
        }));
      res.json({
        date: associationCalendarYmd(),
        pickup: sanitize(pickup),
        dropoff: sanitize(dropoff),
      });
    } catch (e) {
      next(e);
    }
  });

  // ——— Reports ———
  router.get(
    '/reports/daily-trips',
    requirePermission('schoolBus', 'view'),
    async (req, res, next) => {
      try {
        const dateKey = String(req.query.date || associationCalendarYmd()).slice(0, 10);
        const dateObj = new Date(`${dateKey}T00:00:00.000Z`);
        const buses = await prisma.bus.findMany({
          where: {
            associationId: req.user.associationId,
            deletedAt: null,
            active: true,
          },
          include: { school: true },
          orderBy: { vehicleRegistrationNumber: 'asc' },
        });
        const trips = await prisma.gateTransaction.findMany({
          where: { associationId: req.user.associationId, tripDate: dateObj },
          include: { bus: { include: { school: true } } },
          orderBy: [{ tripDirection: 'asc' }, { gateInAt: 'asc' }],
        });

        const tripRows = trips.map((t) => ({
          id: t.id,
          busId: t.busId,
          vehicle: t.bus.vehicleRegistrationNumber,
          schoolName: t.bus.school.name,
          direction: t.tripDirection,
          gateInAt: t.gateInAt,
          gateOutAt: t.gateOutAt,
          gateInClock: fmtClock(t.gateInAt),
          gateOutClock: fmtClock(t.gateOutAt),
          childCount: t.childCount,
          status: t.gateOutAt ? 'LEFT' : 'IN_GATE',
        }));

        const byBus = buses.map((b) => {
          const busTrips = tripRows.filter((t) => t.busId === b.id);
          const pickup = busTrips.find((t) => t.direction === 'PICKUP');
          const dropoff = busTrips.find((t) => t.direction === 'DROPOFF');
          const pickupChildren = pickup?.childCount ?? null;
          const dropoffChildren = dropoff?.childCount ?? null;
          const bothCounted =
            pickup != null &&
            dropoff != null &&
            pickupChildren != null &&
            dropoffChildren != null;
          const countMismatch =
            bothCounted && Number(pickupChildren) !== Number(dropoffChildren);
          return {
            busId: b.id,
            vehicle: b.vehicleRegistrationNumber,
            schoolName: b.school.name,
            pickupIn: pickup?.gateInClock || null,
            pickupOut: pickup?.gateOutClock || null,
            pickupChildren,
            dropoffIn: dropoff?.gateInClock || null,
            dropoffOut: dropoff?.gateOutClock || null,
            dropoffChildren,
            countMismatch,
            countMismatchMessage: countMismatch
              ? `Pickup OUT ${pickupChildren} ≠ Drop-off IN ${dropoffChildren}`
              : null,
            trips: busTrips,
          };
        });

        const totals = {
          trips: tripRows.length,
          children: tripRows.reduce((s, t) => s + (t.childCount || 0), 0),
          countMismatches: byBus.filter((b) => b.countMismatch).length,
        };

        const format = String(req.query.format || 'json').toLowerCase();
        if (format === 'csv') {
          const lines = [
            'vehicle,school,pickupIn,pickupOut,pickupChildren,dropoffIn,dropoffOut,dropoffChildren,countMismatch',
            ...byBus.map((r) =>
              [
                r.vehicle,
                r.schoolName,
                r.pickupIn || '',
                r.pickupOut || '',
                r.pickupChildren ?? '',
                r.dropoffIn || '',
                r.dropoffOut || '',
                r.dropoffChildren ?? '',
                r.countMismatch ? 'yes' : 'no',
              ]
                .map(csvEscape)
                .join(',')
            ),
          ];
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="bus-daily-trips-${dateKey}.csv"`
          );
          return res.send(lines.join('\n'));
        }
        if (format === 'pdf') {
          const buf = await buildDailyTripsPdf({
            date: dateKey,
            rows: tripRows.map((r) => ({
              vehicle: r.vehicle,
              schoolName: r.schoolName,
              direction: r.direction,
              gateInAt: r.gateInClock,
              gateOutAt: r.gateOutClock || '—',
              childCount: r.childCount,
              status: r.status,
            })),
          });
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="bus-daily-trips-${dateKey}.pdf"`
          );
          return res.send(buf);
        }
        res.json({ date: dateKey, totals, buses: byBus, trips: tripRows });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/reports/reconciliation',
    requirePermission('schoolBus', 'view'),
    async (req, res, next) => {
      try {
        const dateKey = String(req.query.date || associationCalendarYmd()).slice(0, 10);
        const dateObj = new Date(`${dateKey}T00:00:00.000Z`);
        const trips = await prisma.gateTransaction.findMany({
          where: { associationId: req.user.associationId, tripDate: dateObj },
          include: { bus: { include: { school: true } } },
        });
        const bySchool = new Map();
        for (const t of trips) {
          const sid = t.bus.schoolId;
          if (!bySchool.has(sid)) {
            bySchool.set(sid, {
              schoolId: sid,
              schoolName: t.bus.school.name,
              amTrips: 0,
              pmTrips: 0,
              amChildren: 0,
              pmChildren: 0,
            });
          }
          const row = bySchool.get(sid);
          if (t.tripDirection === 'PICKUP') {
            row.amTrips += 1;
            row.amChildren += t.childCount;
          } else {
            row.pmTrips += 1;
            row.pmChildren += t.childCount;
          }
        }
        const rows = [...bySchool.values()].map((r) => ({
          ...r,
          mismatch:
            r.amTrips > 0 && r.pmTrips === 0
              ? 'MISSING_PM'
              : r.pmTrips > 0 && r.amTrips === 0
                ? 'MISSING_AM'
                : r.amTrips > 0 &&
                    r.pmTrips > 0 &&
                    r.amChildren !== r.pmChildren
                  ? 'COUNT_MISMATCH'
                  : null,
        }));
        if (String(req.query.format || '') === 'csv') {
          const lines = [
            'school,amTrips,pmTrips,amChildren,pmChildren,mismatch',
            ...rows.map((r) =>
              [
                r.schoolName,
                r.amTrips,
                r.pmTrips,
                r.amChildren,
                r.pmChildren,
                r.mismatch || '',
              ]
                .map(csvEscape)
                .join(',')
            ),
          ];
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="bus-reconciliation-${dateKey}.csv"`
          );
          return res.send(lines.join('\n'));
        }
        res.json({ date: dateKey, rows });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/reports/wait-times',
    requirePermission('schoolBus', 'view'),
    async (req, res, next) => {
      try {
        const dateKey = String(req.query.date || associationCalendarYmd()).slice(0, 10);
        const dateObj = new Date(`${dateKey}T00:00:00.000Z`);
        const settings = await getSettings(prisma, req.user.associationId);
        const trips = await prisma.gateTransaction.findMany({
          where: {
            associationId: req.user.associationId,
            tripDate: dateObj,
            gateOutAt: { not: null },
          },
          include: { bus: { include: { school: true } } },
          orderBy: { gateInAt: 'asc' },
        });
        const rows = trips.map((t) => {
          const waitMin =
            (new Date(t.gateOutAt).getTime() - new Date(t.gateInAt).getTime()) / 60000;
          return {
            schoolName: t.bus.school.name,
            vehicle: t.bus.vehicleRegistrationNumber,
            direction: t.tripDirection,
            gateInAt: t.gateInAt,
            gateOutAt: t.gateOutAt,
            waitMinutes: Number(waitMin.toFixed(2)),
            outlier: waitMin > settings.longWaitMinutes,
          };
        });
        if (String(req.query.format || '') === 'csv') {
          const lines = [
            'school,vehicle,direction,gateInAt,gateOutAt,waitMinutes,outlier',
            ...rows.map((r) =>
              [
                r.schoolName,
                r.vehicle,
                r.direction,
                r.gateInAt.toISOString(),
                r.gateOutAt.toISOString(),
                r.waitMinutes,
                r.outlier,
              ]
                .map(csvEscape)
                .join(',')
            ),
          ];
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="bus-wait-times-${dateKey}.csv"`
          );
          return res.send(lines.join('\n'));
        }
        res.json({ date: dateKey, thresholdMinutes: settings.longWaitMinutes, rows });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/reports/congestion',
    requirePermission('schoolBus', 'view'),
    async (req, res, next) => {
      try {
        const dateKey = String(req.query.date || associationCalendarYmd()).slice(0, 10);
        const dateObj = new Date(`${dateKey}T00:00:00.000Z`);
        const trips = await prisma.gateTransaction.findMany({
          where: { associationId: req.user.associationId, tripDate: dateObj },
          orderBy: { gateInAt: 'asc' },
        });
        // Bucket by 10-minute windows of concurrent open buses (IN without OUT yet at that instant)
        const events = [];
        for (const t of trips) {
          events.push({ t: new Date(t.gateInAt).getTime(), d: 1 });
          if (t.gateOutAt) events.push({ t: new Date(t.gateOutAt).getTime(), d: -1 });
        }
        events.sort((a, b) => a.t - b.t || a.d - b.d);
        let cur = 0;
        let peak = 0;
        const buckets = new Map();
        for (const e of events) {
          cur += e.d;
          peak = Math.max(peak, cur);
          const bucketStart = Math.floor(e.t / (10 * 60 * 1000)) * 10 * 60 * 1000;
          const prev = buckets.get(bucketStart) || 0;
          buckets.set(bucketStart, Math.max(prev, cur));
        }
        const rows = [...buckets.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([ts, concurrent]) => ({
            windowStart: new Date(ts).toISOString(),
            concurrent,
          }));
        if (String(req.query.format || '') === 'csv') {
          const lines = [
            'windowStart,concurrent',
            ...rows.map((r) => [r.windowStart, r.concurrent].map(csvEscape).join(',')),
          ];
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="bus-congestion-${dateKey}.csv"`
          );
          return res.send(lines.join('\n'));
        }
        res.json({ date: dateKey, peak, rows });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

export { getSettings };
