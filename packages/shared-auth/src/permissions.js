export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  SECRETARY: 'SECRETARY',
  TREASURER: 'TREASURER',
  COMMITTEE: 'COMMITTEE',
  STAFF: 'STAFF',
  SECURITY_HEAD: 'SECURITY_HEAD',
  ESTATE_MANAGER: 'ESTATE_MANAGER',
  SECURITY_STAFF: 'SECURITY_STAFF',
  RESIDENT: 'RESIDENT',
  VENDOR: 'VENDOR',
};

/** Roles whose left-nav features Superadmin can toggle. */
export const CUSTOMIZABLE_ROLES = [
  ROLES.SECURITY_HEAD,
  ROLES.ESTATE_MANAGER,
  ROLES.SECURITY_STAFF,
  ROLES.STAFF,
];

export const ROLE_LABELS = {
  SUPERADMIN: 'Superadmin',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
  COMMITTEE: 'Committee',
  STAFF: 'Staff',
  SECURITY_HEAD: 'Security Head',
  ESTATE_MANAGER: 'Estate Manager',
  SECURITY_STAFF: 'Security Staff',
  RESIDENT: 'Resident',
  VENDOR: 'Vendor',
};

/** Nav / home-card resources Superadmin can assign (view). */
export const MENU_FEATURE_RESOURCES = [
  { resource: 'home', label: 'Home' },
  { resource: 'dashboard', label: 'Dashboard' },
  { resource: 'flatOwners', label: 'Flat owners' },
  { resource: 'noc', label: 'NOC' },
  { resource: 'notices', label: 'Notices' },
  { resource: 'board', label: 'Board' },
  { resource: 'attendance', label: 'Attendance' },
  { resource: 'schoolBus', label: 'Bus gate' },
  { resource: 'schoolBusAdmin', label: 'School bus admin' },
  { resource: 'moves', label: 'Moves' },
  { resource: 'items', label: 'Items' },
  { resource: 'categories', label: 'Categories' },
  { resource: 'suppliers', label: 'Suppliers' },
  { resource: 'warehouses', label: 'Warehouses' },
  { resource: 'barcodes', label: 'Barcodes' },
  { resource: 'purchaseOrders', label: 'Purchase Orders' },
  { resource: 'purchaseRequisitions', label: 'Requisitions' },
  { resource: 'stock', label: 'Stock' },
  { resource: 'amc', label: 'AMC Contracts' },
  { resource: 'reports', label: 'Reports' },
  { resource: 'settings', label: 'Settings' },
];

const NONE = [];
const VIEW = ['view'];
const VIEW_EDIT = ['view', 'createEdit'];
const VIEW_EDIT_DEL = ['view', 'createEdit', 'delete'];

/**
 * Resource → role → actions
 * Specs: 002, 004, 014, 025-ops-roles-home-ux
 */
export const PERMISSIONS = {
  items: {
    [ROLES.SUPERADMIN]: VIEW_EDIT_DEL,
    [ROLES.SECRETARY]: VIEW_EDIT_DEL,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  categories: {
    [ROLES.SUPERADMIN]: VIEW_EDIT_DEL,
    [ROLES.SECRETARY]: VIEW_EDIT_DEL,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  suppliers: {
    [ROLES.SUPERADMIN]: VIEW_EDIT_DEL,
    [ROLES.SECRETARY]: VIEW_EDIT_DEL,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  warehouses: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  stock: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW_EDIT,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW_EDIT,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  purchaseOrders: {
    [ROLES.SUPERADMIN]: ['view', 'createEdit', 'approve'],
    [ROLES.SECRETARY]: ['view', 'createEdit', 'approve'],
    [ROLES.TREASURER]: ['view', 'createEdit', 'approve'],
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW_EDIT,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  purchaseRequisitions: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW_EDIT,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW_EDIT,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  amc: {
    [ROLES.SUPERADMIN]: VIEW_EDIT_DEL,
    [ROLES.SECRETARY]: VIEW_EDIT_DEL,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  reports: {
    [ROLES.SUPERADMIN]: VIEW,
    [ROLES.SECRETARY]: VIEW,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  settings: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  vendor: {
    [ROLES.SUPERADMIN]: NONE,
    [ROLES.SECRETARY]: NONE,
    [ROLES.TREASURER]: NONE,
    [ROLES.COMMITTEE]: NONE,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: VIEW,
  },
  barcodes: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW_EDIT,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  dashboard: {
    [ROLES.SUPERADMIN]: VIEW,
    [ROLES.SECRETARY]: VIEW,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  home: {
    [ROLES.SUPERADMIN]: VIEW,
    [ROLES.SECRETARY]: VIEW,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: VIEW,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: VIEW,
    [ROLES.RESIDENT]: VIEW,
    [ROLES.VENDOR]: NONE,
  },
  alerts: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW_EDIT,
    [ROLES.COMMITTEE]: VIEW_EDIT,
    [ROLES.STAFF]: VIEW_EDIT,
    [ROLES.SECURITY_HEAD]: VIEW,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: VIEW,
    [ROLES.RESIDENT]: VIEW,
    [ROLES.VENDOR]: NONE,
  },
  users: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: NONE,
    [ROLES.TREASURER]: NONE,
    [ROLES.COMMITTEE]: NONE,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: NONE,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  flatOwners: {
    [ROLES.SUPERADMIN]: VIEW_EDIT_DEL,
    [ROLES.SECRETARY]: VIEW_EDIT_DEL,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: VIEW,
    [ROLES.ESTATE_MANAGER]: VIEW_EDIT,
    [ROLES.SECURITY_STAFF]: VIEW,
    [ROLES.RESIDENT]: VIEW_EDIT,
    [ROLES.VENDOR]: NONE,
  },
  noc: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW_EDIT,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: VIEW,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: VIEW_EDIT,
    [ROLES.VENDOR]: NONE,
  },
  attendance: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW_EDIT,
    [ROLES.SECURITY_HEAD]: VIEW_EDIT,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: VIEW_EDIT,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  schoolBus: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: VIEW_EDIT,
    [ROLES.ESTATE_MANAGER]: VIEW_EDIT,
    [ROLES.SECURITY_STAFF]: VIEW_EDIT,
    [ROLES.RESIDENT]: VIEW,
    [ROLES.VENDOR]: NONE,
  },
  /** Schools, buses, batches, slots, registry CSV/PDF — not Security Staff */
  schoolBusAdmin: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: NONE,
    [ROLES.COMMITTEE]: NONE,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: VIEW_EDIT,
    [ROLES.ESTATE_MANAGER]: VIEW_EDIT,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
  moves: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: VIEW,
    [ROLES.SECURITY_HEAD]: VIEW_EDIT,
    [ROLES.ESTATE_MANAGER]: VIEW_EDIT,
    [ROLES.SECURITY_STAFF]: VIEW_EDIT,
    [ROLES.RESIDENT]: VIEW_EDIT,
    [ROLES.VENDOR]: NONE,
  },
  notices: {
    [ROLES.SUPERADMIN]: VIEW_EDIT,
    [ROLES.SECRETARY]: VIEW_EDIT,
    [ROLES.TREASURER]: VIEW,
    [ROLES.COMMITTEE]: VIEW,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: VIEW,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: VIEW,
    [ROLES.VENDOR]: NONE,
  },
  board: {
    [ROLES.SUPERADMIN]: VIEW_EDIT_DEL,
    [ROLES.SECRETARY]: VIEW,
    [ROLES.TREASURER]: NONE,
    [ROLES.COMMITTEE]: NONE,
    [ROLES.STAFF]: NONE,
    [ROLES.SECURITY_HEAD]: NONE,
    [ROLES.ESTATE_MANAGER]: VIEW,
    [ROLES.SECURITY_STAFF]: NONE,
    [ROLES.RESIDENT]: NONE,
    [ROLES.VENDOR]: NONE,
  },
};

/** Default menu feature resources (view) from the matrix. */
export function defaultMenuFeatures(role) {
  return MENU_FEATURE_RESOURCES.map((m) => m.resource).filter((resource) =>
    can(role, resource, 'view')
  );
}

export function can(role, resource, action) {
  const row = PERMISSIONS[resource];
  if (!row) return false;
  const actions = row[role] || [];
  return actions.includes(action);
}

/**
 * View check with optional menu-feature override list (from RoleMenuAccess).
 * If `menuFeatures` is a non-empty array for a customizable role, it gates view.
 */
export function canWithMenuFeatures(role, resource, action, menuFeatures) {
  if (
    action === 'view' &&
    CUSTOMIZABLE_ROLES.includes(role) &&
    Array.isArray(menuFeatures) &&
    menuFeatures.length > 0
  ) {
    return menuFeatures.includes(resource);
  }
  return can(role, resource, action);
}

export function requirePermission(resource, action) {
  return function permissionGuard(req, res, next) {
    const features = req.user?.menuFeatures;
    const ok = canWithMenuFeatures(
      req.user?.role,
      resource,
      action,
      features
    );
    if (!ok) {
      return res.status(403).json({
        error: `Forbidden: ${action} ${resource}`,
      });
    }
    return next();
  };
}
