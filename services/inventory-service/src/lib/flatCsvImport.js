import {
  formatCampusFlatId,
  parseCampusFlatQuery,
  EXTRA_FLAT_MEMBER_ROLES,
  findApartmentVariant,
  APARTMENT_CATALOG,
} from '@nhpaowa/shared-ui';
import { parseCsv } from './staffCsv.js';
import { syncFlatOccupancyFromMembers } from './flatOccupancy.js';

const OCC = new Set(['OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'VACANT']);
const VEHICLE_TYPES = new Set(['FOUR_WHEELER', 'TWO_WHEELER', 'EV', 'OTHER']);
const DEVICE_TYPES = new Set(['FOB', 'RFID_TAG', 'REMOTE', 'STICKER', 'OTHER']);
const DEVICE_STATUS = new Set(['ACTIVE', 'RETURNED', 'LOST']);
const EXTRA_MEMBER_ROLES = new Set(EXTRA_FLAT_MEMBER_ROLES);

function splitRecords(raw) {
  return String(raw || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitFields(raw) {
  return String(raw || '')
    .split(':')
    .map((s) => s.trim());
}

function resolveArea(apartmentType, configuration, explicit) {
  if (explicit !== '' && explicit != null && !Number.isNaN(Number(explicit))) {
    return Number(explicit);
  }
  const variant =
    typeof findApartmentVariant === 'function'
      ? findApartmentVariant(apartmentType, configuration)
      : APARTMENT_CATALOG.find(
          (v) =>
            v.apartmentType === apartmentType &&
            v.configuration === configuration
        );
  return variant?.superBuiltUpArea ?? null;
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

/**
 * Fill-missing merge: blank CSV ignored; blank current filled; equal ok;
 * both non-empty and unequal → conflict unless resolution provided.
 */
function mergeScalar({
  field,
  current,
  csv,
  row,
  tower,
  flatNumber,
  resolutions,
  conflicts,
}) {
  const csvVal = csv === null || csv === undefined ? '' : String(csv).trim();
  const curVal =
    current === null || current === undefined ? '' : String(current).trim();
  if (!csvVal) {
    return { value: current, filled: false };
  }
  if (!curVal) {
    return {
      value:
        field === 'floor' || field === 'parkingSlots' || field === 'superBuiltUpArea'
          ? Number(csvVal)
          : csvVal,
      filled: true,
    };
  }
  if (curVal === csvVal) {
    return { value: current, filled: false };
  }
  const id = `${row}:${field}`;
  const res = resolutions?.[id];
  if (res === 'csv') {
    return {
      value:
        field === 'floor' || field === 'parkingSlots' || field === 'superBuiltUpArea'
          ? Number(csvVal)
          : csvVal,
      filled: true,
    };
  }
  if (res === 'keep') {
    return { value: current, filled: false };
  }
  conflicts.push({
    id,
    row,
    tower,
    flatNumber,
    campusFlatId: formatCampusFlatId(tower, flatNumber),
    field,
    current: curVal,
    csv: csvVal,
  });
  return { value: current, filled: false };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} associationId
 * @param {string} csvText
 * @param {{ dryRun?: boolean, resolutions?: Record<string, 'keep'|'csv'> }} [opts]
 */
export async function importFlatsCsv(
  prisma,
  associationId,
  csvText,
  opts = {}
) {
  const dryRun = Boolean(opts.dryRun);
  const resolutions = opts.resolutions || {};

  const { headers, rows } = parseCsv(csvText);
  const empty = {
    dryRun,
    created: 0,
    updated: 0,
    filled: 0,
    skipped: 0,
    conflicts: [],
    errors: [],
    changes: [],
    message: '',
  };
  if (!headers.length) {
    return { ...empty, errors: [{ row: 0, message: 'Empty CSV' }] };
  }

  const headerSet = new Set(headers.map((h) => String(h).toLowerCase()));
  const hasCampus = headerSet.has('campusflatid');
  if (
    !hasCampus &&
    (!headerSet.has('tower') || !headerSet.has('flatnumber'))
  ) {
    return {
      ...empty,
      errors: [
        {
          row: 0,
          message:
            'CSV must include tower+flatNumber and/or campusFlatId columns',
        },
      ],
    };
  }

  const cell = (row, key) => {
    const k = String(key).toLowerCase();
    return String(row[k] ?? '').trim();
  };

  let created = 0;
  let updated = 0;
  let filled = 0;
  let skipped = 0;
  const errors = [];
  const conflicts = [];
  const changes = [];

  function pushChange(rowNum, tower, flatNumber, actions, kind) {
    if (!actions.length) return;
    changes.push({
      row: rowNum,
      tower,
      flatNumber,
      campusFlatId: formatCampusFlatId(tower, flatNumber),
      kind,
      actions,
    });
  }

  for (const row of rows) {
    const rowNum = row.__row || 0;
    try {
      let tower = cell(row, 'tower');
      let flatNumber = cell(row, 'flatNumber');
      const campusRaw = cell(row, 'campusFlatId');
      if (tower.startsWith('#') || campusRaw.startsWith('#')) {
        skipped += 1;
        continue;
      }
      if ((!tower || !flatNumber) && campusRaw) {
        const parsed = parseCampusFlatQuery(campusRaw);
        if (parsed) {
          tower = tower || parsed.tower;
          flatNumber = flatNumber || parsed.flatNumber;
        }
      }
      if (!tower || !flatNumber) {
        errors.push({
          row: rowNum,
          message: 'tower and flatNumber are required (or campusFlatId)',
        });
        continue;
      }

      const occupancyRaw = cell(row, 'occupancyStatus');
      let occupancyCsv = '';
      if (occupancyRaw) {
        if (OCC.has(occupancyRaw)) occupancyCsv = occupancyRaw;
        else {
          errors.push({
            row: rowNum,
            message: `Unknown occupancyStatus "${occupancyRaw}" (ignored)`,
          });
        }
      }

      const apartmentType = cell(row, 'apartmentType') || '';
      const configuration = cell(row, 'configuration') || '';
      const areaCsv = cell(row, 'superBuiltUpArea');
      const floorRaw = cell(row, 'floor');
      const parkingSlotsRaw = cell(row, 'parkingSlots');
      const notes = cell(row, 'notes');
      const primaryName = cell(row, 'primaryOwnerName');
      const primaryPhone = cell(row, 'primaryOwnerPhone');
      const primaryEmail = cell(row, 'primaryOwnerEmail');

      const existing = await prisma.flat.findFirst({
        where: {
          associationId,
          tower,
          flatNumber,
          deletedAt: null,
        },
        include: {
          members: { where: { deletedAt: null, isActive: true } },
        },
      });

      const meta = { row: rowNum, tower, flatNumber, resolutions, conflicts };

      if (!existing) {
        const actions = [`Create flat ${formatCampusFlatId(tower, flatNumber)}`];
        if (primaryName && primaryPhone) {
          actions.push(`Add primary owner: ${primaryName} (${primaryPhone})`);
        }
        const memberActions = describeNewMembers(cell(row, 'members'));
        actions.push(...memberActions);
        const hh = describeNewHousehold(cell, row);
        actions.push(...hh);
        pushChange(rowNum, tower, flatNumber, actions, 'create');
        created += 1;
        if (dryRun) continue;

        const flat = await prisma.flat.create({
          data: {
            associationId,
            tower,
            flatNumber,
            floor: floorRaw === '' ? null : Number(floorRaw),
            apartmentType: apartmentType || null,
            configuration: configuration || null,
            superBuiltUpArea: resolveArea(
              apartmentType,
              configuration,
              areaCsv
            ),
            parkingSlots:
              parkingSlotsRaw === '' ? 0 : Number(parkingSlotsRaw) || 0,
            occupancyStatus: occupancyCsv || 'VACANT',
            notes: notes || null,
          },
        });
        await applyMembersAndHousehold({
          prisma,
          associationId,
          flat,
          row,
          cell,
          rowNum,
          errors,
          dryRun: false,
          primaryName,
          primaryPhone,
          primaryEmail,
          createPrimary: Boolean(primaryName && primaryPhone),
        });
        await syncFlatOccupancyFromMembers(prisma, flat.id);
        continue;
      }

      const floorMerge = mergeScalar({
        ...meta,
        field: 'floor',
        current: existing.floor,
        csv: floorRaw,
      });
      const typeMerge = mergeScalar({
        ...meta,
        field: 'apartmentType',
        current: existing.apartmentType,
        csv: apartmentType,
      });
      const configMerge = mergeScalar({
        ...meta,
        field: 'configuration',
        current: existing.configuration,
        csv: configuration,
      });
      const areaResolved = areaCsv
        ? resolveArea(
            typeMerge.value || existing.apartmentType,
            configMerge.value || existing.configuration,
            areaCsv
          )
        : null;
      const areaMerge = mergeScalar({
        ...meta,
        field: 'superBuiltUpArea',
        current: existing.superBuiltUpArea,
        csv: areaCsv ? String(areaResolved ?? areaCsv) : '',
      });
      const parkMerge = mergeScalar({
        ...meta,
        field: 'parkingSlots',
        current: existing.parkingSlots,
        csv: parkingSlotsRaw,
      });
      const occMerge = mergeScalar({
        ...meta,
        field: 'occupancyStatus',
        current: existing.occupancyStatus,
        csv: occupancyCsv,
      });
      const notesMerge = mergeScalar({
        ...meta,
        field: 'notes',
        current: existing.notes,
        csv: notes,
      });

      const patch = {};
      const actions = [];
      if (floorMerge.filled) {
        patch.floor = floorMerge.value;
        actions.push(`Set floor → ${floorMerge.value}`);
      }
      if (typeMerge.filled) {
        patch.apartmentType = typeMerge.value || null;
        actions.push(`Set apartment type → ${typeMerge.value}`);
      }
      if (configMerge.filled) {
        patch.configuration = configMerge.value || null;
        actions.push(`Set configuration → ${configMerge.value}`);
      }
      if (areaMerge.filled) {
        patch.superBuiltUpArea = areaMerge.value;
        actions.push(`Set area → ${areaMerge.value}`);
      }
      if (parkMerge.filled) {
        patch.parkingSlots = parkMerge.value;
        actions.push(`Set parking count → ${parkMerge.value}`);
      }
      if (occMerge.filled) {
        patch.occupancyStatus = occMerge.value;
        actions.push(`Set occupancy → ${occMerge.value}`);
      }
      if (notesMerge.filled) {
        patch.notes = notesMerge.value || null;
        actions.push('Update notes');
      }

      const primary = existing.members.find((m) => m.role === 'PRIMARY_OWNER');
      let primaryPatch = null;
      let createPrimary = false;
      if (primaryName && primaryPhone) {
        if (!primary) {
          createPrimary = true;
          actions.push(`Add primary owner: ${primaryName} (${primaryPhone})`);
        } else {
          const n = mergeScalar({
            ...meta,
            field: 'primaryOwnerName',
            current: primary.name,
            csv: primaryName,
          });
          const p = mergeScalar({
            ...meta,
            field: 'primaryOwnerPhone',
            current: primary.phone,
            csv: primaryPhone,
          });
          const e = mergeScalar({
            ...meta,
            field: 'primaryOwnerEmail',
            current: primary.email,
            csv: primaryEmail,
          });
          if (n.filled || p.filled || e.filled) {
            primaryPatch = {
              id: primary.id,
              data: {
                ...(n.filled ? { name: n.value } : {}),
                ...(p.filled ? { phone: p.value } : {}),
                ...(e.filled ? { email: e.value || null } : {}),
              },
            };
            if (n.filled) actions.push(`Update primary name → ${n.value}`);
            if (p.filled) actions.push(`Update primary phone → ${p.value}`);
            if (e.filled) actions.push(`Update primary email → ${e.value}`);
          }
        }
      }

      const householdPlan = await planMembersAndHousehold({
        prisma,
        associationId,
        flat: existing,
        row,
        cell,
        rowNum,
        errors,
      });
      actions.push(...householdPlan);

      if (actions.length) {
        pushChange(rowNum, tower, flatNumber, actions, 'update');
      }

      if (dryRun) {
        if (actions.length) {
          if (Object.keys(patch).length) filled += 1;
          updated += 1;
        }
        continue;
      }

      // Unresolved conflicts for this row: skip writes until Keep / Use CSV is set.
      if (conflicts.some((c) => c.row === rowNum)) continue;
      if (!actions.length) continue;

      if (Object.keys(patch).length) filled += 1;
      updated += 1;

      let flat = existing;
      if (Object.keys(patch).length) {
        flat = await prisma.flat.update({
          where: { id: existing.id },
          data: patch,
        });
      }
      if (primaryPatch) {
        await prisma.flatMember.update({
          where: { id: primaryPatch.id },
          data: primaryPatch.data,
        });
      }
      await applyMembersAndHousehold({
        prisma,
        associationId,
        flat,
        row,
        cell,
        rowNum,
        errors,
        dryRun: false,
        primaryName,
        primaryPhone,
        primaryEmail,
        createPrimary,
      });
      await syncFlatOccupancyFromMembers(prisma, flat.id);
    } catch (e) {
      errors.push({
        row: rowNum,
        message: e.message || 'Import failed for row',
      });
      skipped += 1;
    }
  }

  return {
    dryRun,
    created,
    updated,
    filled,
    skipped,
    conflicts,
    errors,
    changes,
    message: dryRun
      ? `Preview ready: ${changes.length} flat(s) with changes` +
        (conflicts.length ? `, ${conflicts.length} conflict(s) to resolve` : '')
      : conflicts.length
        ? `Import incomplete: resolve ${conflicts.length} conflict(s), then Apply again`
        : `Import complete: ${created} created, ${updated} updated` +
          (errors.length ? `, ${errors.length} error(s)` : ''),
  };
}

function describeNewMembers(membersRaw) {
  const actions = [];
  if (!membersRaw) return actions;
  for (const rec of splitRecords(membersRaw)) {
    const [role, name, phone] = splitFields(rec);
    if (!EXTRA_MEMBER_ROLES.has(role) || !name || !phone) continue;
    actions.push(`Add ${role.replace(/_/g, ' ').toLowerCase()}: ${name}`);
  }
  return actions;
}

function describeNewHousehold(cell, row) {
  const actions = [];
  const parking = splitRecords(cell(row, 'parkingAllotted'));
  if (parking.length) actions.push(`Add ${parking.length} parking bay(s)`);
  const vehicles = splitRecords(cell(row, 'vehicles'));
  if (vehicles.length) actions.push(`Add ${vehicles.length} vehicle(s)`);
  const pets = splitRecords(cell(row, 'pets'));
  if (pets.length) actions.push(`Add ${pets.length} pet(s)`);
  const contacts = splitRecords(cell(row, 'emergencyContacts'));
  if (contacts.length)
    actions.push(`Add ${contacts.length} emergency contact(s)`);
  const devices = splitRecords(cell(row, 'accessDevices'));
  if (devices.length) actions.push(`Add ${devices.length} access device(s)`);
  return actions;
}

/** Plan household adds for an existing flat (no writes). */
async function planMembersAndHousehold({
  prisma,
  associationId,
  flat,
  row,
  cell,
  rowNum,
  errors,
}) {
  const actions = [];
  const membersRaw = cell(row, 'members');
  if (membersRaw) {
    for (const rec of splitRecords(membersRaw)) {
      const [role, name, phone] = splitFields(rec);
      if (!EXTRA_MEMBER_ROLES.has(role) || !name || !phone) {
        errors.push({
          row: rowNum,
          message: `Skipped member "${rec}" (need ROLE:name:phone[:email])`,
        });
        continue;
      }
      const dup = await prisma.flatMember.findFirst({
        where: {
          flatId: flat.id,
          role,
          name,
          phone,
          deletedAt: null,
          isActive: true,
        },
      });
      if (dup) continue;
      actions.push(`Add ${role.replace(/_/g, ' ').toLowerCase()}: ${name}`);
    }
  }

  for (const label of splitRecords(cell(row, 'parkingAllotted'))) {
    const slot = await prisma.parkingSlot.findFirst({
      where: { associationId, label, deletedAt: null },
    });
    if (slot?.flatId && slot.flatId !== flat.id) {
      errors.push({
        row: rowNum,
        message: `Parking ${label} already allotted to another flat`,
      });
      continue;
    }
    if (!slot || !slot.flatId) actions.push(`Allot parking bay ${label}`);
  }

  for (const rec of splitRecords(cell(row, 'vehicles'))) {
    const [type, reg] = splitFields(rec);
    if (!VEHICLE_TYPES.has(type) || !reg) continue;
    const existingVeh = await prisma.flatVehicle.findFirst({
      where: { flatId: flat.id, registrationNo: reg, deletedAt: null },
    });
    if (!existingVeh) actions.push(`Add vehicle ${reg}`);
  }

  for (const rec of splitRecords(cell(row, 'pets'))) {
    const [species, name] = splitFields(rec);
    if (!species || !name) continue;
    const existingPet = await prisma.flatPet.findFirst({
      where: { flatId: flat.id, species, name, deletedAt: null },
    });
    if (!existingPet) actions.push(`Add pet ${name} (${species})`);
  }

  for (const rec of splitRecords(cell(row, 'emergencyContacts'))) {
    const [name, phone] = splitFields(rec);
    if (!name || !phone) continue;
    const existingC = await prisma.flatEmergencyContact.findFirst({
      where: { flatId: flat.id, name, phone, deletedAt: null },
    });
    if (!existingC) actions.push(`Add emergency contact ${name}`);
  }

  for (const rec of splitRecords(cell(row, 'accessDevices'))) {
    const [type, identifier] = splitFields(rec);
    if (!DEVICE_TYPES.has(type) || !identifier) continue;
    const existingD = await prisma.flatAccessDevice.findFirst({
      where: { flatId: flat.id, identifier, deletedAt: null },
    });
    if (!existingD) actions.push(`Add access device ${identifier}`);
  }

  return actions;
}

async function applyMembersAndHousehold({
  prisma,
  associationId,
  flat,
  row,
  cell,
  rowNum,
  errors,
  dryRun,
  primaryName,
  primaryPhone,
  primaryEmail,
  createPrimary,
}) {
  if (createPrimary && primaryName && primaryPhone && !dryRun) {
    await prisma.flatMember.create({
      data: {
        flatId: flat.id,
        role: 'PRIMARY_OWNER',
        name: primaryName,
        phone: primaryPhone,
        email: primaryEmail || null,
      },
    });
  }

  const membersRaw = cell(row, 'members');
  if (membersRaw) {
    for (const rec of splitRecords(membersRaw)) {
      const [role, name, phone, email] = splitFields(rec);
      if (!EXTRA_MEMBER_ROLES.has(role) || !name || !phone) {
        errors.push({
          row: rowNum,
          message: `Skipped member "${rec}" (need ROLE:name:phone[:email])`,
        });
        continue;
      }
      const dup = await prisma.flatMember.findFirst({
        where: {
          flatId: flat.id,
          role,
          name,
          phone,
          deletedAt: null,
          isActive: true,
        },
      });
      if (dup) continue;
      if (dryRun) continue;
      await prisma.flatMember.create({
        data: {
          flatId: flat.id,
          role,
          name,
          phone,
          email: email || null,
        },
      });
    }
  }

  if (dryRun) return;

  const parkingRaw = cell(row, 'parkingAllotted');
  if (parkingRaw) {
    for (const label of splitRecords(parkingRaw)) {
      const slot = await prisma.parkingSlot.findFirst({
        where: { associationId, label, deletedAt: null },
      });
      if (slot) {
        if (slot.flatId && slot.flatId !== flat.id) {
          errors.push({
            row: rowNum,
            message: `Parking ${label} already allotted to another flat`,
          });
          continue;
        }
        if (!slot.flatId) {
          await prisma.parkingSlot.update({
            where: { id: slot.id },
            data: { flatId: flat.id },
          });
        }
      } else {
        await prisma.parkingSlot.create({
          data: {
            associationId,
            label,
            slotType: 'COVERED',
            flatId: flat.id,
          },
        });
      }
    }
  }

  const vehiclesRaw = cell(row, 'vehicles');
  if (vehiclesRaw) {
    for (const rec of splitRecords(vehiclesRaw)) {
      const [type, reg, make, model, color, sticker] = splitFields(rec);
      if (!VEHICLE_TYPES.has(type) || !reg) {
        errors.push({ row: rowNum, message: `Skipped vehicle "${rec}"` });
        continue;
      }
      const existingVeh = await prisma.flatVehicle.findFirst({
        where: { flatId: flat.id, registrationNo: reg, deletedAt: null },
      });
      if (existingVeh) continue;
      await prisma.flatVehicle.create({
        data: {
          flatId: flat.id,
          registrationNo: reg,
          vehicleType: type,
          make: make || null,
          model: model || null,
          color: color || null,
          stickerNo: sticker || null,
          rfidTag: sticker || null,
          approvalStatus: 'APPROVED',
        },
      });
    }
  }

  const petsRaw = cell(row, 'pets');
  if (petsRaw) {
    for (const rec of splitRecords(petsRaw)) {
      const [species, name, breed, rabies] = splitFields(rec);
      if (!species || !name) {
        errors.push({ row: rowNum, message: `Skipped pet "${rec}"` });
        continue;
      }
      const existingPet = await prisma.flatPet.findFirst({
        where: { flatId: flat.id, species, name, deletedAt: null },
      });
      if (existingPet) continue;
      await prisma.flatPet.create({
        data: {
          flatId: flat.id,
          species,
          name,
          breed: breed || null,
          rabiesValidTill: rabies ? new Date(rabies) : null,
          approvalStatus: 'APPROVED',
        },
      });
    }
  }

  const contactsRaw = cell(row, 'emergencyContacts');
  if (contactsRaw) {
    for (const rec of splitRecords(contactsRaw)) {
      const [name, phone, relationship, primaryFlag] = splitFields(rec);
      if (!name || !phone) {
        errors.push({
          row: rowNum,
          message: `Skipped emergency contact "${rec}"`,
        });
        continue;
      }
      const existingC = await prisma.flatEmergencyContact.findFirst({
        where: { flatId: flat.id, name, phone, deletedAt: null },
      });
      if (existingC) continue;
      await prisma.flatEmergencyContact.create({
        data: {
          flatId: flat.id,
          name,
          phone,
          relationship: relationship || null,
          isPrimary: String(primaryFlag || '').toUpperCase() === 'Y',
          approvalStatus: 'APPROVED',
        },
      });
    }
  }

  const devicesRaw = cell(row, 'accessDevices');
  if (devicesRaw) {
    for (const rec of splitRecords(devicesRaw)) {
      const [type, identifier, status] = splitFields(rec);
      if (!DEVICE_TYPES.has(type) || !identifier) {
        errors.push({
          row: rowNum,
          message: `Skipped access device "${rec}"`,
        });
        continue;
      }
      const existingD = await prisma.flatAccessDevice.findFirst({
        where: { flatId: flat.id, identifier, deletedAt: null },
      });
      if (existingD) continue;
      const st = DEVICE_STATUS.has(status) ? status : 'ACTIVE';
      await prisma.flatAccessDevice.create({
        data: {
          flatId: flat.id,
          identifier,
          deviceType: type,
          status: st,
          approvalStatus: 'APPROVED',
          issuedAt: new Date(),
        },
      });
    }
  }
}
