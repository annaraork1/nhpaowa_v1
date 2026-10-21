import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startScheduledJobs({ prisma, notifications }) {
  // Run once shortly after boot, then daily
  const run = () => scanJobs({ prisma, notifications }).catch(console.error);
  setTimeout(run, 5000);
  setInterval(run, DAY_MS);
}

export async function scanJobs({ prisma, notifications }) {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * DAY_MS);

  const duePos = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ['ORDERED', 'APPROVED', 'PARTIALLY_RECEIVED'] },
      expectedDate: { lte: in3Days, gte: now },
    },
  });

  for (const po of duePos) {
    await notifications.emit({
      associationId: po.associationId,
      type: ALERT_TYPES.PO_DUE,
      severity: SEVERITY.WARNING,
      relatedEntityType: 'PurchaseOrder',
      relatedEntityId: po.id,
      message: `Purchase order ${po.poNumber} is due soon`,
    });
  }

  const amcs = await prisma.amcContract.findMany({
    where: { status: 'ACTIVE' },
  });
  for (const amc of amcs) {
    const lead = new Date(amc.endDate);
    lead.setDate(lead.getDate() - amc.reminderLeadDays);
    if (now >= lead && now <= amc.endDate) {
      await notifications.emit({
        associationId: amc.associationId,
        type: ALERT_TYPES.AMC_EXPIRY,
        severity: SEVERITY.WARNING,
        relatedEntityType: 'AmcContract',
        relatedEntityId: amc.id,
        message: `AMC expiring soon: ${amc.description}`,
      });
    }
  }
}
