import jwt from 'jsonwebtoken';
import {
  ROLES,
  PERMISSIONS,
  can,
  canWithMenuFeatures,
  requirePermission,
  CUSTOMIZABLE_ROLES,
  MENU_FEATURE_RESOURCES,
  ROLE_LABELS,
  defaultMenuFeatures,
} from './permissions.js';

export {
  ROLES,
  PERMISSIONS,
  can,
  canWithMenuFeatures,
  requirePermission,
  CUSTOMIZABLE_ROLES,
  MENU_FEATURE_RESOURCES,
  ROLE_LABELS,
  defaultMenuFeatures,
};

export const WRITE_ROLES = new Set([
  ROLES.SUPERADMIN,
  ROLES.SECRETARY,
  ROLES.TREASURER,
  ROLES.COMMITTEE,
  ROLES.STAFF,
  ROLES.SECURITY_HEAD,
  ROLES.ESTATE_MANAGER,
  ROLES.SECURITY_STAFF,
]);

export const APPROVER_ROLES = new Set([
  ROLES.SUPERADMIN,
  ROLES.SECRETARY,
  ROLES.TREASURER,
]);

export function signToken({ jwtSecret, user, expiresIn = '7d' }) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      association_id: user.associationId,
      name: user.name,
      email: user.email,
      supplier_id: user.supplierId || null,
      menu_features: user.menuFeatures || null,
    },
    jwtSecret,
    { expiresIn }
  );
}

export function createAuthMiddleware({
  jwtSecret,
  defaultAssociationId,
  strict = false,
}) {
  return function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.slice(7), jwtSecret);
        req.user = {
          id: payload.sub || payload.id,
          role: payload.role,
          associationId: payload.association_id || payload.associationId,
          name: payload.name || 'User',
          email: payload.email,
          supplierId: payload.supplier_id || payload.supplierId || null,
          menuFeatures: payload.menu_features || payload.menuFeatures || null,
        };
        return next();
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    if (strict) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const role = String(
      req.headers['x-dev-role'] || ROLES.SECRETARY
    ).toUpperCase();
    req.user = {
      id: req.headers['x-dev-user-id'] || '00000000-0000-4000-8000-000000000010',
      role: Object.values(ROLES).includes(role) ? role : ROLES.SECRETARY,
      associationId:
        req.headers['x-dev-association-id'] || defaultAssociationId,
      name: req.headers['x-dev-user-name'] || 'Dev User',
      email: req.headers['x-dev-email'] || 'dev@nhpaowa.local',
      supplierId: req.headers['x-dev-supplier-id'] || null,
      menuFeatures: null,
    };
    return next();
  };
}

export function requireRoles(...allowed) {
  const set = new Set(allowed);
  return function roleGuard(req, res, next) {
    if (!req.user?.role || !set.has(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }
    return next();
  };
}

/** @deprecated Prefer requirePermission(resource, 'createEdit') */
export function requireWriteAccess(req, res, next) {
  if (!WRITE_ROLES.has(req.user?.role)) {
    return res.status(403).json({ error: 'Write access denied for this role' });
  }
  return next();
}

export function requireApprover(req, res, next) {
  if (!APPROVER_ROLES.has(req.user?.role)) {
    return res.status(403).json({
      error: 'PO approval requires Secretary or Treasurer',
    });
  }
  return next();
}

export function requireVendor(req, res, next) {
  if (req.user?.role !== ROLES.VENDOR || !req.user?.supplierId) {
    return res.status(403).json({ error: 'Vendor access only' });
  }
  return next();
}

/** @deprecated use signToken */
export function signDevToken(opts) {
  return signToken(opts);
}
