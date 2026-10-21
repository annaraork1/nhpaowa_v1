/** Default research-backed staff categories for multi-tower RWA campuses */
export const DEFAULT_STAFF_CATEGORIES = [
  { code: 'SECURITY', label: 'Security', sortOrder: 10 },
  { code: 'HOUSEKEEPING', label: 'Housekeeping', sortOrder: 20 },
  { code: 'GARDENING', label: 'Gardening', sortOrder: 30 },
  { code: 'ELECTRICAL', label: 'Electrical', sortOrder: 40 },
  { code: 'PLUMBING', label: 'Plumbing', sortOrder: 50 },
  { code: 'MAINTENANCE', label: 'Maintenance', sortOrder: 60 },
  { code: 'CLUBHOUSE', label: 'Clubhouse / amenities', sortOrder: 70 },
  { code: 'OFFICE', label: 'Office', sortOrder: 80 },
  { code: 'WASTE_MGMT', label: 'Waste / STP', sortOrder: 90 },
  { code: 'LIFT', label: 'Lift technician', sortOrder: 100 },
  { code: 'FIRE_SAFETY', label: 'Fire & safety', sortOrder: 110 },
  { code: 'CCTV', label: 'CCTV desk', sortOrder: 120 },
  { code: 'OTHER', label: 'Other', sortOrder: 999 },
];

/** @deprecated use DEFAULT_STAFF_CATEGORIES — kept for template samples */
export const STAFF_CATEGORIES = DEFAULT_STAFF_CATEGORIES.map((c) => c.code);

export const STAFF_CATEGORY_LABELS = Object.fromEntries(
  DEFAULT_STAFF_CATEGORIES.map((c) => [c.code, c.label])
);

const ALIASES = {
  GUARD: 'SECURITY',
  SECURITY_GUARD: 'SECURITY',
  HK: 'HOUSEKEEPING',
  CLEANING: 'HOUSEKEEPING',
  GARDENER: 'GARDENING',
  LANDSCAPING: 'GARDENING',
  ELECTRICIAN: 'ELECTRICAL',
  PLUMBER: 'PLUMBING',
  HANDYMAN: 'MAINTENANCE',
  CLUB: 'CLUBHOUSE',
  CLUB_HOUSE: 'CLUBHOUSE',
  DESK: 'CLUBHOUSE',
  RECEPTION: 'OFFICE',
  STP: 'WASTE_MGMT',
  GARBAGE: 'WASTE_MGMT',
  WASTE: 'WASTE_MGMT',
  LIFT_TECH: 'LIFT',
  FIRE: 'FIRE_SAFETY',
  CCTV_DESK: 'CCTV',
};

export function normalizeCategoryCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Resolve CSV/UI category string against active codes (and aliases).
 * @param {string} raw
 * @param {string[]} activeCodes
 */
export function normalizeStaffCategory(raw, activeCodes = STAFF_CATEGORIES) {
  const key = normalizeCategoryCode(raw);
  const mapped = ALIASES[key] || key;
  const allowed = activeCodes.map((c) => c.toUpperCase());
  return allowed.includes(mapped) ? mapped : null;
}

export async function listActiveCategoryCodes(prisma, associationId) {
  const rows = await prisma.staffCategory.findMany({
    where: { associationId, active: true, deletedAt: null },
    select: { code: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (rows.length) return rows.map((r) => r.code);
  return STAFF_CATEGORIES;
}

/** Minimal CSV line parser supporting quoted fields */
export function parseCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  function splitLine(line) {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line, idx) => {
    const cells = splitLine(line);
    const obj = { __row: idx + 2 };
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
  return { headers, rows };
}

export const STAFF_CSV_TEMPLATE = `name,category,phone,tower,designation
Ravi Guard,SECURITY,9000001001,1,Tower 1 Lobby
Main Gate Night,SECURITY,9000001002,,Main Gate
Lakshmi HK,HOUSEKEEPING,9000001003,2,Tower 2 Floors
Garden Kumar,GARDENING,9000001004,,Landscaping
STP Helper,WASTE_MGMT,9000001005,,STP / garbage
`;
