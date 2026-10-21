/** Parse "HH:MM" or "HH:MM:SS" into a Date used for @db.Time fields. */
export function parseTimeToDate(value) {
  const s = String(value || '').trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) throw new Error('Invalid time — use HH:MM');
  const d = new Date(Date.UTC(1970, 0, 1, Number(m[1]), Number(m[2]), Number(m[3] || 0)));
  return d;
}

export function formatTime(d) {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  const hh = String(x.getUTCHours()).padStart(2, '0');
  const mm = String(x.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function serializeBusEntity(row) {
  if (!row || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map(serializeBusEntity);
  const out = { ...row };
  for (const key of ['startTime', 'endTime', 'assignedTime', 'unmatchedCutoffTime']) {
    if (out[key] != null) out[key] = formatTime(out[key]);
  }
  if (out.tripDate instanceof Date) {
    out.tripDate = out.tripDate.toISOString().slice(0, 10);
  }
  if (out.school) out.school = serializeBusEntity(out.school);
  if (out.bus) out.bus = serializeBusEntity(out.bus);
  if (out.batch) out.batch = serializeBusEntity(out.batch);
  if (out.slots) out.slots = out.slots.map(serializeBusEntity);
  if (out.buses) out.buses = out.buses.map(serializeBusEntity);
  return out;
}

/** Minutes since midnight UTC for a Time field stored as Date. */
export function minutesOfTime(d) {
  const x = d instanceof Date ? d : new Date(d);
  return x.getUTCHours() * 60 + x.getUTCMinutes();
}

export function minutesOfClock(date) {
  return date.getHours() * 60 + date.getMinutes();
}
