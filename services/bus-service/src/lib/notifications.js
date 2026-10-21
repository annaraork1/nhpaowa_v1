import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/client/index.js';
import { SEVERITY } from '@nhpaowa/shared-notifications';

/**
 * Emit into shared public.alerts (type is text) for the inventory bell.
 */
export function createBusNotificationService(prisma) {
  return {
    async emit({
      associationId,
      type,
      severity = SEVERITY.INFO,
      relatedEntityType = null,
      relatedEntityId = null,
      message,
    }) {
      const id = randomUUID();
      const entityIdSql = relatedEntityId
        ? Prisma.sql`${relatedEntityId}::uuid`
        : Prisma.sql`NULL`;
      await prisma.$executeRaw`
        INSERT INTO public.alerts
          (id, association_id, type, severity, related_entity_type, related_entity_id, message, is_read, created_at)
        VALUES (
          ${id}::uuid,
          ${associationId}::uuid,
          ${String(type)},
          ${String(severity)}::"AlertSeverity",
          ${relatedEntityType},
          ${entityIdSql},
          ${message},
          false,
          NOW()
        )
      `;
      return { id, type, message };
    },
    async list() {
      return [];
    },
    async markRead() {
      return { count: 0 };
    },
  };
}
