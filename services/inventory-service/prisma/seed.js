import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  findApartmentVariant,
  generateNhpaowaFlatSeeds,
  NHPAOWA_EXPECTED_FLAT_COUNT,
} from '@nhpaowa/shared-ui';
import { generateNoticePdf } from '../src/lib/noticePdf.js';

const prisma = new PrismaClient();
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';

async function main() {
  const mainWh =
    (await prisma.warehouse.findFirst({
      where: { associationId: ASSOCIATION_ID, code: 'MAIN', deletedAt: null },
    })) ||
    (await prisma.warehouse.create({
      data: {
        associationId: ASSOCIATION_ID,
        code: 'MAIN',
        name: 'Main Store',
        address: 'Ground floor store room',
        isDefault: true,
      },
    }));

  const annexWh =
    (await prisma.warehouse.findFirst({
      where: { associationId: ASSOCIATION_ID, code: 'ANNEX', deletedAt: null },
    })) ||
    (await prisma.warehouse.create({
      data: {
        associationId: ASSOCIATION_ID,
        code: 'ANNEX',
        name: 'Annex Store',
        address: 'Block B basement',
        isDefault: false,
      },
    }));

  await prisma.associationSetting.upsert({
    where: { associationId: ASSOCIATION_ID },
    create: {
      associationId: ASSOCIATION_ID,
      poApprovalThreshold: 10000,
      autoPrOnLowStock: true,
      defaultWarehouseId: mainWh.id,
    },
    update: {
      defaultWarehouseId: mainWh.id,
      autoPrOnLowStock: true,
    },
  });

  const categories = [
    { name: 'Electrical', description: 'Switches, bulbs, wiring consumables' },
    { name: 'Plumbing', description: 'Pipes, fittings, seals' },
    { name: 'Housekeeping', description: 'Cleaning chemicals and supplies' },
    { name: 'Safety', description: 'Fire & safety equipment' },
    { name: 'Garden', description: 'Landscaping and garden tools' },
    { name: 'Maintenance', description: 'General maintenance parts' },
  ];

  const catRows = {};
  for (const c of categories) {
    const existing = await prisma.category.findFirst({
      where: { associationId: ASSOCIATION_ID, name: c.name, deletedAt: null },
    });
    catRows[c.name] =
      existing ||
      (await prisma.category.create({
        data: { associationId: ASSOCIATION_ID, ...c },
      }));
  }

  const items = [
    {
      name: 'LED Bulb 9W',
      sku: 'EL-LED-9W',
      barcode: '8901000000001',
      category: 'Electrical',
      unit: 'pcs',
      currentStock: 48,
      minStockLevel: 20,
      unitPrice: 85,
    },
    {
      name: 'MCB 32A',
      sku: 'EL-MCB-32',
      barcode: '8901000000002',
      category: 'Electrical',
      unit: 'pcs',
      currentStock: 12,
      minStockLevel: 10,
      unitPrice: 320,
    },
    {
      name: 'PVC Pipe 1"',
      sku: 'PL-PIPE-1',
      barcode: '8901000000003',
      category: 'Plumbing',
      unit: 'm',
      currentStock: 35,
      minStockLevel: 20,
      unitPrice: 95,
    },
    {
      name: 'PVC Elbow 1"',
      sku: 'PL-ELB-1',
      barcode: '8901000000004',
      category: 'Plumbing',
      unit: 'pcs',
      currentStock: 8,
      minStockLevel: 15,
      unitPrice: 25,
    },
    {
      name: 'Cleaning Chemical 5L',
      sku: 'HK-CC-5L',
      barcode: '8901000000005',
      category: 'Housekeeping',
      unit: 'can',
      currentStock: 18,
      minStockLevel: 10,
      unitPrice: 520,
    },
    {
      name: 'Sanitizer 5L',
      sku: 'HK-SAN-5L',
      barcode: '8901000000006',
      category: 'Housekeeping',
      unit: 'can',
      currentStock: 4,
      minStockLevel: 8,
      unitPrice: 380,
    },
    {
      name: 'Floor Cleaner 5L',
      sku: 'HK-FC-5L',
      barcode: '8901000000007',
      category: 'Housekeeping',
      unit: 'can',
      currentStock: 6,
      minStockLevel: 5,
      unitPrice: 450,
    },
    {
      name: 'Fire Extinguisher ABC 6kg',
      sku: 'SF-FE-6',
      barcode: '8901000000008',
      category: 'Safety',
      unit: 'pcs',
      currentStock: 4,
      minStockLevel: 4,
      unitPrice: 2800,
    },
    {
      name: 'Garden Hose 15m',
      sku: 'GD-HS-15',
      barcode: '8901000000009',
      category: 'Garden',
      unit: 'pcs',
      currentStock: 2,
      minStockLevel: 2,
      unitPrice: 650,
    },
    {
      name: 'WD-40 420ml',
      sku: 'MN-WD40',
      barcode: '8901000000010',
      category: 'Maintenance',
      unit: 'can',
      currentStock: 0,
      minStockLevel: 3,
      unitPrice: 380,
    },
  ];

  const itemRows = {};
  for (const it of items) {
    const existing = await prisma.item.findFirst({
      where: { associationId: ASSOCIATION_ID, sku: it.sku },
    });
    if (existing) {
      itemRows[it.sku] = await prisma.item.update({
        where: { id: existing.id },
        data: { barcode: it.barcode },
      });
    } else {
      itemRows[it.sku] = await prisma.item.create({
        data: {
          associationId: ASSOCIATION_ID,
          name: it.name,
          sku: it.sku,
          barcode: it.barcode,
          categoryId: catRows[it.category].id,
          unit: it.unit,
          currentStock: it.currentStock,
          minStockLevel: it.minStockLevel,
          unitPrice: it.unitPrice,
        },
      });
    }

    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_itemId: {
          warehouseId: mainWh.id,
          itemId: itemRows[it.sku].id,
        },
      },
      create: {
        warehouseId: mainWh.id,
        itemId: itemRows[it.sku].id,
        quantity: it.currentStock,
      },
      update: {},
    });
  }

  // Small annex stock for demo
  await prisma.warehouseStock.upsert({
    where: {
      warehouseId_itemId: {
        warehouseId: annexWh.id,
        itemId: itemRows['EL-LED-9W'].id,
      },
    },
    create: {
      warehouseId: annexWh.id,
      itemId: itemRows['EL-LED-9W'].id,
      quantity: 10,
    },
    update: {},
  });

  const suppliers = [
    {
      name: 'Shree Electricals',
      contactPerson: 'Ramesh P',
      phone: '9876500001',
      email: 'sales@shree-elec.example',
      gstNumber: '27AAAAA0000A1Z5',
    },
    {
      name: 'AquaFit Plumbing',
      contactPerson: 'Sneha K',
      phone: '9876500002',
      email: 'orders@aquafit.example',
    },
    {
      name: 'CleanPro Supplies',
      contactPerson: 'Imran S',
      phone: '9876500003',
      email: 'hello@cleanpro.example',
    },
  ];

  const supplierRows = {};
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { associationId: ASSOCIATION_ID, name: s.name, deletedAt: null },
    });
    supplierRows[s.name] =
      existing ||
      (await prisma.supplier.create({
        data: { associationId: ASSOCIATION_ID, ...s },
      }));
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  const users = [
    {
      email: 'superadmin@nhpaowa.local',
      name: 'Super Admin',
      role: 'SUPERADMIN',
    },
    {
      email: 'secretary@nhpaowa.local',
      name: 'Adarsh A Patil',
      role: 'SECRETARY',
    },
    {
      email: 'treasurer@nhpaowa.local',
      name: 'Praveen Danagowdru',
      role: 'TREASURER',
    },
    {
      email: 'staff@nhpaowa.local',
      name: 'Maintenance Staff',
      role: 'STAFF',
    },
    {
      email: 'security.head@nhpaowa.local',
      name: 'Security Head',
      role: 'SECURITY_HEAD',
    },
    {
      email: 'estate.manager@nhpaowa.local',
      name: 'Estate Manager',
      role: 'ESTATE_MANAGER',
    },
    {
      email: 'security.staff@nhpaowa.local',
      name: 'Security Staff',
      role: 'SECURITY_STAFF',
    },
    {
      email: 'resident@nhpaowa.local',
      name: 'Ravi Kumar',
      role: 'RESIDENT',
    },
    {
      email: 'vendor@shree.local',
      name: 'Shree Vendor Portal',
      role: 'VENDOR',
      supplierId: supplierRows['Shree Electricals'].id,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: {
        associationId_email: {
          associationId: ASSOCIATION_ID,
          email: u.email,
        },
      },
      create: {
        associationId: ASSOCIATION_ID,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        supplierId: u.supplierId || null,
      },
      update: {
        passwordHash,
        name: u.name,
        role: u.role,
        supplierId: u.supplierId || null,
        active: true,
      },
    });
  }

  const staffId = '00000000-0000-4000-8000-000000000010';
  const existingTxn = await prisma.stockTransaction.count({
    where: { associationId: ASSOCIATION_ID },
  });
  if (existingTxn === 0) {
    const outs = [
      ['HK-CC-5L', 210],
      ['EL-LED-9W', 165],
      ['PL-PIPE-1', 120],
      ['HK-SAN-5L', 98],
      ['GD-HS-15', 85],
    ];
    for (const [sku, qty] of outs) {
      await prisma.stockTransaction.create({
        data: {
          associationId: ASSOCIATION_ID,
          itemId: itemRows[sku].id,
          warehouseId: mainWh.id,
          type: 'OUT',
          quantity: qty,
          referenceType: 'ISSUE',
          performedBy: staffId,
          performedByName: 'Maintenance Staff',
          department: 'Maintenance Team',
          notes: 'Seed consumption',
          transactionDate: new Date(Date.now() - 20 * 86400000),
        },
      });
    }
    await prisma.stockTransaction.create({
      data: {
        associationId: ASSOCIATION_ID,
        itemId: itemRows['EL-LED-9W'].id,
        warehouseId: mainWh.id,
        type: 'IN',
        quantity: 40,
        referenceType: 'MANUAL',
        performedBy: staffId,
        performedByName: 'Office Staff',
        department: 'Office Staff',
        notes: 'Seed stock in',
        transactionDate: new Date(Date.now() - 2 * 86400000),
      },
    });
  }

  const alertCount = await prisma.alert.count({
    where: { associationId: ASSOCIATION_ID },
  });
  if (alertCount === 0) {
    const samples = [
      {
        type: 'LOW_STOCK',
        severity: 'WARNING',
        message: 'Sanitizer 5L is below minimum stock level',
        relatedEntityType: 'Item',
        relatedEntityId: itemRows['HK-SAN-5L'].id,
      },
      {
        type: 'AMC_EXPIRY',
        severity: 'WARNING',
        message: 'Fire extinguisher annual servicing expires soon',
        relatedEntityType: 'AmcContract',
        relatedEntityId: null,
      },
      {
        type: 'NEW_SUPPLIER',
        severity: 'INFO',
        message: 'New supplier added: CleanPro Supplies',
        relatedEntityType: 'Supplier',
        relatedEntityId: supplierRows['CleanPro Supplies'].id,
      },
    ];
    for (const a of samples) {
      await prisma.alert.create({
        data: { associationId: ASSOCIATION_ID, isRead: false, ...a },
      });
    }
  }

  const amcExists = await prisma.amcContract.findFirst({
    where: {
      associationId: ASSOCIATION_ID,
      description: { contains: 'Fire extinguisher' },
    },
  });
  if (!amcExists) {
    const end = new Date();
    end.setDate(end.getDate() + 12);
    await prisma.amcContract.create({
      data: {
        associationId: ASSOCIATION_ID,
        itemId: itemRows['SF-FE-6'].id,
        vendorId: supplierRows['Shree Electricals'].id,
        description: 'Fire extinguisher annual servicing',
        startDate: new Date(Date.now() - 350 * 86400000),
        endDate: end,
        reminderLeadDays: 15,
        status: 'ACTIVE',
      },
    });
  }

  // Association ops sample data (005–008)
  // Refresh flats to NHPAOWA tower + apartment catalog

  await prisma.moveAttachment.deleteMany({});
  await prisma.moveHandover.deleteMany({});
  await prisma.moveStatusEvent.deleteMany({});
  await prisma.moveRequest.deleteMany({ where: { associationId: ASSOCIATION_ID } });
  await prisma.nocAttachment.deleteMany({});
  await prisma.nocStatusEvent.deleteMany({});
  await prisma.nocRequest.deleteMany({ where: { associationId: ASSOCIATION_ID } });
  await prisma.flatVehicle.deleteMany({});
  await prisma.flatPet.deleteMany({});
  await prisma.flatEmergencyContact.deleteMany({});
  await prisma.flatAccessDevice.deleteMany({});
  await prisma.parkingSlot.deleteMany({ where: { associationId: ASSOCIATION_ID } });
  await prisma.flatMember.deleteMany({});
  await prisma.flat.deleteMany({ where: { associationId: ASSOCIATION_ID } });

  {
    const grid = generateNhpaowaFlatSeeds();
    if (grid.length !== NHPAOWA_EXPECTED_FLAT_COUNT) {
      throw new Error(
        `Flat seed count ${grid.length} ≠ expected ${NHPAOWA_EXPECTED_FLAT_COUNT}`
      );
    }

    const createRows = grid.map((row) => {
      const variant = findApartmentVariant(
        row.apartmentType,
        row.configuration
      );
      return {
        associationId: ASSOCIATION_ID,
        tower: row.tower,
        flatNumber: row.flatNumber,
        floor: row.floor,
        apartmentType: row.apartmentType,
        configuration: row.configuration,
        superBuiltUpArea: variant?.superBuiltUpArea ?? null,
        parkingSlots: 1,
        occupancyStatus: 'VACANT',
      };
    });

    // Batch insert campus grid
    const BATCH = 250;
    for (let i = 0; i < createRows.length; i += BATCH) {
      await prisma.flat.createMany({
        data: createRows.slice(i, i + BATCH),
      });
    }

    // Demo owners / tenants on a few flats (household + resident link below)
    const memberSeeds = [
      {
        tower: '1',
        flatNumber: '101',
        occupancyStatus: 'OWNER_OCCUPIED',
        members: [
          {
            role: 'PRIMARY_OWNER',
            name: 'Ravi Kumar',
            phone: '9876500001',
            email: 'ravi@example.com',
          },
        ],
      },
      {
        tower: '1',
        flatNumber: '024',
        occupancyStatus: 'TENANT_OCCUPIED',
        members: [
          {
            role: 'PRIMARY_OWNER',
            name: 'Meera Shah',
            phone: '9876500002',
            email: 'meera@example.com',
          },
          {
            role: 'TENANT',
            name: 'Arjun Patel',
            phone: '9876500003',
            email: null,
          },
        ],
      },
      {
        tower: '2',
        flatNumber: '035',
        occupancyStatus: 'OWNER_OCCUPIED',
        members: [
          {
            role: 'PRIMARY_OWNER',
            name: 'Sneha Reddy',
            phone: '9876500004',
            email: 'sneha@example.com',
          },
        ],
      },
      {
        tower: '2',
        flatNumber: '042',
        occupancyStatus: 'OWNER_OCCUPIED',
        members: [
          {
            role: 'PRIMARY_OWNER',
            name: 'Vikram Iyer',
            phone: '9876500005',
            email: 'vikram@example.com',
          },
        ],
      },
      {
        tower: '3',
        flatNumber: '051',
        occupancyStatus: 'VACANT',
        members: [],
      },
      {
        tower: '3',
        flatNumber: '062',
        occupancyStatus: 'OWNER_OCCUPIED',
        members: [
          {
            role: 'PRIMARY_OWNER',
            name: 'Ananya Das',
            phone: '9876500006',
            email: 'ananya@example.com',
          },
          {
            role: 'ASSOCIATE_OWNER',
            name: 'Rohit Das',
            phone: '9876500007',
            email: null,
          },
        ],
      },
    ];

    for (const s of memberSeeds) {
      const flat = await prisma.flat.findFirst({
        where: {
          associationId: ASSOCIATION_ID,
          tower: s.tower,
          flatNumber: s.flatNumber,
          deletedAt: null,
        },
      });
      if (!flat) continue;
      await prisma.flat.update({
        where: { id: flat.id },
        data: { occupancyStatus: s.occupancyStatus },
      });
      for (const m of s.members) {
        await prisma.flatMember.create({
          data: { flatId: flat.id, ...m },
        });
      }
    }

    console.log(
      `Seeded ${createRows.length} NHPAOWA flats (towers 1–35 excl. 17–20)`
    );

    // Household sample (013) on Tower 1 / 101 + link demo resident (014)
    const demoFlat = await prisma.flat.findFirst({
      where: {
        associationId: ASSOCIATION_ID,
        tower: '1',
        flatNumber: '101',
        deletedAt: null,
      },
    });
    const residentUser = await prisma.user.findFirst({
      where: {
        associationId: ASSOCIATION_ID,
        email: 'resident@nhpaowa.local',
      },
    });
    if (demoFlat && residentUser) {
      const primary = await prisma.flatMember.findFirst({
        where: {
          flatId: demoFlat.id,
          role: 'PRIMARY_OWNER',
          deletedAt: null,
          isActive: true,
        },
      });
      if (primary) {
        await prisma.flatMember.update({
          where: { id: primary.id },
          data: {
            userId: residentUser.id,
            name: residentUser.name,
            email: residentUser.email,
          },
        });
      }
    }
    if (demoFlat) {
      const slot = await prisma.parkingSlot.create({
        data: {
          associationId: ASSOCIATION_ID,
          label: 'B1-101',
          slotType: 'COVERED',
          flatId: demoFlat.id,
        },
      });
      await prisma.flatVehicle.create({
        data: {
          flatId: demoFlat.id,
          vehicleType: 'FOUR_WHEELER',
          registrationNo: 'KA01AB1234',
          make: 'Hyundai',
          model: 'Creta',
          color: 'White',
          stickerNo: 'STK-101',
          parkingSlotId: slot.id,
          approvalStatus: 'APPROVED',
        },
      });
      await prisma.flatPet.create({
        data: {
          flatId: demoFlat.id,
          species: 'Dog',
          name: 'Bruno',
          breed: 'Labrador',
          rabiesValidTill: new Date(new Date().getFullYear() + 1, 5, 1),
          vaccinationNotes: 'Annual rabies',
          approvalStatus: 'APPROVED',
        },
      });
      await prisma.flatEmergencyContact.create({
        data: {
          flatId: demoFlat.id,
          name: 'Priya Kumar',
          phone: '9876500099',
          relationship: 'Spouse',
          isPrimary: true,
          approvalStatus: 'APPROVED',
        },
      });
      await prisma.flatAccessDevice.create({
        data: {
          flatId: demoFlat.id,
          deviceType: 'FOB',
          identifier: 'FOB-T1-101',
          status: 'ACTIVE',
          issuedAt: new Date(),
          approvalStatus: 'APPROVED',
        },
      });
      // Sample PENDING vehicle (resident-style submission) for staff approve/reject
      await prisma.flatVehicle.create({
        data: {
          flatId: demoFlat.id,
          vehicleType: 'TWO_WHEELER',
          registrationNo: 'KA01ZZ9999',
          make: 'Honda',
          model: 'Activa',
          color: 'Grey',
          approvalStatus: 'PENDING',
          submittedByUserId: residentUser?.id || null,
        },
      });
    }

    // Sample INTERNAL_SHIFT (008): Tower 1/204 → Tower 3/501 (vacant)
    const shiftOrigin = await prisma.flat.findFirst({
      where: {
        associationId: ASSOCIATION_ID,
        tower: '1',
        flatNumber: '024',
        deletedAt: null,
      },
    });
    const shiftDest = await prisma.flat.findFirst({
      where: {
        associationId: ASSOCIATION_ID,
        tower: '3',
        flatNumber: '051',
        deletedAt: null,
      },
    });
    if (shiftOrigin && shiftDest) {
      await prisma.moveRequest.create({
        data: {
          associationId: ASSOCIATION_ID,
          flatId: shiftOrigin.id,
          destinationFlatId: shiftDest.id,
          type: 'INTERNAL_SHIFT',
          partyType: 'TENANT',
          status: 'REQUESTED',
          scheduledDate: new Date(),
          contactName: 'Arjun Patel',
          contactPhone: '9876500003',
          moverNotes: 'Tenant shifting within society (sample)',
          checklistJson: {},
        },
      });
    }
  }

  // Staff categories + roster (007 + 011)
  await prisma.staffLeave.deleteMany({
    where: { staff: { associationId: ASSOCIATION_ID } },
  });
  await prisma.attendanceEntry.deleteMany({
    where: { staff: { associationId: ASSOCIATION_ID } },
  });
  await prisma.attendanceDayMark.deleteMany({
    where: { staff: { associationId: ASSOCIATION_ID } },
  });
  await prisma.associationStaff.deleteMany({
    where: { associationId: ASSOCIATION_ID },
  });
  await prisma.staffCategory.deleteMany({
    where: { associationId: ASSOCIATION_ID },
  });

  const { DEFAULT_STAFF_CATEGORIES } = await import(
    '../src/lib/staffCsv.js'
  );
  await prisma.staffCategory.createMany({
    data: DEFAULT_STAFF_CATEGORIES.map((c) => ({
      associationId: ASSOCIATION_ID,
      code: c.code,
      label: c.label,
      sortOrder: c.sortOrder,
      active: true,
    })),
  });

  const staffSamples = [
    // Security — gate + towers (typical 24×7 posts)
    {
      name: 'Suresh Main Gate',
      category: 'SECURITY',
      phone: '9000000001',
      tower: null,
      designation: 'Main Gate',
    },
    {
      name: 'Imran Gate Night',
      category: 'SECURITY',
      phone: '9000000002',
      tower: null,
      designation: 'Main Gate Night',
    },
    {
      name: 'Ravi Tower 1 Lobby',
      category: 'SECURITY',
      phone: '9000000011',
      tower: '1',
      designation: 'Tower Lobby',
    },
    {
      name: 'Kiran Tower 2 Lobby',
      category: 'SECURITY',
      phone: '9000000012',
      tower: '2',
      designation: 'Tower Lobby',
    },
    {
      name: 'Farooq Tower 3 Lobby',
      category: 'SECURITY',
      phone: '9000000013',
      tower: '3',
      designation: 'Tower Lobby',
    },
    {
      name: 'Parking Ajay',
      category: 'SECURITY',
      phone: '9000000014',
      tower: null,
      designation: 'Parking',
    },
    // Housekeeping
    {
      name: 'Lakshmi HK T1-T2',
      category: 'HOUSEKEEPING',
      phone: '9000000002',
      tower: '1',
      designation: 'Towers 1–2 common areas',
    },
    {
      name: 'Sowmya HK T3-T4',
      category: 'HOUSEKEEPING',
      phone: '9000000022',
      tower: '3',
      designation: 'Towers 3–4 common areas',
    },
    // Gardening
    {
      name: 'Garden Kumar',
      category: 'GARDENING',
      phone: '9000000031',
      tower: null,
      designation: 'Landscaping / lawns',
    },
    {
      name: 'Garden Raju',
      category: 'GARDENING',
      phone: '9000000032',
      tower: null,
      designation: 'Tower gardens',
    },
    // Electrical / Plumbing / Maintenance
    {
      name: 'Electrician Manjunath',
      category: 'ELECTRICAL',
      phone: '9000000041',
      tower: null,
      designation: 'Common panels / DG liaison',
    },
    {
      name: 'Plumber Naveen',
      category: 'PLUMBING',
      phone: '9000000042',
      tower: null,
      designation: 'Tanks / leaks',
    },
    {
      name: 'Handyman Prakash',
      category: 'MAINTENANCE',
      phone: '9000000043',
      tower: null,
      designation: 'General maintenance',
    },
    // Clubhouse + office
    {
      name: 'Clubhouse Desk Meena',
      category: 'CLUBHOUSE',
      phone: '9000000051',
      tower: null,
      designation: 'Clubhouse Desk',
    },
    {
      name: 'Gym Attendant Arun',
      category: 'CLUBHOUSE',
      phone: '9000000052',
      tower: null,
      designation: 'Gym / amenities',
    },
    {
      name: 'Office Desk',
      category: 'OFFICE',
      phone: '9000000003',
      tower: null,
      designation: 'Association office',
    },
  ];

  await prisma.associationStaff.createMany({
    data: staffSamples.map((s) => ({
      associationId: ASSOCIATION_ID,
      ...s,
    })),
  });

  // Attendance history + leave samples (012)
  await prisma.staffLeave.deleteMany({
    where: { staff: { associationId: ASSOCIATION_ID } },
  });
  await prisma.attendanceEntry.deleteMany({
    where: { staff: { associationId: ASSOCIATION_ID } },
  });

  const seededStaff = await prisma.associationStaff.findMany({
    where: { associationId: ASSOCIATION_ID, deletedAt: null },
    orderBy: { name: 'asc' },
  });
  const recorder = await prisma.user.findFirst({
    where: { associationId: ASSOCIATION_ID, email: 'superadmin@nhpaowa.local' },
  });
  const leaveStaff = seededStaff.find((s) => s.name.includes('Office')) || seededStaff[0];
  const presentStaff = seededStaff.filter((s) => s.id !== leaveStaff?.id).slice(0, 4);
  if (leaveStaff) {
    const leaveStart = new Date();
    leaveStart.setHours(0, 0, 0, 0);
    const leaveEnd = new Date(leaveStart);
    leaveEnd.setDate(leaveEnd.getDate() + 1);
    await prisma.staffLeave.create({
      data: {
        staffId: leaveStaff.id,
        startDate: leaveStart,
        endDate: leaveEnd,
        leaveType: 'CASUAL',
        reason: 'Seeded sample leave',
        status: 'APPROVED',
        recordedByUserId: recorder?.id || null,
      },
    });
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(8, 0, 0, 0);
  for (const s of presentStaff) {
    const cin = new Date(yesterday);
    const cout = new Date(yesterday);
    cout.setHours(17, 0, 0, 0);
    await prisma.attendanceEntry.create({
      data: {
        staffId: s.id,
        checkInAt: cin,
        checkOutAt: cout,
        note: 'Seeded shift',
        recordedByUserId: recorder?.id || null,
      },
    });
  }

  // Resident notices (009) — sample circulars
  await prisma.noticeStatusEvent.deleteMany({
    where: { notice: { associationId: ASSOCIATION_ID } },
  });
  await prisma.notice.deleteMany({ where: { associationId: ASSOCIATION_ID } });

  const noticeSamples = [
    {
      title: 'Mandatory Vehicle Verification & NBH Document Upload',
      category: 'Compliance',
      status: 'PUBLISHED',
      publishedByName: 'Adarsh A Patil',
      body: `Dear TNH Tenants & Flat Owners,

This is to inform all tenants that, as part of the ongoing Tenant Verification and Security Compliance Drive, all tenants are required to submit and verify their vehicle details and relevant documents with Mr. Vikas Vishwakarma (63055 49182) during the verification process.

The same vehicle details and supporting documents must also be uploaded in the NoBrokerHood (NBH) application for verification and official record purposes.

Tenants who fail to complete the required verification and documentation may have their vehicles stopped and subjected to verification at the security gate during every entry until the required compliance is completed.

Flat Owners are requested to actively support NHPAOWA in this drive by ensuring that their respective tenants complete the vehicle verification and NBH document upload without delay.

All residents are requested to cooperate with this process in the interest of safety, security and smooth vehicle movement within the NHPAOWA premises.

NHPAOWA reserves the right to take appropriate security measures against non-compliance in accordance with the Association's rules and policies.

Your cooperation and support are sincerely appreciated.

For New Haven Peenya Apartment Owners Welfare Association (NHPAOWA)

Regards
Adarsh A Patil
Secretary
NHPAOWA`,
    },
    {
      title: 'Water Tank Cleaning Schedule — Tower 1 & 2',
      category: 'Maintenance',
      status: 'PUBLISHED',
      publishedByName: 'Adarsh A Patil',
      body: `Dear Residents,

Please note that overhead water tank cleaning for Tower 1 and Tower 2 is scheduled this Saturday, 8:00 AM – 1:00 PM.

Expect low/no water pressure during this window. Kindly store water in advance. Maintenance staff will restore supply immediately after cleaning and chlorination.

For New Haven Peenya Apartment Owners Welfare Association (NHPAOWA)

Regards
Adarsh A Patil
Secretary
NHPAOWA`,
    },
    {
      title: 'AGM Reminder — Annual General Meeting',
      category: 'General',
      status: 'DRAFT',
      publishedByName: null,
      body: `Dear Flat Owners,

This is a draft notice for the Annual General Meeting of NHPAOWA. Date, venue, and agenda will be finalized before publish.

Regards
Secretary
NHPAOWA`,
    },
  ];

  for (const sample of noticeSamples) {
    const publishedAt =
      sample.status === 'PUBLISHED' ? new Date() : null;
    let notice = await prisma.notice.create({
      data: {
        associationId: ASSOCIATION_ID,
        title: sample.title,
        body: sample.body,
        category: sample.category,
        status: sample.status,
        publishedAt,
        publishedByName: sample.publishedByName,
        createdByUserId: null,
      },
    });
    await prisma.noticeStatusEvent.create({
      data: {
        noticeId: notice.id,
        fromStatus: null,
        toStatus: sample.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        note: 'Seeded',
      },
    });
    if (sample.status === 'PUBLISHED') {
      const pdf = await generateNoticePdf({
        noticeId: notice.id,
        title: notice.title,
        body: notice.body,
        category: notice.category,
        publishedAt,
        publishedByName: notice.publishedByName,
      });
      notice = await prisma.notice.update({
        where: { id: notice.id },
        data: {
          pdfFileName: pdf.fileName,
          pdfPath: pdf.publicPath,
        },
      });
    }
  }

  // Board / office bearers (010)
  await prisma.officeBearerMember.deleteMany({
    where: { associationId: ASSOCIATION_ID },
  });
  await prisma.officeBearerRole.deleteMany({
    where: { associationId: ASSOCIATION_ID },
  });

  const boardRoles = [
    {
      code: 'PRESIDENT',
      name: 'President',
      sortOrder: 1,
      isPresidentSigner: true,
      members: ['V. G. Jayaramaiah'],
    },
    {
      code: 'VICE_PRESIDENT',
      name: 'Vice President',
      sortOrder: 2,
      members: ['Lokesh Kumar Gupta'],
    },
    {
      code: 'SECRETARY',
      name: 'Secretary',
      sortOrder: 3,
      members: ['Adarsh A Patil'],
    },
    {
      code: 'JOINT_SECRETARY',
      name: 'Joint Secretary',
      sortOrder: 4,
      members: ['Moushimi Chakraborty'],
    },
    {
      code: 'TREASURER',
      name: 'Treasurer',
      sortOrder: 5,
      members: ['Praveen Danagowdru'],
    },
    {
      code: 'COMMITTEE_MEMBER',
      name: 'Committee Member',
      sortOrder: 6,
      members: ['Vikas', 'Saurabh', 'Ranjitha'],
    },
    {
      code: 'ESTATE_MANAGER',
      name: 'Estate Manager',
      sortOrder: 7,
      members: ['Mariyayya Swamy'],
    },
  ];

  for (const r of boardRoles) {
    const role = await prisma.officeBearerRole.create({
      data: {
        associationId: ASSOCIATION_ID,
        code: r.code,
        name: r.name,
        sortOrder: r.sortOrder,
        showOnLetterhead: true,
        isPresidentSigner: Boolean(r.isPresidentSigner),
        active: true,
      },
    });
    let i = 0;
    for (const fullName of r.members) {
      await prisma.officeBearerMember.create({
        data: {
          associationId: ASSOCIATION_ID,
          roleId: role.id,
          fullName,
          sortOrder: i++,
          active: true,
        },
      });
    }
  }

  console.log('Seed complete for association', ASSOCIATION_ID);
  console.log('Superadmin: superadmin@nhpaowa.local / password123');
  console.log('Login: secretary@nhpaowa.local / password123');
  console.log('Ops: security.head@ / estate.manager@ / security.staff@nhpaowa.local / password123');
  console.log('Vendor: vendor@shree.local / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
