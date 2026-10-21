import express from 'express';
import cors from 'cors';
import {
  createAuthMiddleware,
  requireWriteAccess,
  requireApprover,
  requirePermission,
  ROLES,
} from '@nhpaowa/shared-auth';
import { createNotificationService } from '@nhpaowa/shared-notifications';
import { prisma } from './db.js';
import { createCategoryRouter } from './routes/categories.js';
import { createItemRouter } from './routes/items.js';
import { createSupplierRouter } from './routes/suppliers.js';
import { createPurchaseOrderRouter } from './routes/purchaseOrders.js';
import { createStockRouter } from './routes/stock.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createAlertsRouter } from './routes/alerts.js';
import { createReportsRouter } from './routes/reports.js';
import { createSettingsRouter } from './routes/settings.js';
import { createSearchRouter } from './routes/search.js';
import { createAmcRouter } from './routes/amc.js';
import { createUploadsRouter, uploadRoot } from './routes/uploads.js';
import { resolveUpload, useObjectStorage } from './lib/storage.js';
import { createWarehouseRouter } from './routes/warehouses.js';
import { createBarcodeRouter } from './routes/barcodes.js';
import { createVendorRouter } from './routes/vendor.js';
import { createPurchaseRequisitionRouter } from './routes/purchaseRequisitions.js';
import { createAssociationRouter } from './routes/association.js';
import {
  createPublicFlatUpdateRouter,
  createFlatSelfUpdateStaffRouter,
} from './routes/flatSelfUpdate.js';
import { startScheduledJobs } from './jobs/scheduler.js';

const PORT = Number(process.env.INVENTORY_PORT || 4001);
const JWT_SECRET = process.env.JWT_SECRET || 'nhpaowa-dev-secret';
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';
const STRICT = String(process.env.AUTH_STRICT || 'false').toLowerCase() === 'true';

const notifications = createNotificationService(prisma);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  if (useObjectStorage()) {
    app.use('/uploads', async (req, res, next) => {
      try {
        const key = String(req.path || '').replace(/^\/+/, '');
        const resolved = await resolveUpload(key);
        if (resolved.kind === 'redirect') {
          return res.redirect(302, resolved.url);
        }
        return res.status(404).json({ error: 'Not found' });
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use('/uploads', express.static(uploadRoot));
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'inventory-service', authStrict: STRICT });
  });

  // Login-free flat update (must be before auth middleware for AUTH_STRICT)
  app.use(
    '/api/inventory/public/flat-update',
    createPublicFlatUpdateRouter({ prisma, associationId: ASSOCIATION_ID })
  );

  app.use(
    createAuthMiddleware({
      jwtSecret: JWT_SECRET,
      defaultAssociationId: ASSOCIATION_ID,
      strict: STRICT,
    })
  );

  app.get('/api/inventory/me', (req, res) => {
    res.json({ user: req.user });
  });

  const ctx = {
    prisma,
    notifications,
    ROLES,
    requireWriteAccess,
    requireApprover,
    requirePermission,
  };

  app.use('/api/inventory/categories', createCategoryRouter(ctx));
  app.use('/api/inventory/items', createItemRouter(ctx));
  app.use('/api/inventory/suppliers', createSupplierRouter(ctx));
  app.use('/api/inventory/purchase-orders', createPurchaseOrderRouter(ctx));
  app.use('/api/inventory/stock-transactions', createStockRouter(ctx));
  app.use('/api/inventory/dashboard', createDashboardRouter(ctx));
  app.use('/api/inventory/alerts', createAlertsRouter(ctx));
  app.use('/api/inventory/reports', createReportsRouter(ctx));
  app.use('/api/inventory/settings', createSettingsRouter(ctx));
  app.use('/api/inventory/search', createSearchRouter(ctx));
  app.use('/api/inventory/amc', createAmcRouter(ctx));
  app.use('/api/inventory/uploads', createUploadsRouter(ctx));
  app.use('/api/inventory/warehouses', createWarehouseRouter(ctx));
  app.use('/api/inventory/barcodes', createBarcodeRouter(ctx));
  app.use('/api/inventory/vendor', createVendorRouter(ctx));
  app.use(
    '/api/inventory/purchase-requisitions',
    createPurchaseRequisitionRouter(ctx)
  );
  app.use('/api/association', createAssociationRouter(ctx));
  app.use('/api/inventory', createFlatSelfUpdateStaffRouter(ctx));

  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

import { pathToFileURL } from 'url';

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`inventory-service listening on :${PORT}`);
    console.log(
      useObjectStorage()
        ? 'uploads: Supabase Storage'
        : `uploads dir: ${uploadRoot}`,
    );
    if ((process.env.HOSTING_MODE || 'docker').toLowerCase() !== 'vercel-fullstack') {
      startScheduledJobs({ prisma, notifications });
    }
  });
}
