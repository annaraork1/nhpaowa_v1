import { can } from './permissions.js';

/** Conditionally render children when role may perform action on resource */
export function Can({ resource, action, children, fallback = null }) {
  if (!can(resource, action)) return fallback;
  return children;
}
