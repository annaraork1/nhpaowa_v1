import { prisma } from '../src/db.js';
import { parseTimeToDate } from '../src/lib/time.js';

const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';

async function main() {
  await prisma.busSetting.upsert({
    where: { associationId: ASSOCIATION_ID },
    create: { associationId: ASSOCIATION_ID },
    update: {},
  });

  const schools = [
    { name: 'Delhi Public School', contact: 'Coordinator DPS', phone: '9800000001' },
    { name: 'National Public School', contact: 'Coordinator NPS', phone: '9800000002' },
    { name: 'Kendriya Vidyalaya', contact: 'Coordinator KV', phone: '9800000003' },
  ];

  const schoolRows = [];
  for (const s of schools) {
    const existing = await prisma.school.findFirst({
      where: { associationId: ASSOCIATION_ID, name: s.name, deletedAt: null },
    });
    schoolRows.push(
      existing ||
        (await prisma.school.create({
          data: {
            associationId: ASSOCIATION_ID,
            name: s.name,
            primaryContactName: s.contact,
            primaryContactPhone: s.phone,
          },
        }))
    );
  }

  const busDefs = [
    { school: 0, reg: 'KA01AB1001', driver: 'Ravi', phone: '9900000001' },
    { school: 0, reg: 'KA01AB1002', driver: 'Suresh', phone: '9900000002' },
    { school: 1, reg: 'KA01CD2001', driver: 'Imran', phone: '9900000003' },
    { school: 2, reg: 'KA01EF3001', driver: 'Prakash', phone: '9900000004' },
  ];

  const buses = [];
  for (const b of busDefs) {
    const existing = await prisma.bus.findFirst({
      where: {
        associationId: ASSOCIATION_ID,
        vehicleRegistrationNumber: b.reg,
        deletedAt: null,
      },
    });
    buses.push(
      existing ||
        (await prisma.bus.create({
          data: {
            associationId: ASSOCIATION_ID,
            schoolId: schoolRows[b.school].id,
            vehicleRegistrationNumber: b.reg,
            driverName: b.driver,
            driverPhone: b.phone,
            seatingCapacity: 40,
          },
        }))
    );
  }

  async function ensureBatch(label, start, end, direction, capacity = 3) {
    const existing = await prisma.gateBatch.findFirst({
      where: { associationId: ASSOCIATION_ID, label, deletedAt: null },
    });
    if (existing) return existing;
    return prisma.gateBatch.create({
      data: {
        associationId: ASSOCIATION_ID,
        label,
        startTime: parseTimeToDate(start),
        endTime: parseTimeToDate(end),
        bayCapacity: capacity,
        tripDirection: direction,
      },
    });
  }

  const amEarly = await ensureBatch('6:20-6:40 AM', '06:20', '06:40', 'PICKUP');
  const amPeak = await ensureBatch('7:30-7:50 AM', '07:30', '07:50', 'PICKUP');
  const pmBatch = await ensureBatch('3:00-3:30 PM', '15:00', '15:30', 'DROPOFF');

  const slotDefs = [
    { bus: 0, batch: amEarly, time: '06:22', order: 1 },
    { bus: 1, batch: amEarly, time: '06:28', order: 2 },
    { bus: 2, batch: amPeak, time: '07:35', order: 1 },
    { bus: 3, batch: amPeak, time: '07:42', order: 2 },
    { bus: 0, batch: pmBatch, time: '15:05', order: 1 },
    { bus: 1, batch: pmBatch, time: '15:12', order: 2 },
    { bus: 2, batch: pmBatch, time: '15:18', order: 3 },
    { bus: 3, batch: pmBatch, time: '15:25', order: 4 },
  ];

  for (const s of slotDefs) {
    const existing = await prisma.busSlot.findFirst({
      where: { busId: buses[s.bus].id, batchId: s.batch.id },
    });
    if (!existing) {
      await prisma.busSlot.create({
        data: {
          associationId: ASSOCIATION_ID,
          busId: buses[s.bus].id,
          batchId: s.batch.id,
          assignedTime: parseTimeToDate(s.time),
          staggerOrder: s.order,
        },
      });
    }
  }

  console.log('Bus seed complete');
  console.log('Schools:', schoolRows.length, 'Buses:', buses.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
