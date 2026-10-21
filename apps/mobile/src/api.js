import { Platform } from 'react-native';

function defaultHost() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4001/api/inventory';
  return 'http://localhost:4001/api/inventory';
}

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultHost();

let currentRole = 'STAFF';

export function setRole(role) {
  currentRole = role;
}

export function getRole() {
  return currentRole;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-Role': currentRole,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || res.statusText || 'Request failed');
  }
  return data;
}

export const api = {
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  items: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          qs.set(k, String(v).trim());
        }
      });
      const q = qs.toString();
      return request(`/items${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`/items/${id}`),
  },
  stock: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          qs.set(k, String(v).trim());
        }
      });
      const q = qs.toString();
      return request(`/stock-transactions${q ? `?${q}` : ''}`);
    },
    create: (body) =>
      request('/stock-transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  alerts: {
    list: (unread = false) =>
      request(`/alerts${unread ? '?unread=true' : ''}`),
    markRead: (id) => request(`/alerts/${id}/read`, { method: 'PATCH' }),
  },
};
