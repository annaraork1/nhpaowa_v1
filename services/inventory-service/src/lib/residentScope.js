/**
 * Resident flat-link helpers (014-resident-portal / 013 household).
 * A resident is linked when an active FlatMember.userId matches the user.
 */

export function isResident(role) {
  return role === 'RESIDENT';
}

export function isAssociationStaffEditor(role) {
  return role === 'SUPERADMIN' || role === 'SECRETARY';
}

/** Roles that may run NOC issue / move approve workflows */
export function isWorkflowStaff(role) {
  return (
    role === 'SUPERADMIN' ||
    role === 'SECRETARY' ||
    role === 'TREASURER' ||
    role === 'COMMITTEE' ||
    role === 'STAFF'
  );
}

export async function linkedFlatIds(prisma, userId) {
  if (!userId) return [];
  const rows = await prisma.flatMember.findMany({
    where: { userId, isActive: true, deletedAt: null },
    select: { flatId: true },
  });
  return [...new Set(rows.map((r) => r.flatId))];
}

export async function residentOwnsFlat(prisma, userId, flatId) {
  if (!userId || !flatId) return false;
  const m = await prisma.flatMember.findFirst({
    where: { flatId, userId, isActive: true, deletedAt: null },
  });
  return Boolean(m);
}
