import {
  occupancyFromMembers,
  compareTowerFlat,
} from '@nhpaowa/shared-ui';

/** Recompute flat.occupancyStatus from active members. */
export async function syncFlatOccupancyFromMembers(prisma, flatId) {
  const members = await prisma.flatMember.findMany({
    where: { flatId, deletedAt: null, isActive: true },
    select: { role: true, deletedAt: true, isActive: true },
  });
  const next = occupancyFromMembers(members);
  const flat = await prisma.flat.findFirst({
    where: { id: flatId, deletedAt: null },
    select: { id: true, occupancyStatus: true },
  });
  if (!flat) return null;
  if (flat.occupancyStatus === next) return flat;
  return prisma.flat.update({
    where: { id: flatId },
    data: { occupancyStatus: next },
  });
}

/**
 * Page flats with numeric tower order (1,2,…10,11,…21) then flatNumber.
 * Uses a light id pass then hydrates the page (keeps filters via Prisma `where`).
 */
export async function findFlatsPageNumeric(prisma, { where, include, limit, offset }) {
  const light = await prisma.flat.findMany({
    where,
    select: { id: true, tower: true, flatNumber: true },
  });
  light.sort(compareTowerFlat);
  const total = light.length;
  const page =
    limit === 0 ? light : light.slice(offset, offset + limit);
  const pageIds = page.map((r) => r.id);
  if (!pageIds.length) {
    return { items: [], total, limit: limit === 0 ? 0 : limit, offset };
  }
  const flats = await prisma.flat.findMany({
    where: { id: { in: pageIds } },
    include,
  });
  const byId = new Map(flats.map((f) => [f.id, f]));
  const items = pageIds.map((id) => byId.get(id)).filter(Boolean);
  return {
    items,
    total,
    limit: limit === 0 ? total : limit,
    offset,
  };
}

export function sortFlatsNumeric(flats) {
  return [...flats].sort(compareTowerFlat);
}
