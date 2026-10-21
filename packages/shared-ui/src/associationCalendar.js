/**
 * Association campus calendar helpers (NHPAOWA / Bengaluru).
 * Use for @db.Date filters and “today” KPIs — never rely on
 * `toDateString()` / `toISOString().slice(0,10)` alone (UTC skew vs IST).
 */

export const ASSOCIATION_TZ =
  (typeof process !== 'undefined' && process.env?.ASSOCIATION_TZ) ||
  'Asia/Kolkata';

/** YYYY-MM-DD in association timezone. */
export function associationCalendarYmd(
  date = new Date(),
  timeZone = ASSOCIATION_TZ
) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date instanceof Date ? date : new Date(date));
}

export function addCalendarDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** UTC-midnight Date for a calendar YMD — safe for Prisma `@db.Date`. */
export function dateOnlyUtc(ymd) {
  return new Date(`${String(ymd).slice(0, 10)}T00:00:00.000Z`);
}

/**
 * Instant range for one association calendar day.
 * Asia/Kolkata has no DST (+05:30).
 */
export function associationDayBoundsUtc(ymd, timeZone = ASSOCIATION_TZ) {
  const key = String(ymd).slice(0, 10);
  if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta') {
    const [y, m, d] = key.split('-').map(Number);
    const start = new Date(
      Date.UTC(y, m - 1, d, 0, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000
    );
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const start = dateOnlyUtc(key);
  const end = dateOnlyUtc(addCalendarDaysYmd(key, 1));
  return { start, end };
}

/** Inclusive YMD range as UTC-midnight Dates for `@db.Date` columns. */
export function associationDateColumnRange(ymdFrom, ymdToInclusive) {
  return {
    gte: dateOnlyUtc(ymdFrom),
    lt: dateOnlyUtc(addCalendarDaysYmd(ymdToInclusive, 1)),
  };
}
