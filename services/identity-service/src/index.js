import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  createAuthMiddleware,
  requireRoles,
  requirePermission,
  signToken,
  ROLES,
  CUSTOMIZABLE_ROLES,
  MENU_FEATURE_RESOURCES,
  ROLE_LABELS,
  defaultMenuFeatures,
} from '@nhpaowa/shared-auth';

const globalForPrisma = globalThis;
const prisma =
  globalForPrisma.__nhpaowaIdentityPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === 'true' ? ['error', 'warn'] : ['error'],
  });
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__nhpaowaIdentityPrisma = prisma;
}
const PORT = Number(process.env.IDENTITY_PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'nhpaowa-dev-secret';
const ASSOCIATION_ID =
  process.env.ASSOCIATION_ID || '00000000-0000-4000-8000-000000000001';
const STRICT = String(process.env.AUTH_STRICT || 'false').toLowerCase() === 'true';

const ROLE_VALUES = Object.values(ROLES);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(ROLE_VALUES),
  supplierId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  supplierId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    supplierId: user.supplierId,
    active: user.active,
    createdAt: user.createdAt,
  };
}

async function resolveMenuFeatures(associationId, role) {
  if (!CUSTOMIZABLE_ROLES.includes(role)) {
    return defaultMenuFeatures(role);
  }
  const rows = await prisma.roleMenuAccess.findMany({
    where: { associationId, role },
  });
  const defaults = defaultMenuFeatures(role);
  let features;
  if (!rows.length) {
    features = defaults;
  } else {
    const known = new Set(rows.map((r) => r.resource));
    features = rows.filter((r) => r.enabled).map((r) => r.resource);
    // Newly added platform menu resources stay on until Superadmin toggles them off
    for (const d of defaults) {
      if (!known.has(d) && !features.includes(d)) features.push(d);
    }
  }
  if (!features.includes('home')) {
    features = ['home', ...features];
  }
  return features;
}

async function countActiveSuperadmins(associationId, excludeUserId) {
  return prisma.user.count({
    where: {
      associationId,
      role: ROLES.SUPERADMIN,
      active: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

async function assertVendorSupplier(associationId, role, supplierId) {
  if (role !== ROLES.VENDOR) return null;
  if (!supplierId) {
    const err = new Error('Vendor accounts require supplierId');
    err.status = 400;
    throw err;
  }
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      associationId,
      deletedAt: null,
    },
  });
  if (!supplier) {
    const err = new Error('Supplier not found for this association');
    err.status = 400;
    throw err;
  }
  return supplierId;
}

async function assertLastSuperadminSafe(existing, nextRole, nextActive) {
  const becomingNonSuper =
    existing.role === ROLES.SUPERADMIN &&
    (nextRole !== ROLES.SUPERADMIN || nextActive === false);
  if (!becomingNonSuper) return;
  const others = await countActiveSuperadmins(
    existing.associationId,
    existing.id
  );
  if (others < 1) {
    const err = new Error(
      'Cannot deactivate or demote the last active Superadmin'
    );
    err.status = 400;
    throw err;
  }
}

export function createIdentityApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'identity-service', strict: STRICT });
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await prisma.user.findFirst({
        where: {
          associationId: ASSOCIATION_ID,
          email: body.email.toLowerCase(),
        },
      });
      if (!user || !user.active) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const ok = await bcrypt.compare(body.password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const menuFeatures = await resolveMenuFeatures(
        user.associationId,
        user.role
      );
      const token = signToken({
        jwtSecret: JWT_SECRET,
        user: {
          id: user.id,
          role: user.role,
          associationId: user.associationId,
          name: user.name,
          email: user.email,
          supplierId: user.supplierId,
          menuFeatures,
        },
      });
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          supplierId: user.supplierId,
          associationId: user.associationId,
          menuFeatures,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.use(
    createAuthMiddleware({
      jwtSecret: JWT_SECRET,
      defaultAssociationId: ASSOCIATION_ID,
      strict: STRICT,
    })
  );

  app.get('/api/auth/me', async (req, res, next) => {
    try {
      const menuFeatures = await resolveMenuFeatures(
        req.user.associationId,
        req.user.role
      );
      res.json({
        user: {
          ...req.user,
          menuFeatures,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/auth/roles', requirePermission('users', 'view'), (_req, res) => {
    res.json({
      roles: ROLE_VALUES,
      labels: ROLE_LABELS,
      customizableRoles: CUSTOMIZABLE_ROLES,
      menuResources: MENU_FEATURE_RESOURCES,
    });
  });

  app.get(
    '/api/auth/role-menu-features',
    requirePermission('users', 'view'),
    async (req, res, next) => {
      try {
        const role = String(req.query.role || '');
        if (!CUSTOMIZABLE_ROLES.includes(role)) {
          return res.status(400).json({
            error: 'Role is not customizable for menu features',
          });
        }
        const features = await resolveMenuFeatures(
          req.user.associationId,
          role
        );
        const defaults = defaultMenuFeatures(role);
        res.json({
          role,
          features,
          defaults,
          resources: MENU_FEATURE_RESOURCES,
        });
      } catch (e) {
        next(e);
      }
    }
  );

  app.put(
    '/api/auth/role-menu-features',
    requirePermission('users', 'createEdit'),
    async (req, res, next) => {
      try {
        const body = z
          .object({
            role: z.enum([
              ROLES.SECURITY_HEAD,
              ROLES.ESTATE_MANAGER,
              ROLES.SECURITY_STAFF,
              ROLES.STAFF,
            ]),
            features: z.array(z.string()),
          })
          .parse(req.body);
        const allowed = new Set(
          MENU_FEATURE_RESOURCES.map((m) => m.resource)
        );
        const enabled = [
          ...new Set(body.features.filter((f) => allowed.has(f))),
        ];
        // Always keep Home available
        if (!enabled.includes('home')) enabled.unshift('home');

        await prisma.$transaction(async (tx) => {
          await tx.roleMenuAccess.deleteMany({
            where: {
              associationId: req.user.associationId,
              role: body.role,
            },
          });
          for (const resource of MENU_FEATURE_RESOURCES.map((m) => m.resource)) {
            await tx.roleMenuAccess.create({
              data: {
                associationId: req.user.associationId,
                role: body.role,
                resource,
                enabled: enabled.includes(resource),
              },
            });
          }
        });

        res.json({
          role: body.role,
          features: enabled,
        });
      } catch (e) {
        next(e);
      }
    }
  );

  app.get(
    '/api/auth/users',
    requirePermission('users', 'view'),
    async (req, res, next) => {
      try {
        const users = await prisma.user.findMany({
          where: { associationId: req.user.associationId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            supplierId: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        res.json(users);
      } catch (e) {
        next(e);
      }
    }
  );

  async function createUserHandler(req, res, next) {
    try {
      const body = userCreateSchema.parse(req.body);
      const supplierId = await assertVendorSupplier(
        req.user.associationId,
        body.role,
        body.supplierId
      );
      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await prisma.user.create({
        data: {
          associationId: req.user.associationId,
          email: body.email.toLowerCase(),
          passwordHash,
          name: body.name,
          role: body.role,
          supplierId: body.role === ROLES.VENDOR ? supplierId : null,
          active: body.active !== false,
        },
      });
      res.status(201).json(publicUser(user));
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      next(e);
    }
  }

  app.post(
    '/api/auth/users',
    requirePermission('users', 'createEdit'),
    createUserHandler
  );

  // Legacy alias — Superadmin only (same as create)
  app.post(
    '/api/auth/register',
    requirePermission('users', 'createEdit'),
    createUserHandler
  );

  app.patch(
    '/api/auth/users/:id',
    requirePermission('users', 'createEdit'),
    async (req, res, next) => {
      try {
        const body = userUpdateSchema.parse(req.body);
        const existing = await prisma.user.findFirst({
          where: {
            id: req.params.id,
            associationId: req.user.associationId,
          },
        });
        if (!existing) {
          return res.status(404).json({ error: 'User not found' });
        }

        const nextRole = body.role ?? existing.role;
        const nextActive =
          body.active === undefined ? existing.active : body.active;

        await assertLastSuperadminSafe(existing, nextRole, nextActive);

        let supplierId = existing.supplierId;
        if (body.role !== undefined || body.supplierId !== undefined) {
          supplierId = await assertVendorSupplier(
            req.user.associationId,
            nextRole,
            body.supplierId !== undefined
              ? body.supplierId
              : existing.supplierId
          );
          if (nextRole !== ROLES.VENDOR) supplierId = null;
        }

        const data = {
          ...(body.email ? { email: body.email.toLowerCase() } : {}),
          ...(body.name ? { name: body.name } : {}),
          ...(body.role ? { role: body.role } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
          ...(body.role !== undefined || body.supplierId !== undefined
            ? { supplierId }
            : {}),
        };
        if (body.password) {
          data.passwordHash = await bcrypt.hash(body.password, 10);
        }

        const user = await prisma.user.update({
          where: { id: existing.id },
          data,
        });
        res.json(publicUser(user));
      } catch (e) {
        if (e.code === 'P2002') {
          return res.status(409).json({ error: 'Email already registered' });
        }
        next(e);
      }
    }
  );

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error' });
  });

  return app;
}

import { pathToFileURL } from 'url';

const isDirect =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirect) {
  createIdentityApp().listen(PORT, () => {
    console.log(`identity-service listening on :${PORT}`);
  });
}
