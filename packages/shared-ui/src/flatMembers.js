/** Flat member role tokens shared by API, CSV, and UI. */
export const FLAT_MEMBER_ROLES = [
  {
    value: 'PRIMARY_OWNER',
    label: 'Primary owner',
    staffOnly: true,
  },
  {
    value: 'ASSOCIATE_OWNER',
    label: 'Associate owner',
    staffOnly: false,
  },
  {
    value: 'TENANT',
    label: 'Tenant',
    staffOnly: false,
  },
  {
    value: 'OWNER_FAMILY',
    label: 'Owner family',
    staffOnly: false,
  },
  {
    value: 'TENANT_FAMILY',
    label: 'Tenant family',
    staffOnly: false,
  },
];

export const FLAT_MEMBER_ROLE_VALUES = FLAT_MEMBER_ROLES.map((r) => r.value);

export const EXTRA_FLAT_MEMBER_ROLES = FLAT_MEMBER_ROLE_VALUES.filter(
  (r) => r !== 'PRIMARY_OWNER',
);

export function flatMemberRoleLabel(role) {
  return (
    FLAT_MEMBER_ROLES.find((r) => r.value === role)?.label ||
    String(role || '').replace(/_/g, ' ').toLowerCase()
  );
}

const TENANT_HOUSEHOLD = new Set(['TENANT', 'TENANT_FAMILY']);
const OWNER_HOUSEHOLD = new Set([
  'PRIMARY_OWNER',
  'ASSOCIATE_OWNER',
  'OWNER_FAMILY',
]);

/**
 * Derive occupancy from active members.
 * Tenant household wins over owner-only household; no members → VACANT.
 */
export function occupancyFromMembers(members) {
  const roles = (members || [])
    .filter((m) => m && !m.deletedAt && m.isActive !== false)
    .map((m) => m.role);
  if (roles.some((r) => TENANT_HOUSEHOLD.has(r))) return 'TENANT_OCCUPIED';
  if (roles.some((r) => OWNER_HOUSEHOLD.has(r))) return 'OWNER_OCCUPIED';
  return 'VACANT';
}

/** Numeric tower then flatNumber (FFU) — avoid string sort 1, 11, 21, 2. */
export function compareTowerFlat(a, b) {
  const ta = Number(a?.tower);
  const tb = Number(b?.tower);
  const na = Number.isFinite(ta) ? ta : Number.MAX_SAFE_INTEGER;
  const nb = Number.isFinite(tb) ? tb : Number.MAX_SAFE_INTEGER;
  if (na !== nb) return na - nb;
  return String(a?.flatNumber ?? '').localeCompare(
    String(b?.flatNumber ?? ''),
    undefined,
    { numeric: true }
  );
}
