// Thin fetch wrapper.
//
//   Dev:    Vite proxies /api → http://localhost:4000 (no env var needed).
//   Prod:   set VITE_API_BASE in the Vercel project to your Render URL
//           (e.g. https://patron-abc123.onrender.com) to call the backend
//           directly. Leave it unset and use the vercel.json /api rewrite
//           instead — fine for normal requests but the SSE stream in
//           lib/events.js works better with a direct connection.
const API_BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/$/, '');

function url(path) {
  return path.startsWith('http') ? path : API_BASE + path;
}

async function request(path, options = {}) {
  const res = await fetch(url(path), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // generic helpers
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),

  // resources
  categories: () => request('/api/categories'),
  saveCategory: (c) => (c._id ? request(`/api/categories/${c._id}`, { method: 'PUT', body: c }) : request('/api/categories', { method: 'POST', body: c })),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  items: () => request('/api/items'),
  saveItem: (it) => (it._id ? request(`/api/items/${it._id}`, { method: 'PUT', body: it }) : request('/api/items', { method: 'POST', body: it })),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),

  stock: () => request('/api/stock'),
  saveStock: (s) => (s._id ? request(`/api/stock/${s._id}`, { method: 'PUT', body: s }) : request('/api/stock', { method: 'POST', body: s })),
  adjustStock: (id, delta) => request(`/api/stock/${id}/adjust`, { method: 'POST', body: { delta } }),
  deleteStock: (id) => request(`/api/stock/${id}`, { method: 'DELETE' }),

  rooms: () => request('/api/rooms'),
  saveRoom: (r) => (r._id ? request(`/api/rooms/${r._id}`, { method: 'PUT', body: r }) : request('/api/rooms', { method: 'POST', body: r })),
  deleteRoom: (id) => request(`/api/rooms/${id}`, { method: 'DELETE' }),

  tables: () => request('/api/tables'),
  saveTable: (t) => (t._id ? request(`/api/tables/${t._id}`, { method: 'PUT', body: t }) : request('/api/tables', { method: 'POST', body: t })),
  deleteTable: (id) => request(`/api/tables/${id}`, { method: 'DELETE' }),
  bulkPositionTables: (updates) => request('/api/tables/bulk-position', { method: 'POST', body: { updates } }),
  freeTable: (id) => request(`/api/tables/${id}/free`, { method: 'POST' }),

  orders: (q = '') => request('/api/orders' + (q ? `?${q}` : '')),
  order: (id) => request(`/api/orders/${id}`),
  newOrder: (table, waiter) => request('/api/orders', { method: 'POST', body: { table, waiter } }),
  addLine: (id, itemId, qty = 1, note = '', modifiers = []) =>
    request(`/api/orders/${id}/lines`, {
      method: 'POST',
      body: { itemId, qty, note, modifiers },
    }),
  updateLine: (id, lineId, patch) =>
    request(`/api/orders/${id}/lines/${lineId}`, { method: 'PATCH', body: patch }),
  sendOrder: (id) => request(`/api/orders/${id}/send`, { method: 'POST' }),
  payOrder: (id, paymentMethod, tip = 0) => request(`/api/orders/${id}/pay`, { method: 'POST', body: { paymentMethod, tip } }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: 'POST' }),
  kitchenQueue: () => request('/api/orders/kitchen/queue'),
  barQueue: () => request('/api/orders/bar/queue'),

  staff: () => request('/api/staff'),
  saveStaff: (s) => (s._id ? request(`/api/staff/${s._id}`, { method: 'PUT', body: s }) : request('/api/staff', { method: 'POST', body: s })),
  deleteStaff: (id) => request(`/api/staff/${id}`, { method: 'DELETE' }),

  shifts: (q = '') => request('/api/shifts' + (q ? `?${q}` : '')),
  clockIn: (staff) => request('/api/shifts', { method: 'POST', body: { staff } }),
  clockOut: (id) => request(`/api/shifts/${id}/clock-out`, { method: 'PATCH' }),
  deleteShift: (id) => request(`/api/shifts/${id}`, { method: 'DELETE' }),
  payroll: (from, to) => request(`/api/shifts/payroll/summary?from=${from}&to=${to}`),

  pnl: (range) => request(`/api/reports/pnl?range=${range}`),
  topItems: (range) => request(`/api/reports/top-items?range=${range}`),

  reservations: (q = '') => request('/api/reservations' + (q ? `?${q}` : '')),
  saveReservation: (r) => (r._id
    ? request(`/api/reservations/${r._id}`, { method: 'PATCH', body: r })
    : request('/api/reservations', { method: 'POST', body: r })),
  patchReservation: (id, patch) => request(`/api/reservations/${id}`, { method: 'PATCH', body: patch }),
  deleteReservation: (id) => request(`/api/reservations/${id}`, { method: 'DELETE' }),
  reservationAvailability: (date, partySize) =>
    request(`/api/reservations/availability?date=${date}&partySize=${partySize}`),

  settings: () => request('/api/settings'),
  saveSettings: (s) => request('/api/settings', { method: 'PUT', body: s }),

  customers: (q = '') => request('/api/customers' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  customer: (id) => request(`/api/customers/${id}`),
  saveCustomer: (c) => (c._id
    ? request(`/api/customers/${c._id}`, { method: 'PATCH', body: c })
    : request('/api/customers', { method: 'POST', body: c })),
  deleteCustomer: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),

  schedules: (from, to) => request(`/api/schedules?from=${from}&to=${to}`),
  saveSchedule: (s) => (s._id
    ? request(`/api/schedules/${s._id}`, { method: 'PATCH', body: s })
    : request('/api/schedules', { method: 'POST', body: s })),
  deleteSchedule: (id) => request(`/api/schedules/${id}`, { method: 'DELETE' }),

  shoppingList: () => request('/api/stock/shopping-list'),

  zReport: (date) => request(`/api/reports/z-report${date ? `?date=${date}` : ''}`),
  exportOrdersCsvUrl: (from, to) => url(`/api/exports/orders.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  exportShiftsCsvUrl: (from, to) => url(`/api/exports/shifts.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),

  contracts: (q = '') => request('/api/contracts' + (q ? `?${q}` : '')),
  contract: (id) => request(`/api/contracts/${id}`),
  saveContract: (c) => (c._id
    ? request(`/api/contracts/${c._id}`, { method: 'PATCH', body: c })
    : request('/api/contracts', { method: 'POST', body: c })),
  deleteContract: (id) => request(`/api/contracts/${id}`, { method: 'DELETE' }),
  signContract: (id, body) => request(`/api/contracts/${id}/sign`, { method: 'POST', body }),
  contractDocumentUrl: (id) => url(`/api/contracts/${id}/document.html`),
  submitDimona: (id, direction) => request(`/api/contracts/${id}/dimona`, { method: 'POST', body: { direction } }),

  rszDeclarations: (q = '') => request('/api/rsz/declarations' + (q ? `?${q}` : '')),
  rszHoursPreview: (from, to) => request(`/api/rsz/hours-preview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  submitHoursBatch: (from, to, staffIds) => request('/api/rsz/hours-batch', { method: 'POST', body: { from, to, staffIds } }),

  // --- HACCP-registratie ---
  haccpEquipment: (includeInactive = false) =>
    request('/api/haccp/equipment' + (includeInactive ? '?includeInactive=1' : '')),
  saveHaccpEquipment: (e) => (e._id
    ? request(`/api/haccp/equipment/${e._id}`, { method: 'PUT', body: e })
    : request('/api/haccp/equipment', { method: 'POST', body: e })),
  deleteHaccpEquipment: (id) => request(`/api/haccp/equipment/${id}`, { method: 'DELETE' }),

  haccpTemperatureLogs: (q = '') => request('/api/haccp/temperature-logs' + (q ? `?${q}` : '')),
  recordHaccpTemperature: (body) => request('/api/haccp/temperature-logs', { method: 'POST', body }),
  deleteHaccpTemperatureLog: (id) => request(`/api/haccp/temperature-logs/${id}`, { method: 'DELETE' }),

  haccpCleaningTasks: (includeInactive = false) =>
    request('/api/haccp/cleaning-tasks' + (includeInactive ? '?includeInactive=1' : '')),
  saveHaccpCleaningTask: (t) => (t._id
    ? request(`/api/haccp/cleaning-tasks/${t._id}`, { method: 'PUT', body: t })
    : request('/api/haccp/cleaning-tasks', { method: 'POST', body: t })),
  deleteHaccpCleaningTask: (id) => request(`/api/haccp/cleaning-tasks/${id}`, { method: 'DELETE' }),

  haccpCleaningLogs: (q = '') => request('/api/haccp/cleaning-logs' + (q ? `?${q}` : '')),
  recordHaccpCleaning: (body) => request('/api/haccp/cleaning-logs', { method: 'POST', body }),
  deleteHaccpCleaningLog: (id) => request(`/api/haccp/cleaning-logs/${id}`, { method: 'DELETE' }),

  haccpReceivingLogs: (q = '') => request('/api/haccp/receiving-logs' + (q ? `?${q}` : '')),
  recordHaccpReceiving: (body) => request('/api/haccp/receiving-logs', { method: 'POST', body }),
  deleteHaccpReceivingLog: (id) => request(`/api/haccp/receiving-logs/${id}`, { method: 'DELETE' }),
};

export const fmtEur = (n) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
