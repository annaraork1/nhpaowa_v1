import {
  can as sharedCan,
  canWithMenuFeatures,
  PERMISSIONS,
  ROLES,
  CUSTOMIZABLE_ROLES,
  MENU_FEATURE_RESOURCES,
  ROLE_LABELS,
  defaultMenuFeatures,
} from '@nhpaowa/shared-auth/permissions';
import { getAuthUser, getDevRole, getToken } from '../api/client.js';

export {
  PERMISSIONS,
  ROLES,
  CUSTOMIZABLE_ROLES,
  MENU_FEATURE_RESOURCES,
  ROLE_LABELS,
  defaultMenuFeatures,
};

export function currentRole() {
  const user = getAuthUser();
  if (getToken() && user?.role) return user.role;
  return getDevRole();
}

export function currentMenuFeatures() {
  const user = getAuthUser();
  return user?.menuFeatures || null;
}

export function can(resource, action) {
  return canWithMenuFeatures(
    currentRole(),
    resource,
    action,
    currentMenuFeatures()
  );
}

export function canAny(checks) {
  return checks.some(([resource, action]) => can(resource, action));
}

// keep sharedCan available for rare direct matrix checks
export { sharedCan };
