const API_BASE =
  import.meta.env.VITE_API_BASE_URL || '/api/inventory';
const ASSOCIATION_BASE =
  import.meta.env.VITE_ASSOCIATION_BASE_URL || '/api/association';
const IDENTITY_BASE =
  import.meta.env.VITE_IDENTITY_BASE_URL || '/api/auth';
const UPLOAD_ORIGIN =
  import.meta.env.VITE_UPLOAD_ORIGIN ||
  (API_BASE.startsWith('http')
    ? API_BASE.replace(/\/api\/inventory\/?$/, '')
    : '');

const TOKEN_KEY = 'nhpaowa_token';
const USER_KEY = 'nhpaowa_user';
const ROLE_KEY = 'nhpaowa_role';

function getRole() {
  return (
    localStorage.getItem(ROLE_KEY) ||
    import.meta.env.VITE_DEV_ROLE ||
    'SECRETARY'
  );
}

export function setDevRole(role) {
  localStorage.setItem(ROLE_KEY, role);
  window.location.reload();
}

export function getDevRole() {
  return getRole();
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, user.role);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function redirectToLogin() {
  clearSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOAD_ORIGIN}${path}`;
}

function authHeaders() {
  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['X-Dev-Role'] = getRole();
    const user = getAuthUser();
    if (user?.supplierId) headers['X-Dev-Supplier-Id'] = user.supplierId;
  }
  return headers;
}

async function request(path, options = {}, base = API_BASE) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Authentication required');
  }
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || res.statusText);
  }
  return data;
}

function assocRequest(path, options = {}) {
  return request(path, options, ASSOCIATION_BASE);
}

async function downloadAssocCsv(path, filename) {
  const res = await fetch(`${ASSOCIATION_BASE}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      msg = JSON.parse(text)?.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function identityRequest(path, options = {}) {
  const res = await fetch(`${IDENTITY_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && path !== '/login') {
    redirectToLogin();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || res.statusText);
  }
  return data;
}

function reportPath(kind, { format, from, to } = {}) {
  const params = new URLSearchParams();
  if (format) params.set('format', format);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return `/reports/${kind}${qs ? `?${qs}` : ''}`;
}

export async function downloadReport(kind, opts = {}) {
  const path = reportPath(kind, opts);
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      msg = JSON.parse(text)?.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    opts.format === 'pdf'
      ? `${kind}.pdf`
      : opts.format === 'csv'
        ? `${kind}.csv`
        : `${kind}.bin`;
  a.click();
  URL.revokeObjectURL(url);
}

export function barcodeImageUrl(itemId) {
  return `${API_BASE}/barcodes/${itemId}.png`;
}

export const api = {
  me: () => request('/me'),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  auth: {
    login: (body) =>
      identityRequest('/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => identityRequest('/me'),
    roles: () => identityRequest('/roles'),
    roleMenuFeatures: (role) =>
      identityRequest(`/role-menu-features?role=${encodeURIComponent(role)}`),
    saveRoleMenuFeatures: (body) =>
      identityRequest('/role-menu-features', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    users: {
      list: () => identityRequest('/users'),
      create: (body) =>
        identityRequest('/users', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (id, body) =>
        identityRequest(`/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
    },
  },
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append('photo', file);
    return request('/uploads', { method: 'POST', body: fd });
  },
  categories: {
    list: () => request('/categories'),
    create: (body) =>
      request('/categories', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },
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
    create: (body) =>
      request('/items', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  },
  suppliers: {
    list: () => request('/suppliers'),
    create: (body) =>
      request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  },
  warehouses: {
    list: () => request('/warehouses'),
    stock: (id) => request(`/warehouses/${id}/stock`),
    create: (body) =>
      request('/warehouses', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/warehouses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
  barcodes: {
    lookup: (code) =>
      request(`/barcodes/lookup/${encodeURIComponent(code)}`),
  },
  vendor: {
    me: () => request('/vendor/me'),
    purchaseOrders: () => request('/vendor/purchase-orders'),
    purchaseOrder: (id) => request(`/vendor/purchase-orders/${id}`),
  },
  purchaseRequisitions: {
    list: () => request('/purchase-requisitions'),
    create: (body) =>
      request('/purchase-requisitions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    convert: (id, body = {}) =>
      request(`/purchase-requisitions/${id}/convert-to-po`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    cancel: (id) =>
      request(`/purchase-requisitions/${id}/cancel`, { method: 'POST' }),
  },
  purchaseOrders: {
    list: () => request('/purchase-orders'),
    get: (id) => request(`/purchase-orders/${id}`),
    create: (body) =>
      request('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    submit: (id) =>
      request(`/purchase-orders/${id}/submit`, { method: 'POST' }),
    approve: (id) =>
      request(`/purchase-orders/${id}/approve`, { method: 'POST' }),
    postApprove: (id) =>
      request(`/purchase-orders/${id}/post-approve`, { method: 'POST' }),
    markOrdered: (id) =>
      request(`/purchase-orders/${id}/mark-ordered`, { method: 'POST' }),
    receive: (id, body) =>
      request(`/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    cancel: (id) =>
      request(`/purchase-orders/${id}/cancel`, { method: 'POST' }),
    close: (id) => request(`/purchase-orders/${id}/close`, { method: 'POST' }),
  },
  amc: {
    list: () => request('/amc'),
    create: (body) =>
      request('/amc', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/amc/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    renew: (id, body) =>
      request(`/amc/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id) => request(`/amc/${id}`, { method: 'DELETE' }),
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
  dashboard: {
    summary: () => request('/dashboard/summary'),
    byCategory: () => request('/dashboard/stock-value-by-category'),
    topConsumed: () => request('/dashboard/top-consumed'),
    widgets: () => request('/dashboard/widgets'),
  },
  alerts: {
    list: (unread) => request(`/alerts${unread ? '?unread=true' : ''}`),
    markRead: (id) => request(`/alerts/${id}/read`, { method: 'PATCH' }),
  },
  reports: {
    valuation: (opts) =>
      opts?.format
        ? downloadReport('valuation', opts)
        : request(reportPath('valuation', opts)),
    consumption: (opts) =>
      opts?.format
        ? downloadReport('consumption', opts)
        : request(reportPath('consumption', opts)),
    supplierSpend: (opts) =>
      opts?.format
        ? downloadReport('supplier-spend', opts)
        : request(reportPath('supplier-spend', opts)),
  },
  settings: {
    get: () => request('/settings'),
    update: (body) =>
      request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  association: {
    catalog: () => assocRequest('/apartment-catalog'),
    flats: {
      list: async (params = {}) => {
        const qs = new URLSearchParams();
        if (typeof params === 'string') {
          if (params) qs.set('q', params);
          qs.set('limit', '40');
        } else {
          Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            qs.set(key, String(value));
          });
          if (!qs.has('limit') && params.limit !== 0) {
            qs.set('limit', String(params.limit ?? 50));
          }
        }
        const s = qs.toString();
        const data = await assocRequest(`/flats${s ? `?${s}` : ''}`);
        if (Array.isArray(data)) {
          return {
            items: data,
            total: data.length,
            limit: data.length,
            offset: 0,
          };
        }
        return data;
      },
      create: (body) =>
        assocRequest('/flats', { method: 'POST', body: JSON.stringify(body) }),
      update: (id, body) =>
        assocRequest(`/flats/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      remove: (id) => assocRequest(`/flats/${id}`, { method: 'DELETE' }),
      addMember: (id, body) =>
        assocRequest(`/flats/${id}/members`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      removeMember: (id) =>
        assocRequest(`/members/${id}`, { method: 'DELETE' }),
      exportCsv: () => downloadAssocCsv('/flats/export.csv', 'flats.csv'),
      exportPdf: (params = {}) => {
        const qs = new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(
              ([, v]) => v != null && String(v).trim() !== ''
            )
          )
        ).toString();
        const kind = params.kind === 'register' ? 'register' : 'verification';
        return downloadAssocCsv(
          `/flats/export.pdf${qs ? `?${qs}` : ''}`,
          `flats-${kind === 'register' ? 'master-register' : 'verification-sheet'}.pdf`
        );
      },
      csvTemplate: () =>
        downloadAssocCsv(
          '/flats/csv-template',
          'flats-household-template.csv'
        ),
      csvGuide: () => assocRequest('/flats/csv-guide'),
      importCsv: (payload) =>
        assocRequest('/flats/import-csv', {
          method: 'POST',
          body: JSON.stringify(
            typeof payload === 'string' ? { csv: payload } : payload
          ),
        }),
      collectionSummary: () => request('/flats/collection-summary'),
      downloadUpdateLinksCsv: async (baseUrl) => {
        const qs = baseUrl
          ? `?baseUrl=${encodeURIComponent(baseUrl)}`
          : '';
        const res = await fetch(`${API_BASE}/flats/update-links.csv${qs}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flat-update-links.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      uploadParkingLetter: async (flatId, file) => {
        const fd = new FormData();
        fd.append('file', file);
        const headers = authHeaders();
        delete headers['Content-Type'];
        const res = await fetch(
          `${ASSOCIATION_BASE}/flats/${flatId}/parking-letter`,
          { method: 'POST', headers, body: fd }
        );
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || res.statusText);
        return data;
      },
      clearParkingLetter: (flatId) =>
        assocRequest(`/flats/${flatId}/parking-letter`, { method: 'DELETE' }),
    },
    parkingSlots: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/parking-slots${qs ? `?${qs}` : ''}`);
      },
      create: (body) =>
        assocRequest('/parking-slots', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (id, body) =>
        assocRequest(`/parking-slots/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      remove: (id) =>
        assocRequest(`/parking-slots/${id}`, { method: 'DELETE' }),
      uploadLetter: async (id, file) => {
        const fd = new FormData();
        fd.append('file', file);
        const headers = authHeaders();
        delete headers['Content-Type'];
        const res = await fetch(
          `${ASSOCIATION_BASE}/parking-slots/${id}/letter`,
          { method: 'POST', headers, body: fd }
        );
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || res.statusText);
        return data;
      },
      clearLetter: (id) =>
        assocRequest(`/parking-slots/${id}/letter`, { method: 'DELETE' }),
    },
    household: {
      vehicles: (flatId, includePending = false) =>
        assocRequest(
          `/flats/${flatId}/vehicles${includePending ? '?includePending=true' : ''}`
        ),
      createVehicle: (flatId, body) =>
        assocRequest(`/flats/${flatId}/vehicles`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      updateVehicle: (id, body) =>
        assocRequest(`/vehicles/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      removeVehicle: (id) =>
        assocRequest(`/vehicles/${id}`, { method: 'DELETE' }),
      uploadVehicleRc: async (id, file) => {
        const fd = new FormData();
        fd.append('file', file);
        const headers = authHeaders();
        delete headers['Content-Type'];
        const res = await fetch(`${ASSOCIATION_BASE}/vehicles/${id}/rc`, {
          method: 'POST',
          headers,
          body: fd,
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || res.statusText);
        return data;
      },
      approveVehicle: (id) =>
        assocRequest(`/vehicles/${id}/approve`, { method: 'POST' }),
      rejectVehicle: (id, reason) =>
        assocRequest(`/vehicles/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      pets: (flatId, includePending = false) =>
        assocRequest(
          `/flats/${flatId}/pets${includePending ? '?includePending=true' : ''}`
        ),
      createPet: (flatId, body) =>
        assocRequest(`/flats/${flatId}/pets`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      removePet: (id) => assocRequest(`/pets/${id}`, { method: 'DELETE' }),
      updatePet: (id, body) =>
        assocRequest(`/pets/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      approvePet: (id) =>
        assocRequest(`/pets/${id}/approve`, { method: 'POST' }),
      rejectPet: (id, reason) =>
        assocRequest(`/pets/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      emergencyContacts: (flatId, includePending = false) =>
        assocRequest(
          `/flats/${flatId}/emergency-contacts${includePending ? '?includePending=true' : ''}`
        ),
      createEmergencyContact: (flatId, body) =>
        assocRequest(`/flats/${flatId}/emergency-contacts`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      updateEmergencyContact: (id, body) =>
        assocRequest(`/emergency-contacts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      removeEmergencyContact: (id) =>
        assocRequest(`/emergency-contacts/${id}`, { method: 'DELETE' }),
      approveEmergencyContact: (id) =>
        assocRequest(`/emergency-contacts/${id}/approve`, { method: 'POST' }),
      rejectEmergencyContact: (id, reason) =>
        assocRequest(`/emergency-contacts/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      accessDevices: (flatId, includePending = false) =>
        assocRequest(
          `/flats/${flatId}/access-devices${includePending ? '?includePending=true' : ''}`
        ),
      createAccessDevice: (flatId, body) =>
        assocRequest(`/flats/${flatId}/access-devices`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      updateAccessDevice: (id, body) =>
        assocRequest(`/access-devices/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      removeAccessDevice: (id) =>
        assocRequest(`/access-devices/${id}`, { method: 'DELETE' }),
      approveAccessDevice: (id) =>
        assocRequest(`/access-devices/${id}/approve`, { method: 'POST' }),
      rejectAccessDevice: (id, reason) =>
        assocRequest(`/access-devices/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      pending: (flatId) =>
        assocRequest(`/flats/${flatId}/household-pending`),
      pendingAll: () => assocRequest('/household-pending'),
    },
    flatSelfUpdates: {
      list: (status = 'PENDING') =>
        request(`/flat-self-updates?status=${encodeURIComponent(status)}`),
      approve: (id) =>
        request(`/flat-self-updates/${id}/approve`, { method: 'POST' }),
      reject: (id, reason) =>
        request(`/flat-self-updates/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
    },
    noc: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/noc${qs ? `?${qs}` : ''}`);
      },
      create: (body) =>
        assocRequest('/noc', { method: 'POST', body: JSON.stringify(body) }),
      issue: (id, body) =>
        assocRequest(`/noc/${id}/issue`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      reject: (id, body) =>
        assocRequest(`/noc/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      cancel: (id, body) =>
        assocRequest(`/noc/${id}/cancel`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      uploadAttachment: async (id, file, label) => {
        const fd = new FormData();
        fd.append('file', file);
        if (label) fd.append('label', label);
        const headers = authHeaders();
        delete headers['Content-Type'];
        const res = await fetch(`${ASSOCIATION_BASE}/noc/${id}/attachments`, {
          method: 'POST',
          headers,
          body: fd,
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || res.statusText);
        return data;
      },
      removeAttachment: (id, attachmentId) =>
        assocRequest(`/noc/${id}/attachments/${attachmentId}`, {
          method: 'DELETE',
        }),
    },
    staff: {
      list: (activeOnly) =>
        assocRequest(`/staff${activeOnly ? '?activeOnly=true' : ''}`),
      categories: {
        list: (includeInactive = false) =>
          assocRequest(
            `/staff/categories${includeInactive ? '?includeInactive=true' : ''}`
          ),
        create: (body) =>
          assocRequest('/staff/categories', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        update: (id, body) =>
          assocRequest(`/staff/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }),
        remove: (id) =>
          assocRequest(`/staff/categories/${id}`, { method: 'DELETE' }),
      },
      create: (body) =>
        assocRequest('/staff', { method: 'POST', body: JSON.stringify(body) }),
      update: (id, body) =>
        assocRequest(`/staff/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      uploadPhoto: async (file) => {
        const fd = new FormData();
        fd.append('photo', file);
        return assocRequest('/staff/photo', { method: 'POST', body: fd });
      },
      downloadTemplate: () =>
        downloadAssocCsv('/staff/csv-template', 'staff-template.csv'),
      importCsv: (csv) =>
        assocRequest('/staff/import-csv', {
          method: 'POST',
          body: JSON.stringify({ csv }),
        }),
    },
    attendance: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/attendance${qs ? `?${qs}` : ''}`);
      },
      summary: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/attendance/summary${qs ? `?${qs}` : ''}`);
      },
      history: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/attendance/history${qs ? `?${qs}` : ''}`);
      },
      checkIn: (body) =>
        assocRequest('/attendance/check-in', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      checkOut: (id, body) =>
        assocRequest(`/attendance/${id}/check-out`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      dayState: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/attendance/day-state${qs ? `?${qs}` : ''}`);
      },
      markAbsent: (body) =>
        assocRequest('/attendance/mark-absent', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      clearAbsent: (body) =>
        assocRequest('/attendance/clear-absent', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      exportCsv: (params = {}) => {
        const qs = new URLSearchParams({ ...params, format: 'csv' }).toString();
        return downloadAssocCsv(`/attendance?${qs}`, 'attendance.csv');
      },
      exportPayrollCsv: (params = {}) => {
        const qs = new URLSearchParams({
          ...params,
          format: 'csv',
          mode: 'payroll',
        }).toString();
        return downloadAssocCsv(`/attendance?${qs}`, 'attendance-payroll.csv');
      },
    },
    leave: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/leave${qs ? `?${qs}` : ''}`);
      },
      create: (body) =>
        assocRequest('/leave', { method: 'POST', body: JSON.stringify(body) }),
      cancel: (id) =>
        assocRequest(`/leave/${id}/cancel`, { method: 'POST' }),
    },
    moves: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/moves${qs ? `?${qs}` : ''}`);
      },
      get: (id) => assocRequest(`/moves/${id}`),
      create: (body) =>
        assocRequest('/moves', { method: 'POST', body: JSON.stringify(body) }),
      approve: (id) =>
        assocRequest(`/moves/${id}/approve`, { method: 'POST' }),
      reject: (id, body) =>
        assocRequest(`/moves/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      start: (id) => assocRequest(`/moves/${id}/start`, { method: 'POST' }),
      cancel: (id, body) =>
        assocRequest(`/moves/${id}/cancel`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      complete: (id, body) =>
        assocRequest(`/moves/${id}/complete`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      downloadPdf: (id, filename = 'move-authorization.pdf') =>
        downloadAssocCsv(`/moves/${id}/pdf`, filename),
      uploadAttachment: async (id, file, label) => {
        const fd = new FormData();
        fd.append('file', file);
        if (label) fd.append('label', label);
        const headers = authHeaders();
        delete headers['Content-Type'];
        const res = await fetch(`${ASSOCIATION_BASE}/moves/${id}/attachments`, {
          method: 'POST',
          headers,
          body: fd,
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.error || res.statusText);
        return data;
      },
      removeAttachment: (id, attachmentId) =>
        assocRequest(`/moves/${id}/attachments/${attachmentId}`, {
          method: 'DELETE',
        }),
    },
    notices: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return assocRequest(`/notices${qs ? `?${qs}` : ''}`);
      },
      get: (id) => assocRequest(`/notices/${id}`),
      create: (body) =>
        assocRequest('/notices', { method: 'POST', body: JSON.stringify(body) }),
      update: (id, body) =>
        assocRequest(`/notices/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      publish: (id, body) =>
        assocRequest(`/notices/${id}/publish`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      unpublish: (id, body) =>
        assocRequest(`/notices/${id}/unpublish`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      archive: (id, body) =>
        assocRequest(`/notices/${id}/archive`, {
          method: 'POST',
          body: JSON.stringify(body || {}),
        }),
      downloadPdf: (id, filename = 'notice.pdf') =>
        downloadAssocCsv(`/notices/${id}/pdf`, filename),
    },
    board: {
      letterhead: () => assocRequest('/board/letterhead-public'),
      roles: {
        list: (includeInactive = false) =>
          assocRequest(
            `/board/roles${includeInactive ? '?includeInactive=true' : ''}`
          ),
        create: (body) =>
          assocRequest('/board/roles', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        update: (id, body) =>
          assocRequest(`/board/roles/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }),
        remove: (id) =>
          assocRequest(`/board/roles/${id}`, { method: 'DELETE' }),
      },
      members: {
        list: (params = {}) => {
          const qs = new URLSearchParams(params).toString();
          return assocRequest(`/board/members${qs ? `?${qs}` : ''}`);
        },
        create: (body) =>
          assocRequest('/board/members', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
        update: (id, body) =>
          assocRequest(`/board/members/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }),
        remove: (id) =>
          assocRequest(`/board/members/${id}`, { method: 'DELETE' }),
      },
    },
  },
};
