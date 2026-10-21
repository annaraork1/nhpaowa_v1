import { getToken, getDevRole, getAuthUser } from '../inventory/api/client.js';

const BUS_BASE = import.meta.env.VITE_BUS_BASE_URL || '/api/bus';

function authHeaders() {
  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['X-Dev-Role'] = getDevRole();
    const user = getAuthUser();
    if (user?.supplierId) headers['X-Dev-Supplier-Id'] = user.supplierId;
  }
  return headers;
}

async function busRequest(path, options = {}) {
  const res = await fetch(`${BUS_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

async function downloadFile(path, filename) {
  const res = await fetch(`${BUS_BASE}${path}`, { headers: authHeaders() });
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

export const busApi = {
  schools: {
    list: (activeOnly = false) =>
      busRequest(`/schools${activeOnly ? '?activeOnly=true' : ''}`),
    create: (body) =>
      busRequest('/schools', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      busRequest(`/schools/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    exportCsv: () => downloadFile('/schools/export.csv', 'schools-export.csv'),
    csvTemplate: () =>
      downloadFile('/schools/csv-template', 'schools-template.csv'),
    importCsv: (csv) =>
      busRequest('/schools/import', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      }),
  },
  buses: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return busRequest(`/buses${qs ? `?${qs}` : ''}`);
    },
    create: (body) =>
      busRequest('/buses', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      busRequest(`/buses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    exportCsv: () => downloadFile('/buses/export.csv', 'buses-export.csv'),
    csvTemplate: () =>
      downloadFile('/buses/csv-template', 'buses-template.csv'),
    importCsv: (csv) =>
      busRequest('/buses/import', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      }),
  },
  registry: {
    exportPdf: () =>
      downloadFile('/registry/export.pdf', 'schools-buses-registry.pdf'),
  },
  batches: {
    list: (direction) =>
      busRequest(
        `/batches${direction ? `?direction=${encodeURIComponent(direction)}` : ''}`
      ),
    create: (body) =>
      busRequest('/batches', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      busRequest(`/batches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
  slots: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return busRequest(`/slots${qs ? `?${qs}` : ''}`);
    },
    create: (body) =>
      busRequest('/slots', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      busRequest(`/slots/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id) => busRequest(`/slots/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => busRequest('/settings'),
    update: (body) =>
      busRequest('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  gate: {
    today: (direction) =>
      busRequest(`/gate/today?direction=${encodeURIComponent(direction)}`),
    live: () => busRequest('/gate/live'),
    checkIn: (body) =>
      busRequest('/trips/in', { method: 'POST', body: JSON.stringify(body) }),
    checkOut: (id, body = {}) =>
      busRequest(`/trips/${id}/out`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  resident: {
    today: () => busRequest('/resident/today'),
  },
  reports: {
    dailyTrips: (date) =>
      busRequest(`/reports/daily-trips?date=${encodeURIComponent(date)}`),
    dailyTripsCsv: (date) =>
      downloadFile(
        `/reports/daily-trips?date=${date}&format=csv`,
        `bus-daily-trips-${date}.csv`
      ),
    dailyTripsPdf: (date) =>
      downloadFile(
        `/reports/daily-trips?date=${date}&format=pdf`,
        `bus-daily-trips-${date}.pdf`
      ),
    reconciliationCsv: (date) =>
      downloadFile(
        `/reports/reconciliation?date=${date}&format=csv`,
        `bus-reconciliation-${date}.csv`
      ),
    waitTimesCsv: (date) =>
      downloadFile(
        `/reports/wait-times?date=${date}&format=csv`,
        `bus-wait-times-${date}.csv`
      ),
    congestionCsv: (date) =>
      downloadFile(
        `/reports/congestion?date=${date}&format=csv`,
        `bus-congestion-${date}.csv`
      ),
  },
};
