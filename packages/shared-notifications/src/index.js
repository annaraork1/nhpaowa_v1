/**
 * Shared notification dispatcher.
 * Inventory (and future modules) emit alerts through this API.
 * Persistence is injected by the host service (Prisma client).
 */

export const ALERT_TYPES = {
  LOW_STOCK: 'LOW_STOCK',
  PO_DUE: 'PO_DUE',
  AMC_EXPIRY: 'AMC_EXPIRY',
  STOCK_RECEIVED: 'STOCK_RECEIVED',
  NEW_SUPPLIER: 'NEW_SUPPLIER',
  NOTICE_PUBLISHED: 'NOTICE_PUBLISHED',
  BUS_UNMATCHED_TRIP: 'BUS_UNMATCHED_TRIP',
  BUS_LONG_WAIT: 'BUS_LONG_WAIT',
  BUS_OFF_SLOT: 'BUS_OFF_SLOT',
  BUS_BATCH_CAPACITY: 'BUS_BATCH_CAPACITY',
  BUS_AM_PM_MISMATCH: 'BUS_AM_PM_MISMATCH',
};

export const SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
};

export function createNotificationService(prisma) {
  return {
    async emit({
      associationId,
      type,
      severity = SEVERITY.INFO,
      relatedEntityType,
      relatedEntityId,
      message,
    }) {
      return prisma.alert.create({
        data: {
          associationId,
          type,
          severity,
          relatedEntityType,
          relatedEntityId,
          message,
          isRead: false,
        },
      });
    },

    async list({ associationId, unreadOnly = false, take = 50 }) {
      return prisma.alert.findMany({
        where: {
          associationId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
      });
    },

    async markRead({ associationId, id }) {
      return prisma.alert.updateMany({
        where: { id, associationId },
        data: { isRead: true },
      });
    },
  };
}
