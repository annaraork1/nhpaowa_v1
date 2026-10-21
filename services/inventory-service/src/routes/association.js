import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  APARTMENT_CATALOG,
  APARTMENT_TYPES,
  TOWER_NUMBERS,
  TOWER_CATALOG,
  findApartmentVariant,
  getTower,
  floorsForTower,
  expectedVariantForTower,
  parseFlatNumber,
  parseCampusFlatQuery,
  formatCampusFlatId,
  flatNumberFor,
  addCalendarDaysYmd,
  associationCalendarYmd,
  associationDateColumnRange,
  associationDayBoundsUtc,
  dateOnlyUtc,
} from '@nhpaowa/shared-ui';
import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';
import { generateNoticePdf, noticesUploadDir } from '../lib/noticePdf.js';
import { canDownloadMovePdf, streamMovePdf } from '../lib/movePdf.js';
import { createUploadMiddleware } from '../lib/multerUpload.js';
import { persistMulterFile, resolveUpload, useObjectStorage } from '../lib/storage.js';
import {
  DEFAULT_STAFF_CATEGORIES,
  STAFF_CSV_TEMPLATE,
  listActiveCategoryCodes,
  normalizeCategoryCode,
  normalizeStaffCategory,
  parseCsv,
} from '../lib/staffCsv.js';
import {
  LEAVE_TYPES,
  MIN_PUNCH_DWELL_MS,
  deriveDailyStatuses,
  buildDayStates,
  eachDateKey,
  parseDateOnly,
  summarizeStatuses,
  toDateKey,
  dayBounds,
} from '../lib/attendanceStatus.js';
import { registerFlatHouseholdRoutes } from './flatHousehold.js';
import {
  FLAT_CSV_TEMPLATE,
  buildFlatCsvGuide,
  buildFlatsExportCsv,
  importFlatsCsv,
} from '../lib/flatCsv.js';
import {
  syncFlatOccupancyFromMembers,
  findFlatsPageNumeric,
  sortFlatsNumeric,
} from '../lib/flatOccupancy.js';
import { streamFlatRegisterPdf } from '../lib/flatRegisterPdf.js';
import {
  isResident,
  isAssociationStaffEditor,
  linkedFlatIds,
  residentOwnsFlat,
} from '../lib/residentScope.js';

function canRunNocWorkflow(role) {
  return (
    role === 'SUPERADMIN' ||
    role === 'SECRETARY' ||
    role === 'TREASURER'
  );
}

function canRunMoveWorkflow(role) {
  return role === 'SUPERADMIN' || role === 'SECRETARY';
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function resolveApartmentFields(body) {
  const apartmentType = body.apartmentType || body.flatType || null;
  const configuration = body.configuration || null;
  if (!apartmentType || !configuration) {
    return {
      apartmentType,
      configuration,
      superBuiltUpArea:
        body.superBuiltUpArea !== undefined ? body.superBuiltUpArea : null,
    };
  }
  const match = findApartmentVariant(apartmentType, configuration);
  if (!match) {
    const err = new Error(
      `Unknown apartment variant: ${apartmentType} / ${configuration}`
    );
    err.status = 400;
    throw err;
  }
  return {
    apartmentType: match.apartmentType,
    configuration: match.configuration,
    superBuiltUpArea:
      body.superBuiltUpArea !== undefined && body.superBuiltUpArea !== null
        ? body.superBuiltUpArea
        : match.superBuiltUpArea,
  };
}

/** Validate tower is NHPAOWA-active and floor/flatNumber fit the registry. */
function assertTowerFlatPlacement({ tower, floor, flatNumber }) {
  const t = getTower(tower);
  if (!t || !t.active) {
    const err = new Error(
      t?.excludedReason ||
        `Tower ${tower} is not part of Tata New Haven (NHPAOWA)`
    );
    err.status = 400;
    throw err;
  }
  const num = flatNumber != null ? String(flatNumber).trim() : '';
  if (num) {
    const parts = parseFlatNumber(num);
    if (!parts) {
      const err = new Error(
        `Invalid flat number "${num}". Use campus form FFU (e.g. 001=G-1, 031=3rd-1, 101=10th-1)`
      );
      err.status = 400;
      throw err;
    }
    if ((t.missingFlatNumbers || []).includes(num)) {
      const err = new Error(
        `${formatCampusFlatId(tower, num)} does not exist (excluded from campus grid)`
      );
      err.status = 400;
      throw err;
    }
    const allowed = floorsForTower(tower);
    if (!allowed.includes(parts.floor)) {
      const err = new Error(
        `Floor ${formatFloorLabelSafe(parts.floor)} is not valid for Tower ${tower} (${t.floorGroup || ''})`
      );
      err.status = 400;
      throw err;
    }
    if (floor !== undefined && floor !== null && Number(floor) !== parts.floor) {
      const err = new Error(
        `Flat ${num} is on floor ${formatFloorLabelSafe(parts.floor)}, not ${formatFloorLabelSafe(floor)}`
      );
      err.status = 400;
      throw err;
    }
  } else if (floor !== undefined && floor !== null) {
    const allowed = floorsForTower(tower);
    if (!allowed.includes(Number(floor))) {
      const err = new Error(
        `Floor ${formatFloorLabelSafe(floor)} is not valid for Tower ${tower}`
      );
      err.status = 400;
      throw err;
    }
  }
}

function formatFloorLabelSafe(floor) {
  const n = Number(floor);
  if (Number.isNaN(n)) return String(floor);
  return n === 0 ? 'G' : String(n);
}

async function assertFlatNotDuplicate(prisma, associationId, tower, flatNumber, excludeId) {
  const existing = await prisma.flat.findFirst({
    where: {
      associationId,
      tower: String(tower),
      flatNumber: String(flatNumber).trim(),
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, floor: true },
  });
  if (existing) {
    const err = new Error(
      `${formatCampusFlatId(tower, flatNumber)} already exists` +
        (existing.floor != null
          ? ` (floor ${formatFloorLabelSafe(existing.floor)})`
          : '') +
        ' — same tower and house number cannot be added twice'
    );
    err.status = 409;
    throw err;
  }
}

const flatWriteSchema = z.object({
  tower: z.string().min(1).optional(),
  wing: z.string().min(1).optional(), // legacy alias → tower
  flatNumber: z.string().min(1),
  floor: z.number().int().optional().nullable(),
  apartmentType: z.string().min(1).optional().nullable(),
  flatType: z.string().min(1).optional().nullable(), // legacy alias
  configuration: z.string().min(1).optional().nullable(),
  superBuiltUpArea: z.number().int().positive().optional().nullable(),
  parkingSlots: z.number().int().min(0).optional(),
  occupancyStatus: z
    .enum(['OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'VACANT'])
    .optional(),
  notes: z.string().optional().nullable(),
});

async function recordNocStatus(prisma, nocId, fromStatus, toStatus, actorUserId, note) {
  await prisma.nocStatusEvent.create({
    data: {
      nocRequestId: nocId,
      fromStatus,
      toStatus,
      actorUserId: actorUserId || null,
      note: note || null,
    },
  });
}

async function recordMoveStatus(prisma, moveId, fromStatus, toStatus, actorUserId, note) {
  await prisma.moveStatusEvent.create({
    data: {
      moveRequestId: moveId,
      fromStatus,
      toStatus,
      actorUserId: actorUserId || null,
      note: note || null,
    },
  });
}

const imageOrPdfFilter = (_req, file, cb) => {
  const ok =
    file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
  if (!ok) return cb(new Error('Only image or PDF attachments are allowed'));
  return cb(null, true);
};

const moveAttachmentUpload = createUploadMiddleware({
  subdir: 'moves',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
});

const nocAttachmentUpload = createUploadMiddleware({
  subdir: 'noc',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
});

const staffPhotoUpload = createUploadMiddleware({
  subdir: 'staff',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed for staff photos'));
    }
    return cb(null, true);
  },
});

const staffPhotoUrlSchema = z
  .string()
  .max(500)
  .refine(
    (u) =>
      u.startsWith('/uploads/staff/') ||
      u.startsWith('/uploads/') ||
      /^https?:\/\//i.test(u),
    'Invalid photo URL'
  )
  .optional()
  .nullable();

async function recordNoticeStatus(prisma, noticeId, fromStatus, toStatus, actorUserId, note) {
  await prisma.noticeStatusEvent.create({
    data: {
      noticeId,
      fromStatus,
      toStatus,
      actorUserId: actorUserId || null,
      note: note || null,
    },
  });
}

const noticeWriteSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  category: z.string().optional().nullable(),
});

export function createAssociationRouter(ctx) {
  const { prisma, requirePermission, notifications } = ctx;
  const router = Router();

  registerFlatHouseholdRoutes(router, { prisma, requirePermission });

  // -------- Flats (005) --------
  router.get('/apartment-catalog', requirePermission('flatOwners', 'view'), (_req, res) => {
    res.json({
      towers: TOWER_NUMBERS,
      towerCatalog: TOWER_CATALOG.filter((t) => t.active).map((t) => ({
        number: t.number,
        floorGroup: t.floorGroup,
        maxFloor: t.maxFloor,
        flatsPerFloor: t.flatsPerFloor,
        category: t.category,
        missingFlatNumbers: t.missingFlatNumbers,
        floors: floorsForTower(t.number),
        defaultVariant: expectedVariantForTower(t.number),
      })),
      apartmentTypes: APARTMENT_TYPES,
      variants: APARTMENT_CATALOG,
    });
  });

  router.get('/flats', requirePermission('flatOwners', 'view'), async (req, res, next) => {
    try {
      const qRaw = String(req.query.q || '').trim();
      const q = qRaw.toLowerCase();
      const campus = parseCampusFlatQuery(qRaw);
      const includeDeleted = String(req.query.includeDeleted || '') === 'true';
      const floorRaw = req.query.floor;
      const floorFilter =
        floorRaw === undefined || floorRaw === null || floorRaw === ''
          ? null
          : Number(floorRaw);
      const occupancyStatus = req.query.occupancyStatus
        ? String(req.query.occupancyStatus)
        : '';
      let residentFlatFilter = {};
      if (isResident(req.user.role)) {
        const ids = await linkedFlatIds(prisma, req.user.id);
        residentFlatFilter = { id: { in: ids.length ? ids : ['00000000-0000-4000-8000-000000000000'] } };
      }
      const searchOr = q
        ? [
            { tower: { contains: q, mode: 'insensitive' } },
            { flatNumber: { contains: q, mode: 'insensitive' } },
            { apartmentType: { contains: q, mode: 'insensitive' } },
            { configuration: { contains: q, mode: 'insensitive' } },
            {
              members: {
                some: {
                  deletedAt: null,
                  OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q } },
                    { email: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            },
            ...(campus
              ? [
                  {
                    AND: [
                      { tower: campus.tower },
                      { flatNumber: campus.flatNumber },
                    ],
                  },
                ]
              : []),
          ]
        : null;
      const limitRaw = Number(req.query.limit);
      const offsetRaw = Number(req.query.offset);
      const limit =
        req.query.limit === undefined || req.query.limit === ''
          ? 50
          : Number.isFinite(limitRaw) && limitRaw === 0
            ? 0
            : Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50), 200);
      const offset = Math.max(
        0,
        Number.isFinite(offsetRaw) ? offsetRaw : 0
      );
      const where = {
        associationId: req.user.associationId,
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...residentFlatFilter,
        ...(req.query.tower ? { tower: String(req.query.tower) } : {}),
        ...(req.query.apartmentType
          ? { apartmentType: String(req.query.apartmentType) }
          : {}),
        ...(Number.isInteger(floorFilter) ? { floor: floorFilter } : {}),
        ...(occupancyStatus ? { occupancyStatus } : {}),
        ...(searchOr ? { OR: searchOr } : {}),
      };
      const page = await findFlatsPageNumeric(prisma, {
        where,
        include: {
          members: {
            where: { deletedAt: null, isActive: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        limit,
        offset,
      });
      res.json({
        items: page.items,
        total: page.total,
        limit: page.limit === 0 ? page.total : page.limit,
        offset: page.offset,
      });
    } catch (e) {
      next(e);
    }
  });

  router.get('/flats/export.csv', requirePermission('flatOwners', 'view'), async (req, res, next) => {
    try {
      if (isResident(req.user.role)) {
        return res.status(403).json({ error: 'Export is available to association staff only' });
      }
      const flats = await prisma.flat.findMany({
        where: { associationId: req.user.associationId, deletedAt: null },
        include: {
          members: { where: { deletedAt: null, isActive: true } },
          parkingAllotments: { where: { deletedAt: null, active: true } },
          vehicles: { where: { deletedAt: null } },
          pets: { where: { deletedAt: null } },
          emergencyContacts: { where: { deletedAt: null } },
          accessDevices: { where: { deletedAt: null } },
        },
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="flats.csv"');
      res.send(buildFlatsExportCsv(sortFlatsNumeric(flats)));
    } catch (e) {
      next(e);
    }
  });

  router.get('/flats/export.pdf', requirePermission('flatOwners', 'view'), async (req, res, next) => {
    try {
      if (isResident(req.user.role)) {
        return res
          .status(403)
          .json({ error: 'Export is available to association staff only' });
      }
      const where = {
        associationId: req.user.associationId,
        deletedAt: null,
      };
      if (req.query.tower) where.tower = String(req.query.tower);
      if (req.query.occupancyStatus) {
        where.occupancyStatus = String(req.query.occupancyStatus);
      }
      if (req.query.apartmentType) {
        where.apartmentType = String(req.query.apartmentType);
      }
      if (req.query.floor !== undefined && req.query.floor !== '') {
        const f = Number(req.query.floor);
        if (!Number.isNaN(f)) where.floor = f;
      }
      const flats = await prisma.flat.findMany({
        where,
        include: {
          members: {
            where: { deletedAt: null, isActive: true },
            orderBy: { createdAt: 'asc' },
          },
          parkingAllotments: { where: { deletedAt: null, active: true } },
          vehicles: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
          pets: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
          emergencyContacts: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
          accessDevices: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      await streamFlatRegisterPdf(res, sortFlatsNumeric(flats), {
        associationId: req.user.associationId,
        kind:
          String(req.query.kind || '').toLowerCase() === 'register'
            ? 'register'
            : 'verification',
      });
    } catch (e) {
      next(e);
    }
  });

  router.get(
    '/flats/csv-template',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isAssociationStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Only association staff may download the template' });
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="flats-household-template.csv"'
        );
        res.send(FLAT_CSV_TEMPLATE);
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/flats/csv-guide',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isAssociationStaffEditor(req.user.role)) {
          return res
            .status(403)
            .json({ error: 'Only association staff may view the CSV guide' });
        }
        res.json(buildFlatCsvGuide());
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/flats/import-csv',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        if (!isAssociationStaffEditor(req.user.role)) {
          return res.status(403).json({ error: 'Only association staff may import flats CSV' });
        }
        const csvText =
          typeof req.body?.csv === 'string'
            ? req.body.csv
            : typeof req.body?.text === 'string'
              ? req.body.text
              : '';
        if (!csvText.trim()) {
          return res.status(400).json({ error: 'CSV content required (body.csv)' });
        }
        const dryRun = Boolean(req.body?.dryRun);
        const resolutions =
          req.body?.resolutions && typeof req.body.resolutions === 'object'
            ? req.body.resolutions
            : {};
        const result = await importFlatsCsv(
          prisma,
          req.user.associationId,
          csvText,
          { dryRun, resolutions }
        );
        res.json(result);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post('/flats', requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
    try {
      if (!isAssociationStaffEditor(req.user.role)) {
        return res.status(403).json({ error: 'Only association staff may create flats' });
      }
      const body = flatWriteSchema.parse(req.body);
      const tower = String(body.tower || body.wing || '').trim();
      if (!tower) {
        return res.status(400).json({ error: 'Tower number is required' });
      }
      assertTowerFlatPlacement({
        tower,
        floor: body.floor,
        flatNumber: body.flatNumber,
      });
      const flatNum = body.flatNumber.trim();
      const parsed = parseFlatNumber(flatNum);
      const floor =
        body.floor !== undefined && body.floor !== null
          ? body.floor
          : parsed?.floor ?? null;
      await assertFlatNotDuplicate(
        prisma,
        req.user.associationId,
        tower,
        flatNum,
      );
      const expected = expectedVariantForTower(tower);
      const apt = resolveApartmentFields({
        ...body,
        apartmentType: body.apartmentType || body.flatType || expected?.apartmentType,
        configuration: body.configuration || expected?.configuration,
      });
      if (
        expected &&
        (apt.apartmentType !== expected.apartmentType ||
          apt.configuration !== expected.configuration)
      ) {
        return res.status(400).json({
          error: `Tower ${tower} only allows ${expected.apartmentType} / ${expected.configuration}`,
        });
      }
      const flat = await prisma.flat.create({
        data: {
          associationId: req.user.associationId,
          tower,
          flatNumber: flatNum,
          floor,
          apartmentType: apt.apartmentType,
          configuration: apt.configuration,
          superBuiltUpArea: apt.superBuiltUpArea,
          parkingSlots: body.parkingSlots ?? 0,
          occupancyStatus: body.occupancyStatus || 'VACANT',
          notes: body.notes || null,
        },
      });
      res.status(201).json(flat);
    } catch (e) {
      if (e.status === 409 || e.code === 'P2002') {
        return res.status(409).json({
          error:
            e.message && e.status === 409
              ? e.message
              : `${formatCampusFlatId(
                  String(req.body?.tower || req.body?.wing || ''),
                  String(req.body?.flatNumber || ''),
                )} already exists — same tower and house number cannot be added twice`,
        });
      }
      if (e.status === 400) {
        return res.status(400).json({ error: e.message });
      }
      next(e);
    }
  });

  router.patch('/flats/:id', requirePermission('flatOwners', 'createEdit'), async (req, res, next) => {
    try {
      if (!isAssociationStaffEditor(req.user.role)) {
        return res.status(403).json({ error: 'Only association staff may edit flats' });
      }
      const existing = await prisma.flat.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'Flat not found' });
      const body = flatWriteSchema.partial().extend({
        flatNumber: z.string().min(1).optional(),
      }).parse(req.body);

      const towerRaw = body.tower ?? body.wing;
      const nextTower = towerRaw
        ? String(towerRaw).trim()
        : existing.tower;
      const nextFloor =
        body.floor !== undefined ? body.floor : existing.floor;
      const nextFlatNumber = body.flatNumber
        ? body.flatNumber.trim()
        : existing.flatNumber;
      assertTowerFlatPlacement({
        tower: nextTower,
        floor: nextFloor,
        flatNumber: nextFlatNumber,
      });
      await assertFlatNotDuplicate(
        prisma,
        req.user.associationId,
        nextTower,
        nextFlatNumber,
        existing.id,
      );
      const parsedNext = parseFlatNumber(nextFlatNumber);
      const resolvedFloor =
        nextFloor !== undefined && nextFloor !== null
          ? nextFloor
          : parsedNext?.floor ?? existing.floor;

      let aptPatch = {};
      if (
        body.apartmentType !== undefined ||
        body.flatType !== undefined ||
        body.configuration !== undefined ||
        body.superBuiltUpArea !== undefined ||
        towerRaw
      ) {
        const expected = expectedVariantForTower(nextTower);
        aptPatch = resolveApartmentFields({
          apartmentType:
            body.apartmentType ??
            body.flatType ??
            existing.apartmentType ??
            expected?.apartmentType,
          configuration:
            body.configuration !== undefined
              ? body.configuration
              : existing.configuration ?? expected?.configuration,
          superBuiltUpArea: body.superBuiltUpArea,
        });
        if (
          expected &&
          (aptPatch.apartmentType !== expected.apartmentType ||
            aptPatch.configuration !== expected.configuration)
        ) {
          return res.status(400).json({
            error: `Tower ${nextTower} only allows ${expected.apartmentType} / ${expected.configuration}`,
          });
        }
      }

      const flat = await prisma.flat.update({
        where: { id: existing.id },
        data: {
          ...(towerRaw ? { tower: String(towerRaw).trim() } : {}),
          ...(body.flatNumber ? { flatNumber: body.flatNumber.trim() } : {}),
          floor: resolvedFloor,
          ...(Object.keys(aptPatch).length ? aptPatch : {}),
          ...(body.parkingSlots !== undefined ? { parkingSlots: body.parkingSlots } : {}),
          ...(body.occupancyStatus ? { occupancyStatus: body.occupancyStatus } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });
      res.json(flat);
    } catch (e) {
      if (e.status === 409 || e.code === 'P2002') {
        return res.status(409).json({
          error:
            e.message && e.status === 409
              ? e.message
              : 'Flat already exists for this tower and house number',
        });
      }
      if (e.status === 400) {
        return res.status(400).json({ error: e.message });
      }
      next(e);
    }
  });

  router.delete('/flats/:id', requirePermission('flatOwners', 'delete'), async (req, res, next) => {
    try {
      const existing = await prisma.flat.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ error: 'Flat not found' });
      await prisma.flat.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/flats/:id/members',
    requirePermission('flatOwners', 'createEdit'),
    async (req, res, next) => {
      try {
        const flat = await prisma.flat.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId, deletedAt: null },
        });
        if (!flat) return res.status(404).json({ error: 'Flat not found' });

        const staff = isAssociationStaffEditor(req.user.role);
        if (!staff) {
          if (!isResident(req.user.role)) {
            return res.status(403).json({ error: 'Only association staff or linked residents may manage members' });
          }
          const owns = await residentOwnsFlat(prisma, req.user.id, flat.id);
          if (!owns) {
            return res.status(403).json({ error: 'Not linked to this flat' });
          }
        }

        const body = z
          .object({
            role: z.enum([
              'PRIMARY_OWNER',
              'ASSOCIATE_OWNER',
              'TENANT',
              'OWNER_FAMILY',
              'TENANT_FAMILY',
            ]),
            name: z.string().min(1),
            phone: z.string().min(5),
            email: z.string().email().optional().nullable(),
          })
          .parse(req.body);

        if (!staff && body.role === 'PRIMARY_OWNER') {
          return res.status(403).json({
            error:
              'Residents may add Associate owner, Tenant, or family members only',
          });
        }

        if (body.role === 'PRIMARY_OWNER') {
          const existingPrimary = await prisma.flatMember.findFirst({
            where: {
              flatId: flat.id,
              role: 'PRIMARY_OWNER',
              deletedAt: null,
              isActive: true,
            },
          });
          if (existingPrimary) {
            return res.status(400).json({ error: 'Flat already has a primary owner' });
          }
        }
        const member = await prisma.flatMember.create({
          data: {
            flatId: flat.id,
            role: body.role,
            name: body.name,
            phone: body.phone,
            email: body.email || null,
          },
        });
        await syncFlatOccupancyFromMembers(prisma, flat.id);
        res.status(201).json(member);
      } catch (e) {
        next(e);
      }
    }
  );

  router.delete(
    '/members/:id',
    requirePermission('flatOwners', 'delete'),
    async (req, res, next) => {
      try {
        const member = await prisma.flatMember.findFirst({
          where: { id: req.params.id, deletedAt: null },
          include: { flat: true },
        });
        if (!member || member.flat.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Member not found' });
        }
        await prisma.flatMember.update({
          where: { id: member.id },
          data: { deletedAt: new Date(), isActive: false },
        });
        await syncFlatOccupancyFromMembers(prisma, member.flatId);
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    }
  );

  // -------- NOC (006) --------
  router.get('/noc', requirePermission('noc', 'view'), async (req, res, next) => {
    try {
      const where = {
        associationId: req.user.associationId,
        ...(req.query.status ? { status: String(req.query.status) } : {}),
        ...(req.query.purpose ? { purpose: String(req.query.purpose) } : {}),
        ...(req.query.flatId ? { flatId: String(req.query.flatId) } : {}),
      };
      if (isResident(req.user.role)) {
        const ids = await linkedFlatIds(prisma, req.user.id);
        where.flatId = { in: ids.length ? ids : ['00000000-0000-4000-8000-000000000000'] };
      }
      const rows = await prisma.nocRequest.findMany({
        where,
        include: {
          flat: true,
          statusEvents: { orderBy: { createdAt: 'asc' } },
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  router.post('/noc', requirePermission('noc', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          flatId: z.string().uuid(),
          purpose: z.enum([
            'SALE_TRANSFER',
            'BANK_LOAN',
            'RENTAL',
            'RENOVATION',
            'OTHER',
          ]),
          applicantName: z.string().min(1),
          applicantPhone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
          duesCleared: z.boolean().optional(),
        })
        .parse(req.body);
      const flat = await prisma.flat.findFirst({
        where: {
          id: body.flatId,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!flat) return res.status(404).json({ error: 'Flat not found' });
      if (isResident(req.user.role)) {
        const owns = await residentOwnsFlat(prisma, req.user.id, body.flatId);
        if (!owns) {
          return res.status(403).json({ error: 'Not linked to this flat' });
        }
      }
      const noc = await prisma.nocRequest.create({
        data: {
          associationId: req.user.associationId,
          flatId: body.flatId,
          purpose: body.purpose,
          applicantName: body.applicantName,
          applicantPhone: body.applicantPhone || null,
          notes: body.notes || null,
          duesCleared: body.duesCleared === true,
          status: 'SUBMITTED',
        },
      });
      await recordNocStatus(prisma, noc.id, null, 'SUBMITTED', req.user.id);
      res.status(201).json(noc);
    } catch (e) {
      next(e);
    }
  });

  async function transitionNoc(req, res, next, toStatus, extra = {}) {
    try {
      if (!canRunNocWorkflow(req.user.role)) {
        return res.status(403).json({ error: 'Only staff may change NOC status' });
      }
      const noc = await prisma.nocRequest.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!noc) return res.status(404).json({ error: 'NOC not found' });
      const updated = await prisma.nocRequest.update({
        where: { id: noc.id },
        data: { status: toStatus, ...extra },
        include: { flat: true, statusEvents: true },
      });
      await recordNocStatus(
        prisma,
        noc.id,
        noc.status,
        toStatus,
        req.user.id,
        req.body?.reason || req.body?.note
      );
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }

  router.post('/noc/:id/issue', requirePermission('noc', 'createEdit'), (req, res, next) =>
    transitionNoc(req, res, next, 'ISSUED', {
      issuedAt: new Date(),
      issuedByName: req.user.name || 'Secretary',
      duesCleared: req.body?.duesCleared !== false,
      rejectionReason: null,
    })
  );
  router.post('/noc/:id/reject', requirePermission('noc', 'createEdit'), (req, res, next) =>
    transitionNoc(req, res, next, 'REJECTED', {
      rejectionReason: req.body?.reason || 'Rejected',
    })
  );
  router.post('/noc/:id/cancel', requirePermission('noc', 'createEdit'), (req, res, next) =>
    transitionNoc(req, res, next, 'CANCELLED', {
      rejectionReason: req.body?.reason || 'Cancelled',
    })
  );

  async function assertCanAttachNoc(req, noc) {
    if (!noc) return { error: { status: 404, message: 'NOC not found' } };
    if (canRunNocWorkflow(req.user.role) || isAssociationStaffEditor(req.user.role)) {
      return { ok: true };
    }
    if (isResident(req.user.role)) {
      const owns = await residentOwnsFlat(prisma, req.user.id, noc.flatId);
      if (!owns) return { error: { status: 403, message: 'Not linked to this flat' } };
      return { ok: true };
    }
    return { error: { status: 403, message: 'Forbidden' } };
  }

  router.post(
    '/noc/:id/attachments',
    requirePermission('noc', 'createEdit'),
    nocAttachmentUpload.single('file'),
    async (req, res, next) => {
      try {
        const noc = await prisma.nocRequest.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        const gate = await assertCanAttachNoc(req, noc);
        if (gate.error) {
          return res.status(gate.error.status).json({ error: gate.error.message });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const label = req.body?.label ? String(req.body.label).trim() : null;
        const saved = await persistMulterFile(req.file, 'noc');
        const row = await prisma.nocAttachment.create({
          data: {
            nocRequestId: noc.id,
            label: label || null,
            originalName: req.file.originalname,
            fileName: saved.filename,
            mimeType: req.file.mimetype,
            url: saved.url,
            uploadedByUserId: req.user.id || null,
          },
        });
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.delete(
    '/noc/:id/attachments/:attachmentId',
    requirePermission('noc', 'createEdit'),
    async (req, res, next) => {
      try {
        const noc = await prisma.nocRequest.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        const gate = await assertCanAttachNoc(req, noc);
        if (gate.error) {
          return res.status(gate.error.status).json({ error: gate.error.message });
        }
        const att = await prisma.nocAttachment.findFirst({
          where: {
            id: req.params.attachmentId,
            nocRequestId: noc.id,
            deletedAt: null,
          },
        });
        if (!att) return res.status(404).json({ error: 'Attachment not found' });
        const updated = await prisma.nocAttachment.update({
          where: { id: att.id },
          data: { deletedAt: new Date() },
        });
        res.json(updated);
      } catch (e) {
        next(e);
      }
    }
  );

  // -------- Staff / Attendance (007 + 011 CSV + categories) --------
  router.get('/staff/categories', requirePermission('attendance', 'view'), async (req, res, next) => {
    try {
      const includeInactive = String(req.query.includeInactive || '') === 'true';
      const rows = await prisma.staffCategory.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(includeInactive ? {} : { active: true }),
        },
        orderBy: { sortOrder: 'asc' },
      });
      if (!rows.length && !includeInactive) {
        return res.json(
          DEFAULT_STAFF_CATEGORIES.map((c) => ({
            id: null,
            code: c.code,
            label: c.label,
            sortOrder: c.sortOrder,
            active: true,
          }))
        );
      }
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/staff/categories',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const body = z
          .object({
            code: z.string().min(1),
            label: z.string().min(1),
            sortOrder: z.number().int().optional(),
            active: z.boolean().optional(),
          })
          .parse(req.body);
        const code = normalizeCategoryCode(body.code);
        const row = await prisma.staffCategory.create({
          data: {
            associationId: req.user.associationId,
            code,
            label: body.label.trim(),
            sortOrder: body.sortOrder ?? 100,
            active: body.active ?? true,
          },
        });
        res.status(201).json(row);
      } catch (e) {
        if (e?.code === 'P2002') {
          return res.status(409).json({ error: 'Category code already exists' });
        }
        next(e);
      }
    }
  );

  router.patch(
    '/staff/categories/:id',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const existing = await prisma.staffCategory.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!existing) return res.status(404).json({ error: 'Category not found' });
        const body = z
          .object({
            label: z.string().min(1).optional(),
            sortOrder: z.number().int().optional(),
            active: z.boolean().optional(),
            code: z.string().min(1).optional(),
          })
          .parse(req.body);
        const row = await prisma.staffCategory.update({
          where: { id: existing.id },
          data: {
            ...(body.label !== undefined ? { label: body.label.trim() } : {}),
            ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
            ...(body.active !== undefined ? { active: body.active } : {}),
            ...(body.code !== undefined
              ? { code: normalizeCategoryCode(body.code) }
              : {}),
          },
        });
        res.json(row);
      } catch (e) {
        if (e?.code === 'P2002') {
          return res.status(409).json({ error: 'Category code already exists' });
        }
        next(e);
      }
    }
  );

  router.delete(
    '/staff/categories/:id',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const existing = await prisma.staffCategory.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!existing) return res.status(404).json({ error: 'Category not found' });
        const row = await prisma.staffCategory.update({
          where: { id: existing.id },
          data: { active: false, deletedAt: new Date() },
        });
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/staff/csv-template',
    requirePermission('attendance', 'view'),
    (_req, res) => {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="staff-template.csv"'
      );
      res.send(STAFF_CSV_TEMPLATE);
    }
  );

  router.post(
    '/staff/import-csv',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const csvText =
          typeof req.body?.csv === 'string'
            ? req.body.csv
            : typeof req.body === 'string'
              ? req.body
              : '';
        if (!csvText.trim()) {
          return res.status(400).json({ error: 'CSV content required (body.csv)' });
        }
        const activeCodes = await listActiveCategoryCodes(
          prisma,
          req.user.associationId
        );
        const { headers, rows } = parseCsv(csvText);
        if (!headers.includes('name') || !headers.includes('category')) {
          return res.status(400).json({
            error: 'CSV must include name and category columns',
          });
        }

        const existing = await prisma.associationStaff.findMany({
          where: {
            associationId: req.user.associationId,
            deletedAt: null,
            active: true,
          },
          select: { name: true, category: true },
        });
        const seen = new Set(
          existing.map(
            (e) => `${e.name.trim().toLowerCase()}|${e.category}`
          )
        );

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (const row of rows) {
          const name = String(row.name || '').trim();
          const category = normalizeStaffCategory(row.category, activeCodes);
          const phone = String(row.phone || '').trim() || null;
          const tower = String(row.tower || '').trim() || null;
          const designation = String(row.designation || '').trim() || null;

          if (!name) {
            errors.push({ row: row.__row, message: 'name is required' });
            continue;
          }
          if (!category) {
            errors.push({
              row: row.__row,
              message: `invalid category "${row.category}"`,
            });
            continue;
          }
          const key = `${name.toLowerCase()}|${category}`;
          if (seen.has(key)) {
            skipped += 1;
            continue;
          }
          await prisma.associationStaff.create({
            data: {
              associationId: req.user.associationId,
              name,
              category,
              phone,
              tower,
              designation,
            },
          });
          seen.add(key);
          created += 1;
        }

        res.json({ created, skipped, errors });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get('/staff', requirePermission('attendance', 'view'), async (req, res, next) => {
    try {
      const rows = await prisma.associationStaff.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(req.query.activeOnly === 'true' ? { active: true } : {}),
          ...(req.query.category ? { category: String(req.query.category) } : {}),
          ...(req.query.tower ? { tower: String(req.query.tower) } : {}),
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/staff/photo',
    requirePermission('attendance', 'createEdit'),
    staffPhotoUpload.single('photo'),
    async (req, res, next) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const saved = await persistMulterFile(req.file, 'staff');
        res.status(201).json({ url: saved.url });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post('/staff', requirePermission('attendance', 'createEdit'), async (req, res, next) => {
    try {
      const activeCodes = await listActiveCategoryCodes(
        prisma,
        req.user.associationId
      );
      const body = z
        .object({
          name: z.string().min(1),
          category: z
            .string()
            .refine((c) => activeCodes.includes(c), 'invalid category'),
          phone: z.string().optional().nullable(),
          tower: z.string().optional().nullable(),
          designation: z.string().optional().nullable(),
          photoUrl: staffPhotoUrlSchema,
        })
        .parse(req.body);
      const row = await prisma.associationStaff.create({
        data: {
          associationId: req.user.associationId,
          name: body.name,
          category: body.category,
          phone: body.phone || null,
          tower: body.tower || null,
          designation: body.designation || null,
          photoUrl: body.photoUrl || null,
        },
      });
      res.status(201).json(row);
    } catch (e) {
      next(e);
    }
  });

  router.patch('/staff/:id', requirePermission('attendance', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.associationStaff.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Staff not found' });
      const activeCodes = await listActiveCategoryCodes(
        prisma,
        req.user.associationId
      );
      const body = z
        .object({
          name: z.string().min(1).optional(),
          category: z
            .string()
            .refine((c) => activeCodes.includes(c), 'invalid category')
            .optional(),
          phone: z.string().optional().nullable(),
          tower: z.string().optional().nullable(),
          designation: z.string().optional().nullable(),
          photoUrl: staffPhotoUrlSchema,
          active: z.boolean().optional(),
        })
        .parse(req.body);
      const row = await prisma.associationStaff.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.tower !== undefined ? { tower: body.tower || null } : {}),
          ...(body.designation !== undefined
            ? { designation: body.designation || null }
            : {}),
          ...(body.photoUrl !== undefined
            ? { photoUrl: body.photoUrl || null }
            : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
        },
      });
      res.json(row);
    } catch (e) {
      next(e);
    }
  });

  router.get('/attendance', requirePermission('attendance', 'view'), async (req, res, next) => {
    try {
      const todayKey = associationCalendarYmd();
      const fromKey = req.query.from
        ? String(req.query.from).slice(0, 10)
        : todayKey;
      const toKey = req.query.to ? String(req.query.to).slice(0, 10) : fromKey;
      const from = associationDayBoundsUtc(fromKey).start;
      const to = associationDayBoundsUtc(toKey).end;
      const mode = String(req.query.mode || 'events');

      if (String(req.query.format || '') === 'csv' && mode === 'payroll') {
        const dateKeys = eachDateKey(fromKey, toKey);
        if (dateKeys.length > 62) {
          return res.status(400).json({ error: 'Date range max 62 days' });
        }
        const staffList = await prisma.associationStaff.findMany({
          where: {
            associationId: req.user.associationId,
            active: true,
            deletedAt: null,
            ...(req.query.staffId ? { id: String(req.query.staffId) } : {}),
            ...(req.query.category ? { category: String(req.query.category) } : {}),
          },
          orderBy: { name: 'asc' },
        });
        const rangeStart = associationDayBoundsUtc(dateKeys[0]).start;
        const rangeEnd = associationDayBoundsUtc(dateKeys[dateKeys.length - 1]).end;
        const leaveRange = associationDateColumnRange(
          dateKeys[0],
          dateKeys[dateKeys.length - 1]
        );
        const [entries, leaves, dayMarks] = await Promise.all([
          prisma.attendanceEntry.findMany({
            where: {
              staffId: { in: staffList.map((s) => s.id) },
              checkInAt: { gte: rangeStart, lt: rangeEnd },
            },
          }),
          prisma.staffLeave.findMany({
            where: {
              status: 'APPROVED',
              staffId: { in: staffList.map((s) => s.id) },
              startDate: { lte: leaveRange.lt },
              endDate: { gte: leaveRange.gte },
            },
          }),
          prisma.attendanceDayMark.findMany({
            where: {
              staffId: { in: staffList.map((s) => s.id) },
              date: { gte: leaveRange.gte, lt: leaveRange.lt },
              status: 'ABSENT',
            },
          }),
        ]);
        const rows = deriveDailyStatuses({
          staffList,
          entries,
          leaves,
          dayMarks,
          dateKeys,
        });
        const lines = [
          'staff,category,tower,designation,date,status,leaveType,hours,checkInAt,checkOutAt,note',
        ];
        for (const r of rows) {
          lines.push(
            [
              r.staffName,
              r.category,
              r.tower || '',
              r.designation || '',
              r.date,
              r.status,
              r.leaveType || '',
              r.hours,
              r.checkInAt || '',
              r.checkOutAt || '',
              r.note || '',
            ]
              .map(csvEscape)
              .join(',')
          );
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-payroll.csv"');
        return res.send(lines.join('\n'));
      }

      const rows = await prisma.attendanceEntry.findMany({
        where: {
          checkInAt: { gte: from, lt: to },
          staff: { associationId: req.user.associationId, deletedAt: null },
          ...(req.query.staffId ? { staffId: String(req.query.staffId) } : {}),
        },
        include: { staff: true },
        orderBy: { checkInAt: 'desc' },
      });
      if (String(req.query.format || '') === 'csv') {
        const lines = ['staff,category,checkInAt,checkOutAt,note'];
        for (const r of rows) {
          lines.push(
            [r.staff.name, r.staff.category, r.checkInAt.toISOString(), r.checkOutAt?.toISOString() || '', r.note || '']
              .map(csvEscape)
              .join(',')
          );
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
        return res.send(lines.join('\n'));
      }
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  function dayEndExclusive(dateKey) {
    return dateOnlyUtc(addCalendarDaysYmd(dateKey, 1));
  }

  async function loadMuster(req, fromKey, toKey) {
    const dateKeys = eachDateKey(fromKey, toKey);
    if (!dateKeys.length) return { dateKeys, staffList: [], rows: [], openCheckIns: 0 };
    if (dateKeys.length > 62) {
      const err = new Error('Date range max 62 days');
      err.status = 400;
      throw err;
    }
    const staffList = await prisma.associationStaff.findMany({
      where: {
        associationId: req.user.associationId,
        active: true,
        deletedAt: null,
        ...(req.query.staffId ? { id: String(req.query.staffId) } : {}),
        ...(req.query.category ? { category: String(req.query.category) } : {}),
      },
      orderBy: { name: 'asc' },
    });
    const rangeStart = associationDayBoundsUtc(dateKeys[0]).start;
    const rangeEnd = associationDayBoundsUtc(dateKeys[dateKeys.length - 1]).end;
    const leaveRange = associationDateColumnRange(
      dateKeys[0],
      dateKeys[dateKeys.length - 1]
    );
    const staffIds = staffList.map((s) => s.id);
    const [entries, leaves, dayMarks, openCheckIns] = await Promise.all([
      prisma.attendanceEntry.findMany({
        where: {
          staffId: { in: staffIds },
          checkInAt: { gte: rangeStart, lt: rangeEnd },
        },
      }),
      prisma.staffLeave.findMany({
        where: {
          status: 'APPROVED',
          staffId: { in: staffIds },
          startDate: { lte: leaveRange.lt },
          endDate: { gte: leaveRange.gte },
        },
      }),
      prisma.attendanceDayMark.findMany({
        where: {
          staffId: { in: staffIds },
          date: { gte: leaveRange.gte, lt: leaveRange.lt },
          status: 'ABSENT',
        },
      }),
      prisma.attendanceEntry.count({
        where: {
          checkOutAt: null,
          staff: {
            associationId: req.user.associationId,
            active: true,
            deletedAt: null,
          },
        },
      }),
    ]);
    const rows = deriveDailyStatuses({
      staffList,
      entries,
      leaves,
      dayMarks,
      dateKeys,
    });
    return { dateKeys, staffList, rows, openCheckIns, entries, leaves, dayMarks };
  }

  router.get('/attendance/summary', requirePermission('attendance', 'view'), async (req, res, next) => {
    try {
      const todayKey = associationCalendarYmd();
      const fromKey = req.query.from ? toDateKey(String(req.query.from)) : todayKey;
      const toKey = req.query.to ? toDateKey(String(req.query.to)) : todayKey;
      const { staffList, rows, openCheckIns } = await loadMuster(req, fromKey, toKey);
      const summary = summarizeStatuses(rows, {
        todayKey,
        openCheckIns,
        rosterActive: staffList.length,
      });
      res.json({ from: fromKey, to: toKey, ...summary });
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: e.message });
      next(e);
    }
  });

  router.get('/attendance/history', requirePermission('attendance', 'view'), async (req, res, next) => {
    try {
      const todayKey = associationCalendarYmd();
      const toKey = req.query.to ? toDateKey(String(req.query.to)) : todayKey;
      const fromKey = req.query.from
        ? toDateKey(String(req.query.from))
        : addCalendarDaysYmd(toKey, -6);
      const { rows } = await loadMuster(req, fromKey, toKey);
      res.json({ from: fromKey, to: toKey, rows });
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: e.message });
      next(e);
    }
  });

  router.get('/leave', requirePermission('attendance', 'view'), async (req, res, next) => {
    try {
      const todayKey = associationCalendarYmd();
      const [y, m] = todayKey.split('-').map(Number);
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const fromKey = req.query.from
        ? toDateKey(String(req.query.from))
        : monthStart;
      const toKey = req.query.to ? toDateKey(String(req.query.to)) : monthEnd;
      const from = dateOnlyUtc(fromKey);
      const to = dayEndExclusive(toKey);
      const rows = await prisma.staffLeave.findMany({
        where: {
          staff: { associationId: req.user.associationId, deletedAt: null },
          startDate: { lte: to },
          endDate: { gte: from },
          ...(req.query.staffId ? { staffId: String(req.query.staffId) } : {}),
          ...(req.query.status ? { status: String(req.query.status) } : {}),
        },
        include: { staff: true },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  router.post('/leave', requirePermission('attendance', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          staffId: z.string().uuid(),
          startDate: z.string().min(8),
          endDate: z.string().min(8),
          leaveType: z.enum(LEAVE_TYPES),
          reason: z.string().optional().nullable(),
        })
        .parse(req.body);
      const start = parseDateOnly(body.startDate);
      const end = parseDateOnly(body.endDate);
      if (end < start) {
        return res.status(400).json({ error: 'endDate must be on or after startDate' });
      }
      const staff = await prisma.associationStaff.findFirst({
        where: {
          id: body.staffId,
          associationId: req.user.associationId,
          active: true,
          deletedAt: null,
        },
      });
      if (!staff) return res.status(404).json({ error: 'Staff not found' });
      const leave = await prisma.staffLeave.create({
        data: {
          staffId: staff.id,
          startDate: start,
          endDate: end,
          leaveType: body.leaveType,
          reason: body.reason || null,
          status: 'APPROVED',
          recordedByUserId: req.user.id,
        },
        include: { staff: true },
      });
      res.status(201).json(leave);
    } catch (e) {
      next(e);
    }
  });

  router.post('/leave/:id/cancel', requirePermission('attendance', 'createEdit'), async (req, res, next) => {
    try {
      const leave = await prisma.staffLeave.findFirst({
        where: { id: req.params.id },
        include: { staff: true },
      });
      if (!leave || leave.staff.associationId !== req.user.associationId) {
        return res.status(404).json({ error: 'Leave not found' });
      }
      if (leave.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Already cancelled' });
      }
      const updated = await prisma.staffLeave.update({
        where: { id: leave.id },
        data: { status: 'CANCELLED' },
        include: { staff: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/attendance/check-in',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const body = z
          .object({
            staffId: z.string().uuid(),
            at: z.string().optional(),
            note: z.string().optional().nullable(),
          })
          .parse(req.body);
        const staff = await prisma.associationStaff.findFirst({
          where: {
            id: body.staffId,
            associationId: req.user.associationId,
            active: true,
            deletedAt: null,
          },
        });
        if (!staff) return res.status(404).json({ error: 'Staff not found' });

        const checkInAt = body.at ? new Date(body.at) : new Date();
        const dayKey = associationCalendarYmd(checkInAt);
        const { start, end } = associationDayBoundsUtc(dayKey);
        const dateCol = dateOnlyUtc(dayKey);

        const open = await prisma.attendanceEntry.findFirst({
          where: { staffId: staff.id, checkOutAt: null },
        });
        if (open) {
          return res
            .status(400)
            .json({ error: 'Staff already has an open check-in — check out first' });
        }

        const closedToday = await prisma.attendanceEntry.findFirst({
          where: {
            staffId: staff.id,
            checkInAt: { gte: start, lt: end },
            checkOutAt: { not: null },
          },
        });
        if (closedToday) {
          return res.status(400).json({
            error:
              'Staff already completed check-in/out for today — only one shift per day',
          });
        }

        const onLeave = await prisma.staffLeave.findFirst({
          where: {
            staffId: staff.id,
            status: 'APPROVED',
            startDate: { lte: dateCol },
            endDate: { gte: dateCol },
          },
        });
        if (onLeave) {
          return res
            .status(400)
            .json({ error: 'Staff is on leave today — cannot check in' });
        }

        const absentMark = await prisma.attendanceDayMark.findFirst({
          where: {
            staffId: staff.id,
            date: dateCol,
            status: 'ABSENT',
          },
        });
        if (absentMark) {
          return res.status(400).json({
            error:
              'Staff is marked absent today — clear the absent mark before check-in',
          });
        }

        const entry = await prisma.attendanceEntry.create({
          data: {
            staffId: staff.id,
            checkInAt,
            note: body.note || null,
            recordedByUserId: req.user.id,
          },
          include: { staff: true },
        });
        res.status(201).json(entry);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/attendance/:id/check-out',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const entry = await prisma.attendanceEntry.findFirst({
          where: { id: req.params.id },
          include: { staff: true },
        });
        if (!entry || entry.staff.associationId !== req.user.associationId) {
          return res.status(404).json({ error: 'Attendance entry not found' });
        }
        if (entry.checkOutAt) {
          return res.status(400).json({ error: 'Already checked out' });
        }
        const checkOutAt = req.body?.at ? new Date(req.body.at) : new Date();
        const dwell = checkOutAt.getTime() - new Date(entry.checkInAt).getTime();
        if (dwell < 0) {
          return res
            .status(400)
            .json({ error: 'Check-out time must be after check-in' });
        }
        if (dwell < MIN_PUNCH_DWELL_MS) {
          const waitSec = Math.ceil((MIN_PUNCH_DWELL_MS - dwell) / 1000);
          return res.status(400).json({
            error: `Check-out too soon after check-in — wait ${waitSec}s (min 30s) to avoid accidental double-click`,
          });
        }
        const updated = await prisma.attendanceEntry.update({
          where: { id: entry.id },
          data: {
            checkOutAt,
            note: req.body?.note ?? entry.note,
          },
          include: { staff: true },
        });
        res.json(updated);
      } catch (e) {
        next(e);
      }
    }
  );

  router.get(
    '/attendance/day-state',
    requirePermission('attendance', 'view'),
    async (req, res, next) => {
      try {
        const dateKey = req.query.date
          ? toDateKey(String(req.query.date))
          : associationCalendarYmd();
        const { start, end } = associationDayBoundsUtc(dateKey);
        const dateCol = associationDateColumnRange(dateKey, dateKey);
        const staffList = await prisma.associationStaff.findMany({
          where: {
            associationId: req.user.associationId,
            active: true,
            deletedAt: null,
          },
          orderBy: { name: 'asc' },
        });
        const staffIds = staffList.map((s) => s.id);
        const [entries, leaves, dayMarks] = await Promise.all([
          prisma.attendanceEntry.findMany({
            where: {
              staffId: { in: staffIds },
              checkInAt: { gte: start, lt: end },
            },
          }),
          prisma.staffLeave.findMany({
            where: {
              status: 'APPROVED',
              staffId: { in: staffIds },
              startDate: { lte: dateCol.lt },
              endDate: { gte: dateCol.gte },
            },
          }),
          prisma.attendanceDayMark.findMany({
            where: {
              staffId: { in: staffIds },
              date: { gte: dateCol.gte, lt: dateCol.lt },
              status: 'ABSENT',
            },
          }),
        ]);
        // Also surface open punches from prior days so UI can force check-out
        const openPrior = await prisma.attendanceEntry.findMany({
          where: {
            staffId: { in: staffIds },
            checkOutAt: null,
            checkInAt: { lt: start },
          },
        });
        const states = buildDayStates({
          staffList,
          entries,
          leaves,
          dayMarks,
          dateKey,
        });
        for (const prior of openPrior) {
          const row = states.find((s) => s.staffId === prior.staffId);
          if (row && row.state === 'NOT_IN') {
            row.state = 'IN';
            row.entryId = prior.id;
            row.checkInAt = prior.checkInAt;
            row.canCheckOut =
              Date.now() - new Date(prior.checkInAt).getTime() >=
              MIN_PUNCH_DWELL_MS;
            row.priorDayOpen = true;
          }
        }
        res.json({ date: dateKey, states });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/attendance/mark-absent',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const body = z
          .object({
            staffId: z.string().uuid(),
            date: z.string().optional(),
            note: z.string().optional().nullable(),
          })
          .parse(req.body);
        const staff = await prisma.associationStaff.findFirst({
          where: {
            id: body.staffId,
            associationId: req.user.associationId,
            active: true,
            deletedAt: null,
          },
        });
        if (!staff) return res.status(404).json({ error: 'Staff not found' });

        const dayKey = body.date
          ? toDateKey(body.date)
          : associationCalendarYmd();
        const { start, end } = associationDayBoundsUtc(dayKey);
        const dateCol = dateOnlyUtc(dayKey);

        const onLeave = await prisma.staffLeave.findFirst({
          where: {
            staffId: staff.id,
            status: 'APPROVED',
            startDate: { lte: dateCol },
            endDate: { gte: dateCol },
          },
        });
        if (onLeave) {
          return res
            .status(400)
            .json({ error: 'Staff is on leave — cannot mark absent' });
        }

        const punched = await prisma.attendanceEntry.findFirst({
          where: {
            staffId: staff.id,
            checkInAt: { gte: start, lt: end },
          },
        });
        if (punched) {
          return res.status(400).json({
            error: 'Staff already has a check-in today — cannot mark absent',
          });
        }

        const mark = await prisma.attendanceDayMark.upsert({
          where: {
            staffId_date: { staffId: staff.id, date: dateCol },
          },
          create: {
            staffId: staff.id,
            date: dateCol,
            status: 'ABSENT',
            note: body.note || null,
            recordedByUserId: req.user.id,
          },
          update: {
            status: 'ABSENT',
            note: body.note || null,
            recordedByUserId: req.user.id,
          },
          include: { staff: true },
        });
        res.status(201).json(mark);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/attendance/clear-absent',
    requirePermission('attendance', 'createEdit'),
    async (req, res, next) => {
      try {
        const body = z
          .object({
            staffId: z.string().uuid(),
            date: z.string().optional(),
          })
          .parse(req.body);
        const staff = await prisma.associationStaff.findFirst({
          where: {
            id: body.staffId,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!staff) return res.status(404).json({ error: 'Staff not found' });
        const dayKey = body.date
          ? toDateKey(body.date)
          : associationCalendarYmd();
        const dateCol = dateOnlyUtc(dayKey);
        const existing = await prisma.attendanceDayMark.findFirst({
          where: { staffId: staff.id, date: dateCol, status: 'ABSENT' },
        });
        if (!existing) {
          return res.status(404).json({ error: 'No absent mark for that day' });
        }
        await prisma.attendanceDayMark.delete({ where: { id: existing.id } });
        res.json({ ok: true, staffId: staff.id, date: dayKey });
      } catch (e) {
        next(e);
      }
    }
  );

  // -------- Moves (008) --------
  router.get('/moves', requirePermission('moves', 'view'), async (req, res, next) => {
    try {
      const where = {
        associationId: req.user.associationId,
        ...(req.query.status ? { status: String(req.query.status) } : {}),
        ...(req.query.type ? { type: String(req.query.type) } : {}),
      };
      if (req.query.date === 'today') {
        // Match @db.Date by calendar day in association TZ (not local toDateString UTC skew).
        where.scheduledDate = associationDateColumnRange(
          associationCalendarYmd(),
          associationCalendarYmd()
        );
        // Gate list: active moves for Security (FR-007)
        if (!req.query.status) {
          where.status = { in: ['APPROVED', 'IN_PROGRESS'] };
        }
      }
      if (isResident(req.user.role)) {
        const ids = await linkedFlatIds(prisma, req.user.id);
        const safe = ids.length ? ids : ['00000000-0000-4000-8000-000000000000'];
        where.OR = [{ flatId: { in: safe } }, { destinationFlatId: { in: safe } }];
      }
      const rows = await prisma.moveRequest.findMany({
        where,
        include: {
          flat: true,
          destinationFlat: true,
          handover: true,
          statusEvents: { orderBy: { createdAt: 'asc' } },
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
      });
      res.json(rows);
    } catch (e) {
      next(e);
    }
  });

  router.post('/moves', requirePermission('moves', 'createEdit'), async (req, res, next) => {
    try {
      const body = z
        .object({
          flatId: z.string().uuid(),
          destinationFlatId: z.string().uuid().optional().nullable(),
          type: z.enum(['MOVE_IN', 'MOVE_OUT', 'INTERNAL_SHIFT']),
          partyType: z.enum(['OWNER', 'TENANT']),
          scheduledDate: z.string().min(1),
          contactName: z.string().min(1),
          contactPhone: z.string().min(5),
          moverNotes: z.string().optional().nullable(),
          checklistJson: z.record(z.any()).optional().nullable(),
        })
        .parse(req.body);
      const flat = await prisma.flat.findFirst({
        where: {
          id: body.flatId,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!flat) return res.status(404).json({ error: 'Flat not found' });
      if (isResident(req.user.role)) {
        const owns = await residentOwnsFlat(prisma, req.user.id, body.flatId);
        if (!owns) {
          return res.status(403).json({ error: 'Not linked to this flat' });
        }
      }

      let destinationFlatId = null;
      if (body.type === 'INTERNAL_SHIFT') {
        if (!body.destinationFlatId) {
          return res.status(400).json({ error: 'Destination flat is required for internal shift' });
        }
        if (body.destinationFlatId === body.flatId) {
          return res.status(400).json({ error: 'Origin and destination flats must differ' });
        }
        const dest = await prisma.flat.findFirst({
          where: {
            id: body.destinationFlatId,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!dest) return res.status(404).json({ error: 'Destination flat not found' });
        destinationFlatId = dest.id;
      }

      const move = await prisma.moveRequest.create({
        data: {
          associationId: req.user.associationId,
          flatId: body.flatId,
          destinationFlatId,
          type: body.type,
          partyType: body.partyType,
          scheduledDate: new Date(body.scheduledDate),
          contactName: body.contactName,
          contactPhone: body.contactPhone,
          moverNotes: body.moverNotes || null,
          checklistJson: body.checklistJson || {},
          status: 'REQUESTED',
        },
        include: { flat: true, destinationFlat: true },
      });
      await recordMoveStatus(prisma, move.id, null, 'REQUESTED', req.user.id);
      res.status(201).json(move);
    } catch (e) {
      next(e);
    }
  });

  async function transitionMove(req, res, next, toStatus, extraFn) {
    try {
      if (!canRunMoveWorkflow(req.user.role)) {
        return res.status(403).json({ error: 'Only staff may change move status' });
      }
      const move = await prisma.moveRequest.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: { flat: true, destinationFlat: true },
      });
      if (!move) return res.status(404).json({ error: 'Move request not found' });

      if (toStatus === 'IN_PROGRESS') {
        const flatIds = [move.flatId, move.destinationFlatId].filter(Boolean);
        const overlap = await prisma.moveRequest.findFirst({
          where: {
            id: { not: move.id },
            status: 'IN_PROGRESS',
            OR: [
              { flatId: { in: flatIds } },
              { destinationFlatId: { in: flatIds } },
            ],
          },
        });
        if (overlap) {
          return res
            .status(400)
            .json({ error: 'Another move is already in progress for this flat' });
        }
      }

      let extra = {};
      if (typeof extraFn === 'function') {
        extra = (await extraFn(move, req)) || {};
      }

      const updated = await prisma.moveRequest.update({
        where: { id: move.id },
        data: { status: toStatus },
        include: {
          flat: true,
          destinationFlat: true,
          handover: true,
          statusEvents: true,
        },
      });
      await recordMoveStatus(
        prisma,
        move.id,
        move.status,
        toStatus,
        req.user.id,
        req.body?.reason || req.body?.note
      );

      if (toStatus === 'COMPLETED' && extra.occupancyStatus) {
        await prisma.flat.update({
          where: { id: move.flatId },
          data: { occupancyStatus: extra.occupancyStatus },
        });
      }
      if (toStatus === 'COMPLETED' && extra.destinationOccupancyStatus && move.destinationFlatId) {
        await prisma.flat.update({
          where: { id: move.destinationFlatId },
          data: { occupancyStatus: extra.destinationOccupancyStatus },
        });
      }
      if (toStatus === 'COMPLETED' && extra.transferMembers && move.destinationFlatId) {
        await prisma.flatMember.updateMany({
          where: {
            flatId: move.flatId,
            isActive: true,
            deletedAt: null,
          },
          data: { flatId: move.destinationFlatId },
        });
      }
      if (toStatus === 'COMPLETED' && extra.transferHousehold && move.destinationFlatId) {
        const destId = move.destinationFlatId;
        const originId = move.flatId;
        const approved = { approvalStatus: 'APPROVED', deletedAt: null };
        await prisma.parkingSlot.updateMany({
          where: { flatId: originId, deletedAt: null },
          data: { flatId: destId },
        });
        await prisma.flatVehicle.updateMany({
          where: { flatId: originId, ...approved },
          data: { flatId: destId },
        });
        await prisma.flatPet.updateMany({
          where: { flatId: originId, ...approved },
          data: { flatId: destId },
        });
        await prisma.flatEmergencyContact.updateMany({
          where: { flatId: originId, ...approved },
          data: { flatId: destId },
        });
        await prisma.flatAccessDevice.updateMany({
          where: { flatId: originId, ...approved },
          data: { flatId: destId },
        });
      }
      if (toStatus === 'COMPLETED' && extra.handover) {
        await prisma.moveHandover.create({
          data: { moveRequestId: move.id, ...extra.handover },
        });
      }

      const full = await prisma.moveRequest.findUnique({
        where: { id: move.id },
        include: {
          flat: true,
          destinationFlat: true,
          handover: true,
          statusEvents: true,
        },
      });
      res.json(full);
    } catch (e) {
      next(e);
    }
  }

  router.post('/moves/:id/approve', requirePermission('moves', 'createEdit'), (req, res, next) =>
    transitionMove(req, res, next, 'APPROVED')
  );
  router.post('/moves/:id/reject', requirePermission('moves', 'createEdit'), (req, res, next) =>
    transitionMove(req, res, next, 'REJECTED')
  );
  router.post('/moves/:id/start', requirePermission('moves', 'createEdit'), (req, res, next) =>
    transitionMove(req, res, next, 'IN_PROGRESS')
  );
  router.post('/moves/:id/cancel', requirePermission('moves', 'createEdit'), (req, res, next) =>
    transitionMove(req, res, next, 'CANCELLED')
  );
  router.post('/moves/:id/complete', requirePermission('moves', 'createEdit'), (req, res, next) =>
    transitionMove(req, res, next, 'COMPLETED', async (move, req) => {
      const body = z
        .object({
          electricityMeter: z.string().optional().nullable(),
          waterMeter: z.string().optional().nullable(),
          keysCount: z.number().int().optional().nullable(),
          accessCardsCount: z.number().int().optional().nullable(),
          parkingTagsCount: z.number().int().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
        .parse(req.body || {});
      let occupancyStatus = move.flat.occupancyStatus;
      let destinationOccupancyStatus = null;
      let transferMembers = false;
      let transferHousehold = false;
      if (move.type === 'MOVE_IN') {
        occupancyStatus =
          move.partyType === 'TENANT' ? 'TENANT_OCCUPIED' : 'OWNER_OCCUPIED';
      } else if (move.type === 'MOVE_OUT') {
        occupancyStatus = 'VACANT';
      } else if (move.type === 'INTERNAL_SHIFT') {
        if (!move.destinationFlatId) {
          throw Object.assign(new Error('Destination flat missing'), { status: 400 });
        }
        occupancyStatus = 'VACANT';
        destinationOccupancyStatus =
          move.partyType === 'TENANT' ? 'TENANT_OCCUPIED' : 'OWNER_OCCUPIED';
        transferMembers = true;
        transferHousehold = true;
      }
      return {
        occupancyStatus,
        destinationOccupancyStatus,
        transferMembers,
        transferHousehold,
        handover: {
          electricityMeter: body.electricityMeter || null,
          waterMeter: body.waterMeter || null,
          keysCount: body.keysCount ?? null,
          accessCardsCount: body.accessCardsCount ?? null,
          parkingTagsCount: body.parkingTagsCount ?? null,
          notes: body.notes || null,
        },
      };
    })
  );

  router.get('/moves/:id/pdf', requirePermission('moves', 'view'), async (req, res, next) => {
    try {
      const move = await prisma.moveRequest.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: {
          flat: true,
          destinationFlat: true,
          statusEvents: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!move) return res.status(404).json({ error: 'Move request not found' });
      if (isResident(req.user.role)) {
        const ownsOrigin = await residentOwnsFlat(prisma, req.user.id, move.flatId);
        const ownsDest = move.destinationFlatId
          ? await residentOwnsFlat(prisma, req.user.id, move.destinationFlatId)
          : false;
        if (!ownsOrigin && !ownsDest) {
          return res.status(403).json({ error: 'Not linked to this move' });
        }
      }
      if (!canDownloadMovePdf(move.status)) {
        return res.status(400).json({
          error:
            'PDF authorization is available only after the move is approved',
        });
      }
      await streamMovePdf(res, move);
    } catch (e) {
      next(e);
    }
  });

  router.get('/moves/:id', requirePermission('moves', 'view'), async (req, res, next) => {
    try {
      const move = await prisma.moveRequest.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: {
          flat: true,
          destinationFlat: true,
          handover: true,
          statusEvents: { orderBy: { createdAt: 'asc' } },
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!move) return res.status(404).json({ error: 'Move request not found' });
      if (isResident(req.user.role)) {
        const ownsOrigin = await residentOwnsFlat(prisma, req.user.id, move.flatId);
        const ownsDest = move.destinationFlatId
          ? await residentOwnsFlat(prisma, req.user.id, move.destinationFlatId)
          : false;
        if (!ownsOrigin && !ownsDest) {
          return res.status(403).json({ error: 'Not linked to this move' });
        }
      }
      res.json(move);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/moves/:id/attachments',
    requirePermission('moves', 'createEdit'),
    moveAttachmentUpload.single('file'),
    async (req, res, next) => {
      try {
        const move = await prisma.moveRequest.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        if (!move) return res.status(404).json({ error: 'Move request not found' });
        if (!canRunMoveWorkflow(req.user.role)) {
          if (!isResident(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          const ownsOrigin = await residentOwnsFlat(prisma, req.user.id, move.flatId);
          const ownsDest = move.destinationFlatId
            ? await residentOwnsFlat(prisma, req.user.id, move.destinationFlatId)
            : false;
          if (!ownsOrigin && !ownsDest) {
            return res.status(403).json({ error: 'Not linked to this move' });
          }
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const label = req.body?.label ? String(req.body.label).trim() : null;
        const saved = await persistMulterFile(req.file, 'moves');
        const row = await prisma.moveAttachment.create({
          data: {
            moveRequestId: move.id,
            label: label || null,
            originalName: req.file.originalname,
            fileName: saved.filename,
            mimeType: req.file.mimetype,
            url: saved.url,
            uploadedByUserId: req.user.id || null,
          },
        });
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  router.delete(
    '/moves/:id/attachments/:attachmentId',
    requirePermission('moves', 'createEdit'),
    async (req, res, next) => {
      try {
        const move = await prisma.moveRequest.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        if (!move) return res.status(404).json({ error: 'Move request not found' });
        if (!canRunMoveWorkflow(req.user.role)) {
          if (!isResident(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          const ownsOrigin = await residentOwnsFlat(prisma, req.user.id, move.flatId);
          const ownsDest = move.destinationFlatId
            ? await residentOwnsFlat(prisma, req.user.id, move.destinationFlatId)
            : false;
          if (!ownsOrigin && !ownsDest) {
            return res.status(403).json({ error: 'Not linked to this move' });
          }
        }
        const att = await prisma.moveAttachment.findFirst({
          where: {
            id: req.params.attachmentId,
            moveRequestId: move.id,
            deletedAt: null,
          },
        });
        if (!att) return res.status(404).json({ error: 'Attachment not found' });
        const updated = await prisma.moveAttachment.update({
          where: { id: att.id },
          data: { deletedAt: new Date() },
        });
        res.json(updated);
      } catch (e) {
        next(e);
      }
    }
  );

  // -------- Notices (009) --------
  router.get('/notices', requirePermission('notices', 'view'), async (req, res, next) => {
    try {
      const isResident = req.user.role === 'RESIDENT';
      const status = isResident ? 'PUBLISHED' : req.query.status || undefined;
      const q = String(req.query.q || '').trim();
      const category = req.query.category ? String(req.query.category) : undefined;
      const notices = await prisma.notice.findMany({
        where: {
          associationId: req.user.associationId,
          ...(status ? { status: String(status) } : {}),
          ...(category ? { category } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { body: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      });
      res.json(notices);
    } catch (e) {
      next(e);
    }
  });

  router.get('/notices/:id', requirePermission('notices', 'view'), async (req, res, next) => {
    try {
      const notice = await prisma.notice.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
        include: { statusEvents: { orderBy: { createdAt: 'asc' } } },
      });
      if (!notice) return res.status(404).json({ error: 'Notice not found' });
      if (req.user.role === 'RESIDENT' && notice.status !== 'PUBLISHED') {
        return res.status(404).json({ error: 'Notice not found' });
      }
      res.json(notice);
    } catch (e) {
      next(e);
    }
  });

  router.post('/notices', requirePermission('notices', 'createEdit'), async (req, res, next) => {
    try {
      const parsed = noticeWriteSchema.parse(req.body);
      const notice = await prisma.notice.create({
        data: {
          associationId: req.user.associationId,
          title: parsed.title.trim(),
          body: parsed.body.trim(),
          category: parsed.category?.trim() || null,
          status: 'DRAFT',
          createdByUserId: req.user.id || null,
        },
      });
      await recordNoticeStatus(prisma, notice.id, null, 'DRAFT', req.user.id, 'Created');
      res.status(201).json(notice);
    } catch (e) {
      next(e);
    }
  });

  router.patch('/notices/:id', requirePermission('notices', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.notice.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!existing) return res.status(404).json({ error: 'Notice not found' });
      if (!['DRAFT', 'UNPUBLISHED'].includes(existing.status)) {
        return res.status(400).json({
          error: 'Only draft or unpublished notices can be edited',
        });
      }
      const parsed = noticeWriteSchema.parse(req.body);
      const notice = await prisma.notice.update({
        where: { id: existing.id },
        data: {
          title: parsed.title.trim(),
          body: parsed.body.trim(),
          category: parsed.category?.trim() || null,
        },
      });
      res.json(notice);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/notices/:id/publish',
    requirePermission('notices', 'createEdit'),
    async (req, res, next) => {
      try {
        const existing = await prisma.notice.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        if (!existing) return res.status(404).json({ error: 'Notice not found' });
        if (!['DRAFT', 'UNPUBLISHED'].includes(existing.status)) {
          return res.status(400).json({
            error: 'Only draft or unpublished notices can be published',
          });
        }
        if (!existing.title?.trim() || !existing.body?.trim()) {
          return res.status(400).json({ error: 'Title and body are required' });
        }

        const publishedAt = new Date();
        const publishedByName =
          req.body?.publishedByName ||
          req.user.name ||
          req.user.email ||
          'Secretary';

        const pdf = await generateNoticePdf({
          noticeId: existing.id,
          associationId: req.user.associationId,
          title: existing.title,
          body: existing.body,
          category: existing.category,
          publishedAt,
          publishedByName,
        });

        const notice = await prisma.notice.update({
          where: { id: existing.id },
          data: {
            status: 'PUBLISHED',
            publishedAt,
            publishedByName,
            publishedByUserId: req.user.id || null,
            pdfFileName: pdf.fileName,
            pdfPath: pdf.publicPath,
          },
        });
        await recordNoticeStatus(
          prisma,
          notice.id,
          existing.status,
          'PUBLISHED',
          req.user.id,
          'Published'
        );

        if (notifications) {
          await notifications.emit({
            associationId: req.user.associationId,
            type: ALERT_TYPES.NOTICE_PUBLISHED,
            severity: SEVERITY.INFO,
            relatedEntityType: 'Notice',
            relatedEntityId: notice.id,
            message: `New notice published: ${notice.title}`,
          });
        }

        res.json(notice);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/notices/:id/unpublish',
    requirePermission('notices', 'createEdit'),
    async (req, res, next) => {
      try {
        const existing = await prisma.notice.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        if (!existing) return res.status(404).json({ error: 'Notice not found' });
        if (existing.status !== 'PUBLISHED') {
          return res.status(400).json({ error: 'Only published notices can be unpublished' });
        }
        const notice = await prisma.notice.update({
          where: { id: existing.id },
          data: { status: 'UNPUBLISHED' },
        });
        await recordNoticeStatus(
          prisma,
          notice.id,
          'PUBLISHED',
          'UNPUBLISHED',
          req.user.id,
          req.body?.note || 'Unpublished'
        );
        res.json(notice);
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/notices/:id/archive',
    requirePermission('notices', 'createEdit'),
    async (req, res, next) => {
      try {
        const existing = await prisma.notice.findFirst({
          where: { id: req.params.id, associationId: req.user.associationId },
        });
        if (!existing) return res.status(404).json({ error: 'Notice not found' });
        if (existing.status === 'ARCHIVED') {
          return res.status(400).json({ error: 'Notice already archived' });
        }
        const notice = await prisma.notice.update({
          where: { id: existing.id },
          data: { status: 'ARCHIVED' },
        });
        await recordNoticeStatus(
          prisma,
          notice.id,
          existing.status,
          'ARCHIVED',
          req.user.id,
          req.body?.note || 'Archived'
        );
        res.json(notice);
      } catch (e) {
        next(e);
      }
    }
  );

  router.get('/notices/:id/pdf', requirePermission('notices', 'view'), async (req, res, next) => {
    try {
      const notice = await prisma.notice.findFirst({
        where: { id: req.params.id, associationId: req.user.associationId },
      });
      if (!notice) return res.status(404).json({ error: 'Notice not found' });
      if (req.user.role === 'RESIDENT' && notice.status !== 'PUBLISHED') {
        return res.status(404).json({ error: 'Notice not found' });
      }
      if (!notice.pdfPath || !notice.pdfFileName) {
        return res.status(404).json({ error: 'PDF not available' });
      }
      if (useObjectStorage()) {
        const resolved = await resolveUpload(`notices/${notice.pdfFileName}`);
        if (resolved.kind === 'redirect') {
          return res.redirect(302, resolved.url);
        }
        return res.status(404).json({ error: 'PDF file missing' });
      }
      const filePath = path.join(noticesUploadDir, notice.pdfFileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'PDF file missing' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${notice.pdfFileName}"`
      );
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      next(e);
    }
  });

  // -------- Board / office bearers (010) --------
  const roleWriteSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    sortOrder: z.number().int().optional(),
    showOnLetterhead: z.boolean().optional(),
    isPresidentSigner: z.boolean().optional(),
    active: z.boolean().optional(),
  });

  const memberWriteSchema = z.object({
    roleId: z.string().uuid(),
    fullName: z.string().min(1),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    notes: z.string().optional().nullable(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
  });

  router.get('/board/letterhead', requirePermission('board', 'view'), async (req, res, next) => {
    try {
      const { loadLetterheadBoard } = await import('../lib/associationBrand.js');
      const data = await loadLetterheadBoard(prisma, req.user.associationId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  });

  // Public-ish letterhead for any authenticated user who can print docs (notices/noc view)
  router.get('/board/letterhead-public', async (req, res, next) => {
    try {
      const { loadLetterheadBoard } = await import('../lib/associationBrand.js');
      const data = await loadLetterheadBoard(prisma, req.user.associationId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  });

  router.get('/board/roles', requirePermission('board', 'view'), async (req, res, next) => {
    try {
      const includeInactive = String(req.query.includeInactive || '') === 'true';
      const roles = await prisma.officeBearerRole.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(includeInactive ? {} : { active: true }),
        },
        orderBy: { sortOrder: 'asc' },
        include: {
          members: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      res.json(roles);
    } catch (e) {
      next(e);
    }
  });

  router.post('/board/roles', requirePermission('board', 'createEdit'), async (req, res, next) => {
    try {
      const parsed = roleWriteSchema.parse(req.body);
      const code = parsed.code.trim().toUpperCase().replace(/\s+/g, '_');
      if (parsed.isPresidentSigner) {
        await prisma.officeBearerRole.updateMany({
          where: { associationId: req.user.associationId, deletedAt: null },
          data: { isPresidentSigner: false },
        });
      }
      const role = await prisma.officeBearerRole.create({
        data: {
          associationId: req.user.associationId,
          name: parsed.name.trim(),
          code,
          sortOrder: parsed.sortOrder ?? 0,
          showOnLetterhead: parsed.showOnLetterhead ?? true,
          isPresidentSigner: parsed.isPresidentSigner ?? false,
          active: parsed.active ?? true,
        },
      });
      res.status(201).json(role);
    } catch (e) {
      next(e);
    }
  });

  router.patch('/board/roles/:id', requirePermission('board', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.officeBearerRole.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Role not found' });
      const parsed = roleWriteSchema.partial().parse(req.body);
      if (parsed.isPresidentSigner) {
        await prisma.officeBearerRole.updateMany({
          where: {
            associationId: req.user.associationId,
            deletedAt: null,
            NOT: { id: existing.id },
          },
          data: { isPresidentSigner: false },
        });
      }
      const role = await prisma.officeBearerRole.update({
        where: { id: existing.id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
          ...(parsed.code !== undefined
            ? { code: parsed.code.trim().toUpperCase().replace(/\s+/g, '_') }
            : {}),
          ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
          ...(parsed.showOnLetterhead !== undefined
            ? { showOnLetterhead: parsed.showOnLetterhead }
            : {}),
          ...(parsed.isPresidentSigner !== undefined
            ? { isPresidentSigner: parsed.isPresidentSigner }
            : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
        },
      });
      res.json(role);
    } catch (e) {
      next(e);
    }
  });

  router.delete('/board/roles/:id', requirePermission('board', 'delete'), async (req, res, next) => {
    try {
      const existing = await prisma.officeBearerRole.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Role not found' });
      const role = await prisma.officeBearerRole.update({
        where: { id: existing.id },
        data: { active: false, deletedAt: new Date() },
      });
      res.json(role);
    } catch (e) {
      next(e);
    }
  });

  router.get('/board/members', requirePermission('board', 'view'), async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      const members = await prisma.officeBearerMember.findMany({
        where: {
          associationId: req.user.associationId,
          deletedAt: null,
          ...(req.query.roleId ? { roleId: String(req.query.roleId) } : {}),
          ...(req.query.active === 'true' ? { active: true } : {}),
          ...(req.query.active === 'false' ? { active: false } : {}),
          ...(q
            ? { fullName: { contains: q, mode: 'insensitive' } }
            : {}),
        },
        include: { role: true },
        orderBy: [{ role: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      });
      res.json(members);
    } catch (e) {
      next(e);
    }
  });

  router.post('/board/members', requirePermission('board', 'createEdit'), async (req, res, next) => {
    try {
      const parsed = memberWriteSchema.parse(req.body);
      const role = await prisma.officeBearerRole.findFirst({
        where: {
          id: parsed.roleId,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!role) return res.status(400).json({ error: 'Invalid role' });
      const member = await prisma.officeBearerMember.create({
        data: {
          associationId: req.user.associationId,
          roleId: parsed.roleId,
          fullName: parsed.fullName.trim(),
          phone: parsed.phone || null,
          email: parsed.email || null,
          notes: parsed.notes || null,
          sortOrder: parsed.sortOrder ?? 0,
          active: parsed.active ?? true,
        },
        include: { role: true },
      });
      res.status(201).json(member);
    } catch (e) {
      next(e);
    }
  });

  router.patch('/board/members/:id', requirePermission('board', 'createEdit'), async (req, res, next) => {
    try {
      const existing = await prisma.officeBearerMember.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Member not found' });
      const parsed = memberWriteSchema.partial().parse(req.body);
      if (parsed.roleId) {
        const role = await prisma.officeBearerRole.findFirst({
          where: {
            id: parsed.roleId,
            associationId: req.user.associationId,
            deletedAt: null,
          },
        });
        if (!role) return res.status(400).json({ error: 'Invalid role' });
      }
      const member = await prisma.officeBearerMember.update({
        where: { id: existing.id },
        data: {
          ...(parsed.roleId !== undefined ? { roleId: parsed.roleId } : {}),
          ...(parsed.fullName !== undefined
            ? { fullName: parsed.fullName.trim() }
            : {}),
          ...(parsed.phone !== undefined ? { phone: parsed.phone || null } : {}),
          ...(parsed.email !== undefined ? { email: parsed.email || null } : {}),
          ...(parsed.notes !== undefined ? { notes: parsed.notes || null } : {}),
          ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
        },
        include: { role: true },
      });
      res.json(member);
    } catch (e) {
      next(e);
    }
  });

  router.delete('/board/members/:id', requirePermission('board', 'delete'), async (req, res, next) => {
    try {
      const existing = await prisma.officeBearerMember.findFirst({
        where: {
          id: req.params.id,
          associationId: req.user.associationId,
          deletedAt: null,
        },
      });
      if (!existing) return res.status(404).json({ error: 'Member not found' });
      const member = await prisma.officeBearerMember.update({
        where: { id: existing.id },
        data: { active: false, deletedAt: new Date() },
      });
      res.json(member);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
