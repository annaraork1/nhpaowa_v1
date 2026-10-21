import {
  addCalendarDaysYmd,
  associationCalendarYmd,
  associationDayBoundsUtc,
  dateOnlyUtc,
} from '@nhpaowa/shared-ui';



/** Leave types recorded by Secretary (v1). */
export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'WEEK_OFF',
  'UNPAID',
  'OTHER',
];



/** Minimum open punch duration before check-out (anti double-click). */
export const MIN_PUNCH_DWELL_MS = 30_000;



/** Calendar YYYY-MM-DD in association TZ (or passthrough for date-only strings). */
export function toDateKey(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    return d.slice(0, 10);
  }
  return associationCalendarYmd(d instanceof Date ? d : new Date(d));
}



/** UTC midnight for `@db.Date` / leave range queries. */
export function parseDateOnly(s) {
  return dateOnlyUtc(String(s).slice(0, 10));
}



export function eachDateKey(fromDate, toDate) {
  const keys = [];
  let cur = toDateKey(fromDate);
  const end = toDateKey(toDate);
  while (cur <= end) {
    keys.push(cur);
    cur = addCalendarDaysYmd(cur, 1);
  }
  return keys;
}



/** Instant bounds for check-in filtering on an association calendar day. */
export function dayBounds(dateKey) {
  return associationDayBoundsUtc(dateKey);
}



function hoursBetween(a, b) {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return Math.round((ms / 36e5) * 100) / 100;
}



function leaveCoversDay(leave, dateKey) {
  if (leave.status !== 'APPROVED') return false;
  const start = toDateKey(leave.startDate);
  const end = toDateKey(leave.endDate);
  return dateKey >= start && dateKey <= end;
}



/**
 * Derive daily muster rows for active staff over inclusive date keys.
 * Precedence: ON_LEAVE → PRESENT (any punch) → ABSENT (explicit mark or derived).
 */
export function deriveDailyStatuses({
  staffList,
  entries,
  leaves,
  dayMarks = [],
  dateKeys,
  now = new Date(),
}) {
  const entriesByStaff = new Map();
  for (const e of entries) {
    const list = entriesByStaff.get(e.staffId) || [];
    list.push(e);
    entriesByStaff.set(e.staffId, list);
  }
  const leavesByStaff = new Map();
  for (const l of leaves) {
    const list = leavesByStaff.get(l.staffId) || [];
    list.push(l);
    leavesByStaff.set(l.staffId, list);
  }
  const marksByStaff = new Map();
  for (const m of dayMarks) {
    const list = marksByStaff.get(m.staffId) || [];
    list.push(m);
    marksByStaff.set(m.staffId, list);
  }



  const rows = [];
  for (const staff of staffList) {
    const sEntries = entriesByStaff.get(staff.id) || [];
    const sLeaves = leavesByStaff.get(staff.id) || [];
    const sMarks = marksByStaff.get(staff.id) || [];
    for (const dateKey of dateKeys) {
      const { start, end } = dayBounds(dateKey);
      const covering = sLeaves.find((l) => leaveCoversDay(l, dateKey));
      if (covering) {
        rows.push({
          staffId: staff.id,
          staffName: staff.name,
          category: staff.category,
          tower: staff.tower || null,
          designation: staff.designation || null,
          date: dateKey,
          status: 'ON_LEAVE',
          leaveType: covering.leaveType,
          hours: 0,
          checkInAt: null,
          checkOutAt: null,
          note: covering.reason || null,
          leaveId: covering.id,
        });
        continue;
      }



      const dayEntries = sEntries.filter((e) => {
        const t = new Date(e.checkInAt);
        return t >= start && t < end;
      });



      if (dayEntries.length) {
        let hours = 0;
        let firstIn = null;
        let lastOut = null;
        let note = null;
        for (const e of dayEntries) {
          const cin = new Date(e.checkInAt);
          const cout = e.checkOutAt ? new Date(e.checkOutAt) : now;
          hours += hoursBetween(cin, cout);
          if (!firstIn || cin < firstIn) firstIn = cin;
          if (e.checkOutAt) {
            const o = new Date(e.checkOutAt);
            if (!lastOut || o > lastOut) lastOut = o;
          }
          if (e.note) note = e.note;
        }
        rows.push({
          staffId: staff.id,
          staffName: staff.name,
          category: staff.category,
          tower: staff.tower || null,
          designation: staff.designation || null,
          date: dateKey,
          status: 'PRESENT',
          leaveType: null,
          hours: Math.round(hours * 100) / 100,
          checkInAt: firstIn ? firstIn.toISOString() : null,
          checkOutAt: lastOut ? lastOut.toISOString() : null,
          note,
          leaveId: null,
        });
        continue;
      }



      const mark = sMarks.find(
        (m) => toDateKey(m.date) === dateKey && m.status === 'ABSENT'
      );
      rows.push({
        staffId: staff.id,
        staffName: staff.name,
        category: staff.category,
        tower: staff.tower || null,
        designation: staff.designation || null,
        date: dateKey,
        status: 'ABSENT',
        leaveType: null,
        hours: 0,
        checkInAt: null,
        checkOutAt: null,
        note: mark?.note || null,
        leaveId: null,
        markedAbsent: Boolean(mark),
      });
    }
  }
  return rows;
}



/**
 * Build per-staff roster day state for punch UI.
 */
export function buildDayStates({
  staffList,
  entries,
  leaves,
  dayMarks = [],
  dateKey,
  now = new Date(),
}) {
  const { start, end } = dayBounds(dateKey);
  return staffList.map((staff) => {
    const covering = (leaves || []).find(
      (l) => l.staffId === staff.id && leaveCoversDay(l, dateKey)
    );
    if (covering) {
      return {
        staffId: staff.id,
        state: 'ON_LEAVE',
        leaveType: covering.leaveType,
        entryId: null,
        checkInAt: null,
        checkOutAt: null,
        markNote: null,
        hours: null,
      };
    }
    const dayEntries = (entries || []).filter((e) => {
      if (e.staffId !== staff.id) return false;
      const t = new Date(e.checkInAt);
      return t >= start && t < end;
    });
    const open = dayEntries.find((e) => !e.checkOutAt);
    if (open) {
      return {
        staffId: staff.id,
        state: 'IN',
        leaveType: null,
        entryId: open.id,
        checkInAt: open.checkInAt,
        checkOutAt: null,
        markNote: null,
        hours: hoursBetween(new Date(open.checkInAt), now),
        canCheckOut:
          now.getTime() - new Date(open.checkInAt).getTime() >=
          MIN_PUNCH_DWELL_MS,
      };
    }
    const closed = dayEntries
      .filter((e) => e.checkOutAt)
      .sort(
        (a, b) => new Date(b.checkOutAt) - new Date(a.checkOutAt)
      )[0];
    if (closed) {
      return {
        staffId: staff.id,
        state: 'DONE',
        leaveType: null,
        entryId: closed.id,
        checkInAt: closed.checkInAt,
        checkOutAt: closed.checkOutAt,
        markNote: null,
        hours: hoursBetween(
          new Date(closed.checkInAt),
          new Date(closed.checkOutAt)
        ),
      };
    }
    const mark = (dayMarks || []).find(
      (m) =>
        m.staffId === staff.id &&
        toDateKey(m.date) === dateKey &&
        m.status === 'ABSENT'
    );
    if (mark) {
      return {
        staffId: staff.id,
        state: 'ABSENT',
        leaveType: null,
        entryId: null,
        checkInAt: null,
        checkOutAt: null,
        markNote: mark.note || null,
        hours: null,
      };
    }
    return {
      staffId: staff.id,
      state: 'NOT_IN',
      leaveType: null,
      entryId: null,
      checkInAt: null,
      checkOutAt: null,
      markNote: null,
      hours: null,
    };
  });
}



export function summarizeStatuses(rows, { todayKey, openCheckIns = 0, rosterActive = 0 }) {
  const staffDays = { present: 0, onLeave: 0, absent: 0 };
  for (const r of rows) {
    if (r.status === 'PRESENT') staffDays.present += 1;
    else if (r.status === 'ON_LEAVE') staffDays.onLeave += 1;
    else staffDays.absent += 1;
  }
  const todayRows = rows.filter((r) => r.date === todayKey);
  return {
    rosterActive,
    staffDays,
    today: {
      date: todayKey,
      present: todayRows.filter((r) => r.status === 'PRESENT').length,
      onLeave: todayRows.filter((r) => r.status === 'ON_LEAVE').length,
      absent: todayRows.filter(
        (r) => r.status === 'ABSENT' && r.markedAbsent
      ).length,
      openCheckIns,
    },
  };
}


