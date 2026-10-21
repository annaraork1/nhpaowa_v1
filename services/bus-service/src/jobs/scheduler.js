import { associationCalendarYmd } from '@nhpaowa/shared-ui';
import { ALERT_TYPES, SEVERITY } from '@nhpaowa/shared-notifications';
import { getSettings } from '../routes/bus.js';
import { minutesOfTime, minutesOfClock } from '../lib/time.js';

export function startBusJobs({ prisma, notifications, associationId }) {
  const run = () =>
    scanBusAlerts({ prisma, notifications, associationId }).catch(console.error);
  run();
  return setInterval(run, 60_000);
}

export async function scanBusAlerts({ prisma, notifications, associationId }) {
  if (!notifications) return;
  const settings = await getSettings(prisma, associationId);
  const today = associationCalendarYmd();
  const dateObj = new Date(`${today}T00:00:00.000Z`);
  const now = new Date();
  const cutoffMin = minutesOfTime(settings.unmatchedCutoffTime);
  const nowMin = minutesOfClock(now);

  // Long waits still open
  const open = await prisma.gateTransaction.findMany({
    where: { associationId, gateOutAt: null },
    include: { bus: { include: { school: true } } },
  });
  for (const t of open) {
    const waitMin = (now.getTime() - new Date(t.gateInAt).getTime()) / 60000;
    if (waitMin > settings.longWaitMinutes) {
      await notifications.emit({
        associationId,
        type: ALERT_TYPES.BUS_LONG_WAIT,
        severity: SEVERITY.WARNING,
        relatedEntityType: 'GateTransaction',
        relatedEntityId: t.id,
        message: `${t.bus.vehicleRegistrationNumber} still at gate ${waitMin.toFixed(0)} min (open IN)`,
      });
    }
  }

  // After cutoff: IN without OUT
  if (nowMin >= cutoffMin) {
    for (const t of open) {
      if (t.tripDate.toISOString().slice(0, 10) !== today) continue;
      await notifications.emit({
        associationId,
        type: ALERT_TYPES.BUS_UNMATCHED_TRIP,
        severity: SEVERITY.CRITICAL,
        relatedEntityType: 'GateTransaction',
        relatedEntityId: t.id,
        message: `${t.bus.vehicleRegistrationNumber} has IN without OUT for ${t.tripDirection} on ${today}`,
      });
    }

    // AM/PM mismatch per school
    const trips = await prisma.gateTransaction.findMany({
      where: { associationId, tripDate: dateObj },
      include: { bus: { include: { school: true } } },
    });
    const bySchool = new Map();
    for (const t of trips) {
      const key = t.bus.schoolId;
      if (!bySchool.has(key)) {
        bySchool.set(key, {
          name: t.bus.school.name,
          am: 0,
          pm: 0,
          amChildren: 0,
          pmChildren: 0,
        });
      }
      const row = bySchool.get(key);
      if (t.tripDirection === 'PICKUP') {
        row.am += 1;
        row.amChildren += t.childCount;
      } else {
        row.pm += 1;
        row.pmChildren += t.childCount;
      }
    }
    for (const [, row] of bySchool) {
      let msg = null;
      if (row.am > 0 && row.pm === 0) msg = `${row.name}: AM pickup logged, no PM drop-off`;
      else if (row.pm > 0 && row.am === 0) msg = `${row.name}: PM drop-off without AM pickup`;
      else if (row.pmChildren > row.amChildren)
        msg = `${row.name}: PM child count (${row.pmChildren}) exceeds AM (${row.amChildren})`;
      if (msg) {
        await notifications.emit({
          associationId,
          type: ALERT_TYPES.BUS_AM_PM_MISMATCH,
          severity: SEVERITY.WARNING,
          relatedEntityType: 'School',
          relatedEntityId: null,
          message: msg,
        });
      }
    }
  }
}
