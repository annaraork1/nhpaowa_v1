import { z } from 'zod';
import { createUploadMiddleware } from '../lib/multerUpload.js';
import { persistMulterFile } from '../lib/storage.js';

const imageOrPdfFilter = (_req, file, cb) => {
  const ok =
    file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
  if (!ok) return cb(new Error('Only image or PDF uploads are allowed'));
  return cb(null, true);
};

const rcUpload = createUploadMiddleware({
  subdir: 'vehicle-rc',
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
});

const parkingLetterUpload = createUploadMiddleware({
  subdir: 'parking-letters',
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
});

const SLOT_TYPES = ['COVERED', 'OPEN', 'STILT', 'OTHER'];
const VEHICLE_TYPES = ['FOUR_WHEELER', 'TWO_WHEELER', 'EV', 'OTHER'];
const DEVICE_TYPES = ['FOB', 'RFID_TAG', 'REMOTE', 'STICKER', 'OTHER'];
const DEVICE_STATUS = ['ACTIVE', 'RETURNED', 'LOST'];

function isStaffEditor(role) {
  return role === 'SUPERADMIN' || role === 'SECRETARY';
}

async function loadFlat(prisma, associationId, flatId) {
  return prisma.flat.findFirst({
    where: { id: flatId, associationId, deletedAt: null },
  });
}

async function residentLinked(prisma, flatId, userId) {
  if (!userId) return false;
  const m = await prisma.flatMember.findFirst({
    where: { flatId, userId, isActive: true, deletedAt: null },
  });
  return Boolean(m);
}

function approvalForCreate(req) {
  if (isStaffEditor(req.user.role)) {
    return { approvalStatus: 'APPROVED', submittedByUserId: req.user.id };
  }
  return { approvalStatus: 'PENDING', submittedByUserId: req.user.id };
}

function statusFilter(includePending) {
  if (includePending === 'true' || includePending === '1') return {};
  return { approvalStatus: 'APPROVED' };
}

/**
 * @param {import('express').Router} router
 * @param {{ prisma: import('@prisma/client').PrismaClient, requirePermission: Function }} ctx
 */
export function registerFlatHouseholdRoutes(router, { prisma, requirePermission }) {
  async function assertCanWriteFlat(req, flatId) {
    const flat = await loadFlat(prisma, req.user.associationId, flatId);
    if (!flat) return { error: { status: 404, message: 'Flat not found' } };
    if (isStaffEditor(req.user.role)) return { flat };
    const linked = await residentLinked(prisma, flatId, req.user.id);
    if (!linked) {
      return { error: { status: 403, message: 'Not linked to this flat' } };
    }
    return { flat };
  }

  // -------- Parking slots --------
  router.get('/parking-slots', requirePermission('flatOwners', 'view'), async (req, res, next) => {
    try {
      const where = {
        associationId: req.user.associationId,
        deletedAt: null,
        ...(req.query.flatId ? { flatId: String(req.query.flatId) } : {}),
        ...(req.query.unallotted === 'true' ? { flatId: null } : {}),
      };
      const rows = await prisma.parkingSlot.findMany({
        where,
        include: { flat: true },
        orderBy: { label: 'asc' },
      });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  router.post('/parking-slots', requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
    try {
      if (!isStaffEditor(req.user.role)) {
        return res.status(403).json({ error: 'Only association staff may manage parking inventory' });
      }
      const body = z
        .object({
          label: z.string().min(1),
          slotType: z.enum(SLOT_TYPES).optional(),
          flatId: z.string().uuid().optional().nullable(),
        })
        .parse(req.body);
      if (body.flatId) {
        const flat = await loadFlat(prisma, req.user.associationId, body.flatId);
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
      }
      const row = await prisma.parkingSlot.create({
        data: {
          associationId: req.user.associationId,
          label: body.label.trim(),
          slotType: body.slotType || 'COVERED',
          flatId: body.flatId || null,
        },
        include: { flat: true },
      });
      res.status(201).json(row);
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(400).json({ error: 'Parking slot label already exists' });
      }
      next(e);
    }
  });

  router.patch('/parking-slots/:id', requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
    try {
      if (!isStaffEditor(req.user.role)) {
        return res.status(403).json({ error: 'Only association staff may manage parking inventory' });
      }
      const existing = await prisma.parkingSlot.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'Parking slot not found' });
      const body = z
        .object({
          label: z.string().min(1).optional(),
          slotType: z.enum(SLOT_TYPES).optional(),
          flatId: z.string().uuid().nullable().optional(),
          active: z.boolean().optional(),
        })
        .parse(req.body);
      if (body.flatId) {
        const flat = await loadFlat(prisma, req.user.associationId, body.flatId);
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
      }
      const row = await prisma.parkingSlot.update({
        where: { id: existing.id },
        data: {
          ...(body.label !== undefined ? { label: body.label.trim() } : {}),
          ...(body.slotType !== undefined ? { slotType: body.slotType } : {}),
          ...(body.flatId !== undefined ? { flatId: body.flatId } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
        },
        include: { flat: true },
      });
      res.json(row);
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(400).json({ error: 'Parking slot label already exists' });
      }
      next(e);
    }
  });

  router.delete('/parking-slots/:id', requirePermission('flatOwners', 'delete'), async (req, res, next) => {
    try {
      const existing = await prisma.parkingSlot.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'Parking slot not found' });
      await prisma.parkingSlot.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), active: false, flatId: null },
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/parking-slots/:id/letter',
    requirePermission('flatOwners', 'createEdit'),
    parkingLetterUpload.single('file'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res
            .status(403)
            .json({ error: 'Only association staff may upload parking letters' });
        }
        const existing = await prisma.parkingSlot.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!existing) return res.status(404).json({ error: 'Parking slot not found' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const saved = await persistMulterFile(req.file, 'parking-letters');
        const row = await prisma.parkingSlot.update({
          where: { id: existing.id },
          data: {
            letterFileUrl: saved.url,
            letterOriginalName: req.file.originalname || saved.filename,
            letterUploadedAt: new Date(),
          },
          include: { flat: true },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.delete(
    '/parking-slots/:id/letter',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res
            .status(403)
            .json({ error: 'Only association staff may clear parking letters' });
        }
        const existing = await prisma.parkingSlot.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!existing) return res.status(404).json({ error: 'Parking slot not found' });
        const row = await prisma.parkingSlot.update({
          where: { id: existing.id },
          data: {
            letterFileUrl: null,
            letterOriginalName: null,
            letterUploadedAt: null,
          },
          include: { flat: true },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/flats/:flatId/parking-letter',
    requirePermission('flatOwners', 'createEdit'),
    parkingLetterUpload.single('file'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res
            .status(403)
            .json({ error: 'Only association staff may upload parking letters' });
        }
        const flat = await loadFlat(
          prisma,
          req.user.associationId,
          req.params.flatId
        );
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const saved = await persistMulterFile(req.file, 'parking-letters');
        const row = await prisma.flat.update({
          where: { id: flat.id },
          data: {
            parkingLetterUrl: saved.url,
            parkingLetterOriginalName:
              req.file.originalname || saved.filename,
            parkingLetterUploadedAt: new Date(),
          },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.delete(
    '/flats/:flatId/parking-letter',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res
            .status(403)
            .json({ error: 'Only association staff may clear parking letters' });
        }
        const flat = await loadFlat(
          prisma,
          req.user.associationId,
          req.params.flatId
        );
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
        const row = await prisma.flat.update({
          where: { id: flat.id },
          data: {
            parkingLetterUrl: null,
            parkingLetterOriginalName: null,
            parkingLetterUploadedAt: null,
          },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  // -------- Vehicles --------
  router.get(
    '/flats/:flatId/vehicles',
    requirePermission('flatOwners', 'view'),
    async (req, res, next) => {
      try {
        const flat = await loadFlat(prisma, req.user.associationId, req.params.flatId);
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
        const rows = await prisma.flatVehicle.findMany({
          where: {
            flatId: flat.id,
            deletedAt: null,
            ...statusFilter(req.query.includePending),
          },
          include: { parkingSlot: true },
          orderBy: { createdAt: 'desc' },
        });
        res.json(rows);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/flats/:flatId/vehicles',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        const gate = await assertCanWriteFlat(req, req.params.flatId);
        if (gate.error) return res.status(gate.error.status).json({ error: gate.error.message });
        const body = z
          .object({
            vehicleType: z.enum(VEHICLE_TYPES),
            registrationNo: z.string().min(3),
            make: z.string().optional().nullable(),
            model: z.string().optional().nullable(),
            color: z.string().optional().nullable(),
            stickerNo: z.string().optional().nullable(),
            rfidTag: z.string().optional().nullable(),
            parkingSlotId: z.string().uuid().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
          .parse(req.body);
        const approval = approvalForCreate(req);
        if (body.parkingSlotId) {
          const slot = await prisma.parkingSlot.findFirst({
            where: {
              id: body.parkingSlotId,
              associationId: req.user.associationId,
              flatId: gate.flat.id,
              deletedAt: null,
            },
          });
          if (!slot) {
            return res.status(400).json({ error: 'Parking slot not allotted to this flat' });
          }
        }
        if (approval.approvalStatus === 'APPROVED') {
          const dup = await prisma.flatVehicle.findFirst({
            where: {
              registrationNo: body.registrationNo.trim().toUpperCase(),
              approvalStatus: 'APPROVED',
              deletedAt: null,
              flat: { associationId: req.user.associationId },
            },
          });
          if (dup) {
            return res.status(400).json({ error: 'Registration number already registered' });
          }
        }
        const row = await prisma.flatVehicle.create({
          data: {
            flatId: gate.flat.id,
            vehicleType: body.vehicleType,
            registrationNo: body.registrationNo.trim().toUpperCase(),
            make: body.make || null,
            model: body.model || null,
            color: body.color || null,
            stickerNo: body.stickerNo || null,
            rfidTag: body.rfidTag || null,
            parkingSlotId: body.parkingSlotId || null,
            notes: body.notes || null,
            ...approval,
          },
          include: { parkingSlot: true },
        });
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.patch('/vehicles/:id', requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.flatVehicle.findFirst({
        where: { id: req.params.id, deletedAt: null },
        include: { flat: true },
      });
      if (!existing || existing.flat.associationId !== req.user.associationId) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      if (!isStaffEditor(req.user.role)) {
        return res.status(403).json({ error: 'Only staff may edit; submit a new request instead' });
      }
      const body = z
        .object({
          vehicleType: z.enum(VEHICLE_TYPES).optional(),
          registrationNo: z.string().min(3).optional(),
          make: z.string().optional().nullable(),
          model: z.string().optional().nullable(),
          color: z.string().optional().nullable(),
          stickerNo: z.string().optional().nullable(),
          rfidTag: z.string().optional().nullable(),
          parkingSlotId: z.string().uuid().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
        .parse(req.body);
      if (body.parkingSlotId) {
        const slot = await prisma.parkingSlot.findFirst({
          where: {
            id: body.parkingSlotId,
            associationId: req.user.associationId,
            flatId: existing.flatId,
            deletedAt: null,
          },
        });
        if (!slot) {
          return res.status(400).json({ error: 'Parking slot not allotted to this flat' });
        }
      }
      const row = await prisma.flatVehicle.update({
        where: { id: existing.id },
        data: {
          ...body,
          ...(body.registrationNo
            ? { registrationNo: body.registrationNo.trim().toUpperCase() }
            : {}),
        },
        include: { parkingSlot: true },
      });
      res.json(row);
    } catch (e) {
      next(e);
    }
  });

  router.delete('/vehicles/:id', requirePermission('flatOwners', 'delete'), async (req, res, next) => {
    try {
      const existing = await prisma.flatVehicle.findFirst({
        where: { id: req.params.id, deletedAt: null },
        include: { flat: true },
      });
      if (!existing || existing.flat.associationId !== req.user.associationId) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      await prisma.flatVehicle.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/vehicles/:id/rc',
    requirePermission('flatOwners', 'createEdit'),
    rcUpload.single('file'),
    async (req, res, next) => {
      try {
        const existing = await prisma.flatVehicle.findFirst({
          where: { id: req.params.id, deletedAt: null },
          include: { flat: true },
        });
        if (!existing || existing.flat.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Vehicle not found' });
        }
        if (!isStaffEditor(req.user.role) && existing.submittedByUserId !== req.user.id) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const saved = await persistMulterFile(req.file, 'vehicle-rc');
        const row = await prisma.flatVehicle.update({
          where: { id: existing.id },
          data: { rcFileUrl: saved.url },
          include: { parkingSlot: true },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/vehicles/:id/approve',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Only staff may approve' });
        }
        const existing = await prisma.flatVehicle.findFirst({
          where: { id: req.params.id, deletedAt: null },
          include: { flat: true },
        });
        if (!existing || existing.flat.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Vehicle not found' });
        }
        const dup = await prisma.flatVehicle.findFirst({
          where: {
            id: { not: existing.id },
            registrationNo: existing.registrationNo,
            approvalStatus: 'APPROVED',
            deletedAt: null,
            flat: { associationId: req.user.associationId },
          },
        });
        if (dup) {
          return res.status(400).json({ error: 'Registration number already registered' });
        }
        const row = await prisma.flatVehicle.update({
          where: { id: existing.id },
          data: { approvalStatus: 'APPROVED', rejectionReason: null },
          include: { parkingSlot: true },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/vehicles/:id/reject',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Only staff may reject' });
        }
        const existing = await prisma.flatVehicle.findFirst({
          where: { id: req.params.id, deletedAt: null },
          include: { flat: true },
        });
        if (!existing || existing.flat.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Vehicle not found' });
        }
        const reason = String(req.body?.reason || '').trim() || 'Rejected';
        const row = await prisma.flatVehicle.update({
          where: { id: existing.id },
          data: { approvalStatus: 'REJECTED', rejectionReason: reason },
          include: { parkingSlot: true },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  function registerChildCrud({
    listPath,
    model,
    createSchema,
    mapCreate,
  }) {
    router.get(listPath, requirePermission('flatOwners', 'view'), async (req, res, next) => {
      try {
        const flat = await loadFlat(prisma, req.user.associationId, req.params.flatId);
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
        const rows = await prisma[model].findMany({
          where: {
            flatId: flat.id,
            deletedAt: null,
            ...statusFilter(req.query.includePending),
          },
          orderBy: { createdAt: 'desc' },
        });
        res.json(rows);
      } catch (e) {
        next(e);
      }
    });

    router.post(listPath, requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
      try {
        const gate = await assertCanWriteFlat(req, req.params.flatId);
        if (gate.error) return res.status(gate.error.status).json({ error: gate.error.message });
        const body = createSchema.parse(req.body);
        const approval = approvalForCreate(req);
        const row = await prisma[model].create({
          data: {
            flatId: gate.flat.id,
            ...mapCreate(body),
            ...approval,
          },
        });
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    });
  }

  registerChildCrud({
    listPath: '/flats/:flatId/pets',
    model: 'flatPet',
    createSchema: z.object({
      species: z.string().min(1),
      name: z.string().min(1),
      breed: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      rabiesValidTill: z.string().optional().nullable(),
      vaccinationNotes: z.string().optional().nullable(),
    }),
    mapCreate: (body) => ({
      species: body.species,
      name: body.name,
      breed: body.breed || null,
      gender: body.gender || null,
      notes: body.notes || null,
      rabiesValidTill: body.rabiesValidTill ? new Date(body.rabiesValidTill) : null,
      vaccinationNotes: body.vaccinationNotes || null,
    }),
  });

  registerChildCrud({
    listPath: '/flats/:flatId/emergency-contacts',
    model: 'flatEmergencyContact',
    createSchema: z.object({
      name: z.string().min(1),
      phone: z.string().min(5),
      relationship: z.string().optional().nullable(),
      isPrimary: z.boolean().optional(),
    }),
    mapCreate: (body) => ({
      name: body.name,
      phone: body.phone,
      relationship: body.relationship || null,
      isPrimary: Boolean(body.isPrimary),
    }),
  });

  registerChildCrud({
    listPath: '/flats/:flatId/access-devices',
    model: 'flatAccessDevice',
    createSchema: z.object({
      deviceType: z.enum(DEVICE_TYPES),
      identifier: z.string().min(1),
      status: z.enum(DEVICE_STATUS).optional(),
      issuedAt: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
    mapCreate: (body) => ({
      deviceType: body.deviceType,
      identifier: body.identifier,
      status: body.status || 'ACTIVE',
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
      notes: body.notes || null,
    }),
  });

  async function softDeleteChild(model, id, associationId) {
    const existing = await prisma[model].findFirst({
      where: { id, deletedAt: null },
      include: { flat: true },
    });
    if (!existing || existing.flat.associationId !== associationId) return null;
    await prisma[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return existing;
  }

  async function approveReject(model, id, associationId, status, reason) {
    const existing = await prisma[model].findFirst({
      where: { id, deletedAt: null },
      include: { flat: true },
    });
    if (!existing || existing.flat.associationId !== associationId) return null;
    return prisma[model].update({
      where: { id },
      data: {
        approvalStatus: status,
        rejectionReason: status === 'REJECTED' ? reason || 'Rejected' : null,
      },
    });
  }

  for (const [pathBase, model] of [
    ['pets', 'flatPet'],
    ['emergency-contacts', 'flatEmergencyContact'],
    ['access-devices', 'flatAccessDevice'],
  ]) {
    router.delete(`/${pathBase}/:id`, requirePermission('flatOwners', 'delete'), async (req, res, next) => {
      try {
        const row = await softDeleteChild(model, req.params.id, req.user.associationId);
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    });

    router.post(
      `/${pathBase}/:id/approve`,
      requirePermission('flatOwners', 'createEdit'),
      async (req, res, next) => {
        try {
          if (!isStaffEditor(req.user.role)) {
            return res.status(403).json({ error: 'Only staff may approve' });
          }
          const row = await approveReject(model, req.params.id, req.user.associationId, 'APPROVED');
          if (!row) return res.status(404).json({ error: 'Not found' });
          res.json(row);
        } catch (e) {
          next(e);
        }
      }
    );

    router.post(
      `/${pathBase}/:id/reject`,
      requirePermission('flatOwners', 'createEdit'),
      async (req, res, next) => {
        try {
          if (!isStaffEditor(req.user.role)) {
            return res.status(403).json({ error: 'Only staff may reject' });
          }
          const row = await approveReject(
            model,
            req.params.id,
            req.user.associationId,
            'REJECTED',
            req.body?.reason
          );
          if (!row) return res.status(404).json({ error: 'Not found' });
          res.json(row);
        } catch (e) {
          next(e);
        }
      }
    );
  }

  router.patch(
    '/access-devices/:id',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Only staff may edit devices' });
        }
        const existing = await prisma.flatAccessDevice.findFirst({
          where: { id: req.params.id, deletedAt: null },
          include: { flat: true },
        });
        if (!existing || existing.flat.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Not found' });
        }
        const body = z
          .object({
            deviceType: z.enum(DEVICE_TYPES).optional(),
            identifier: z.string().min(1).optional(),
            status: z.enum(DEVICE_STATUS).optional(),
            returnedAt: z.string().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
          .parse(req.body);
        const row = await prisma.flatAccessDevice.update({
          where: { id: existing.id },
          data: {
            ...(body.deviceType ? { deviceType: body.deviceType } : {}),
            ...(body.identifier ? { identifier: body.identifier } : {}),
            ...(body.status ? { status: body.status } : {}),
            ...(body.returnedAt !== undefined
              ? { returnedAt: body.returnedAt ? new Date(body.returnedAt) : null }
              : {}),
            ...(body.notes !== undefined ? { notes: body.notes } : {}),
            ...(body.status === 'RETURNED' && !body.returnedAt
              ? { returnedAt: new Date() }
              : {}),
          },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.patch('/pets/:id', requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
    try {
      if (!isStaffEditor(req.user.role)) {
        return res.status(403).json({ error: 'Only staff may edit' });
      }
      const existing = await prisma.flatPet.findFirst({
        where: { id: req.params.id, deletedAt: null },
        include: { flat: true },
      });
      if (!existing || existing.flat.associationId !== req.user.associationId) {
        return res.status(404).json({ error: 'Not found' });
      }
      const body = z
        .object({
          species: z.string().min(1).optional(),
          name: z.string().min(1).optional(),
          breed: z.string().optional().nullable(),
          gender: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
          rabiesValidTill: z.string().optional().nullable(),
          vaccinationNotes: z.string().optional().nullable(),
        })
        .parse(req.body);
      const row = await prisma.flatPet.update({
        where: { id: existing.id },
        data: {
          ...body,
          rabiesValidTill:
            body.rabiesValidTill === undefined
              ? undefined
              : body.rabiesValidTill
                ? new Date(body.rabiesValidTill)
                : null,
        },
      });
      res.json(row);
    } catch (e) {
      next(e);
    }
  });

  router.patch(
    '/emergency-contacts/:id',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Only staff may edit' });
        }
        const existing = await prisma.flatEmergencyContact.findFirst({
          where: { id: req.params.id, deletedAt: null },
          include: { flat: true },
        });
        if (!existing || existing.flat.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Not found' });
        }
        const body = z
          .object({
            name: z.string().min(1).optional(),
            phone: z.string().min(5).optional(),
            relationship: z.string().optional().nullable(),
            isPrimary: z.boolean().optional(),
          })
          .parse(req.body);
        const row = await prisma.flatEmergencyContact.update({
          where: { id: existing.id },
          data: body,
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  // Pending inbox across household types for a flat
  router.get(
    '/flats/:flatId/household-pending',
    requirePermission('flatOwners', 'view'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Staff only' });
        }
        const flat = await loadFlat(prisma, req.user.associationId, req.params.flatId);
        if (!flat) return res.status(404).json({ error: 'Flat not found' });
        const [vehicles, pets, contacts, devices] = await Promise.all([
          prisma.flatVehicle.findMany({
            where: { flatId: flat.id, approvalStatus: 'PENDING', deletedAt: null },
          }),
          prisma.flatPet.findMany({
            where: { flatId: flat.id, approvalStatus: 'PENDING', deletedAt: null },
          }),
          prisma.flatEmergencyContact.findMany({
            where: { flatId: flat.id, approvalStatus: 'PENDING', deletedAt: null },
          }),
          prisma.flatAccessDevice.findMany({
            where: { flatId: flat.id, approvalStatus: 'PENDING', deletedAt: null },
          }),
        ]);
        res.json({ vehicles, pets, contacts, devices });
      } catch (e) {
        next(e);
      }
    }
  );

  // Association-wide pending queue
  router.get(
    '/household-pending',
    requirePermission('flatOwners', 'view'),
    async (req, res, next) => {
      try {
        if (!isStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Staff only' });
        }
        const assocWhere = {
          approvalStatus: 'PENDING',
          deletedAt: null,
          flat: {
            associationId: req.user.associationId,
            deletedAt: null,
          },
        };
        const flatSelect = {
          id: true,
          tower: true,
          flatNumber: true,
          apartmentType: true,
        };
        const [vehicles, pets, contacts, devices] = await Promise.all([
          prisma.flatVehicle.findMany({
            where: assocWhere,
            include: { flat: { select: flatSelect } },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.flatPet.findMany({
            where: assocWhere,
            include: { flat: { select: flatSelect } },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.flatEmergencyContact.findMany({
            where: assocWhere,
            include: { flat: { select: flatSelect } },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.flatAccessDevice.findMany({
            where: assocWhere,
            include: { flat: { select: flatSelect } },
            orderBy: { createdAt: 'desc' },
          }),
        ]);
        res.json({ vehicles, pets, contacts, devices });
      } catch (e) {
        next(e);
      }
    }
  );
}
