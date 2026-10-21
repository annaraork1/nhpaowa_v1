import express from 'express';
import cors from 'cors';
import {
  createAuthMiddleware,
  requirePermission,
} from '@nhpaowa/shared-auth';
import { createBusNotificationService } from './lib/notifications.js';
import { prisma } from './db.js';
import { createBusRouter } from './routes/bus.js';
import { startBusJobs } from './jobs/scheduler.js';

const PORT = Number(process.env.BUS_PORT || 4002);
const JWT_SECRET = process.env.JWT_SECRET || 'nhpaowa-dev-secret';
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';
const STRICT = String(process.env.AUTH_STRICT || 'false').toLowerCase() === 'true';

const notifications = createBusNotificationService(prisma);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'bus-service', authStrict: STRICT });
  });

  app.use(
    createAuthMiddleware({
      jwtSecret: JWT_SECRET,
      defaultAssociationId: ASSOCIATION_ID,
      strict: STRICT,
    })
  );

  const ctx = { prisma, requirePermission, notifications };
  app.use('/api/bus', createBusRouter(ctx));

  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors?.[0]?.message || 'Invalid input' });
    }
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Server error' });
  });

  return app;
}

import { pathToFileURL } from 'url';

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`bus-service listening on :${PORT}`);
    if ((process.env.HOSTING_MODE || 'docker').toLowerCase() !== 'vercel-fullstack') {
      startBusJobs({ prisma, notifications, associationId: ASSOCIATION_ID });
    }
  });
}
