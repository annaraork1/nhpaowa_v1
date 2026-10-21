/**
 * Vercel Cron entry:
 *   GET/POST /api/cron              — inventory + bus
 *   GET/POST /api/cron?job=inventory|bus|all
 *
 * Secure with Authorization: Bearer $CRON_SECRET (or header x-cron-secret).
 */
import { prisma as inventoryPrisma } from '../services/inventory-service/src/db.js';
import { createNotificationService } from '@nhpaowa/shared-notifications';
import { scanJobs } from '../services/inventory-service/src/jobs/scheduler.js';
import { prisma as busPrisma } from '../services/bus-service/src/db.js';
import { createBusNotificationService } from '../services/bus-service/src/lib/notifications.js';
import { scanBusAlerts } from '../services/bus-service/src/jobs/scheduler.js';

const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const alt = req.headers['x-cron-secret'];
  return bearer === secret || alt === secret;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let job = 'all';
  try {
    const url = new URL(req.url, 'http://localhost');
    job = url.searchParams.get('job') || 'all';
  } catch {
    job = 'all';
  }

  try {
    const results = {};
    if (job === 'inventory' || job === 'all') {
      const notifications = createNotificationService(inventoryPrisma);
      await scanJobs({ prisma: inventoryPrisma, notifications });
      results.inventory = 'ok';
    }
    if (job === 'bus' || job === 'all') {
      const notifications = createBusNotificationService(busPrisma);
      await scanBusAlerts({
        prisma: busPrisma,
        notifications,
        associationId: ASSOCIATION_ID,
      });
      results.bus = 'ok';
    }
    return res.status(200).json({ ok: true, results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Cron failed' });
  }
}
