/**
 * NHPAOWA / TATA New Haven tower registry (spreadsheet seed — authoritative).
 * Towers 17–20 (Riva) are permanently excluded (active: false).
 *
 * Floor storage: Int 0 = Ground (display "G"), then 1…maxFloor.
 * Flat numbers (campus ID without T-prefix): `{FF}{U}` —
 *   G → 001–004, floor 3 → 031–034, floor 10 → 101–104.
 * Display label: `T{tower}{flatNumber}` e.g. T21001, T21031, T21101.
 */

/** Spreadsheet Category → apartment catalog pair */
export const TOWER_CATEGORY_TO_VARIANT = {
  Compact: { apartmentType: '2 BHK', configuration: 'Compact' },
  Optima: { apartmentType: '2 BHK', configuration: 'Optima' },
  Ultima: { apartmentType: '2 BHK', configuration: 'Ultima' },
  Elite: { apartmentType: '2 BHK', configuration: 'Elite' },
  '3BHK': { apartmentType: '3 BHK', configuration: 'Standard Variant' },
};

/**
 * @typedef {object} TowerDef
 * @property {string} number
 * @property {boolean} active
 * @property {'G+14'|'G+12'|'G+10'|null} floorGroup
 * @property {number|null} maxFloor  highest numbered floor (14 for G+14); G is separate
 * @property {number} flatsPerFloor
 * @property {string|null} category  spreadsheet Category
 * @property {string[]} missingFlatNumbers  flat numbers that do not exist
 * @property {string|null} [excludedReason]
 */

/** @type {TowerDef[]} */
export const TOWER_CATALOG = [
  // G+14
  { number: '1', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Compact', missingFlatNumbers: [] },
  { number: '2', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  { number: '3', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Compact', missingFlatNumbers: [] },
  { number: '4', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Compact', missingFlatNumbers: ['001'] },
  { number: '5', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Compact', missingFlatNumbers: [] },
  { number: '6', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  { number: '7', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Compact', missingFlatNumbers: [] },
  { number: '8', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Elite', missingFlatNumbers: [] },
  { number: '9', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: [] },
  { number: '10', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  { number: '11', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: ['001', '002'] },
  { number: '12', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  { number: '13', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  { number: '14', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  { number: '15', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: ['002', '003', '004'] },
  { number: '16', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Optima', missingFlatNumbers: [] },
  // Riva — excluded
  { number: '17', active: false, floorGroup: null, maxFloor: null, flatsPerFloor: 0, category: null, missingFlatNumbers: [], excludedReason: 'Riva — not Tata New Haven' },
  { number: '18', active: false, floorGroup: null, maxFloor: null, flatsPerFloor: 0, category: null, missingFlatNumbers: [], excludedReason: 'Riva — not Tata New Haven' },
  { number: '19', active: false, floorGroup: null, maxFloor: null, flatsPerFloor: 0, category: null, missingFlatNumbers: [], excludedReason: 'Riva — not Tata New Haven' },
  { number: '20', active: false, floorGroup: null, maxFloor: null, flatsPerFloor: 0, category: null, missingFlatNumbers: [], excludedReason: 'Riva — not Tata New Haven' },
  // G+10 / G+12 / G+14 remainder
  { number: '21', active: true, floorGroup: 'G+10', maxFloor: 10, flatsPerFloor: 4, category: '3BHK', missingFlatNumbers: [] },
  { number: '22', active: true, floorGroup: 'G+10', maxFloor: 10, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: ['001'] },
  { number: '23', active: true, floorGroup: 'G+10', maxFloor: 10, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: ['002'] },
  { number: '24', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: [] },
  { number: '25', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: ['003', '004'] },
  { number: '26', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: '3BHK', missingFlatNumbers: [] },
  { number: '27', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: [] },
  { number: '28', active: true, floorGroup: 'G+12', maxFloor: 12, flatsPerFloor: 4, category: 'Elite', missingFlatNumbers: [] },
  { number: '29', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Elite', missingFlatNumbers: ['003', '004'] },
  { number: '30', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Elite', missingFlatNumbers: ['001', '002'] },
  { number: '31', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Elite', missingFlatNumbers: [] },
  { number: '32', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: [] },
  { number: '33', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: ['001', '002', '003', '004'] },
  { number: '34', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: '3BHK', missingFlatNumbers: ['002'] },
  { number: '35', active: true, floorGroup: 'G+14', maxFloor: 14, flatsPerFloor: 4, category: 'Ultima', missingFlatNumbers: [] },
];

/** Active NHPAOWA tower numbers as strings (for dropdowns). */
export const TOWER_NUMBERS = TOWER_CATALOG.filter((t) => t.active).map(
  (t) => t.number,
);

export function getTower(number) {
  const key = String(number);
  return TOWER_CATALOG.find((t) => t.number === key) || null;
}

export function isActiveTower(number) {
  return Boolean(getTower(number)?.active);
}

/** Floor levels for a tower: [0, 1, …, maxFloor] where 0 = Ground. */
export function floorsForTower(number) {
  const t = getTower(number);
  if (!t?.active || t.maxFloor == null) return [];
  const levels = [0];
  for (let f = 1; f <= t.maxFloor; f += 1) levels.push(f);
  return levels;
}

/** Display label: 0 → "G", else String(n). */
export function formatFloorLabel(floor) {
  if (floor === null || floor === undefined || floor === '') return '—';
  const n = Number(floor);
  if (Number.isNaN(n)) return String(floor);
  return n === 0 ? 'G' : String(n);
}

/** Parse UI floor value ("G" | "0" | "1"…) → Int for DB. */
export function parseFloorInput(value) {
  if (value === '' || value === null || value === undefined) return null;
  const s = String(value).trim().toUpperCase();
  if (s === 'G' || s === '0') return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/**
 * Flat number for floor + unit index (1..4).
 * Pattern `{floor:2}{unit:1}` → G:001–004, 3rd:031–034, 10th:101–104.
 * Full campus label is `T{tower}{flatNumber}` (e.g. T21031).
 */
export function flatNumberFor(floor, unitIndex) {
  const ff = String(Number(floor)).padStart(2, '0');
  return `${ff}${unitIndex}`;
}

/** Parse `001` / `031` / `101` → { floor, unit }. Returns null if invalid. */
export function parseFlatNumber(flatNumber) {
  const s = String(flatNumber || '').trim();
  if (!/^\d{3}$/.test(s)) return null;
  const floor = Number(s.slice(0, 2));
  const unit = Number(s.slice(2, 3));
  if (!Number.isInteger(floor) || floor < 0 || floor > 99) return null;
  if (!Number.isInteger(unit) || unit < 1 || unit > 4) return null;
  return { floor, unit };
}

/** Campus display id: T21031 */
export function formatCampusFlatId(tower, flatNumber) {
  if (tower == null || flatNumber == null || flatNumber === '') return '';
  return `T${tower}${String(flatNumber).trim()}`;
}

/**
 * Parse search text that looks like a campus flat id (`T21031`, `21031`).
 * Returns `{ tower, flatNumber }` or null.
 */
export function parseCampusFlatQuery(q) {
  const raw = String(q || '')
    .trim()
    .replace(/\s+/g, '');
  if (!raw) return null;
  const digits = raw.replace(/^t/i, '');
  const m = digits.match(/^(\d{1,2})(\d{3})$/);
  if (!m) return null;
  const flatNumber = m[2];
  if (!parseFlatNumber(flatNumber)) return null;
  const tower = String(Number(m[1]));
  if (!tower || Number.isNaN(Number(tower))) return null;
  return { tower, flatNumber };
}

export function variantForTowerCategory(category) {
  return TOWER_CATEGORY_TO_VARIANT[category] || null;
}

export function expectedVariantForTower(number) {
  const t = getTower(number);
  if (!t?.active || !t.category) return null;
  return variantForTowerCategory(t.category);
}

/**
 * Generate all designed flat rows for active towers (minus missing).
 * @returns {{ tower: string, flatNumber: string, floor: number, apartmentType: string, configuration: string }[]}
 */
export function generateNhpaowaFlatSeeds() {
  const rows = [];
  for (const t of TOWER_CATALOG) {
    if (!t.active) continue;
    const variant = variantForTowerCategory(t.category);
    if (!variant) continue;
    const missing = new Set(t.missingFlatNumbers || []);
    for (const floor of floorsForTower(t.number)) {
      for (let u = 1; u <= t.flatsPerFloor; u += 1) {
        const flatNumber = flatNumberFor(floor, u);
        if (missing.has(flatNumber)) continue;
        rows.push({
          tower: t.number,
          flatNumber,
          floor,
          apartmentType: variant.apartmentType,
          configuration: variant.configuration,
        });
      }
    }
  }
  return rows;
}

/** Expected actual flat count from spreadsheet (1,705). */
export const NHPAOWA_EXPECTED_FLAT_COUNT = 1705;
