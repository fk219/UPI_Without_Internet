const base = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  accounts: () => request('/api/accounts'),
  transactions: (limit = 50) => request(`/api/transactions?limit=${limit}`),
  mesh: () => request('/api/mesh/state'),
  serverKey: () => request('/api/server-key'),
  send: (payload) => request('/api/demo/send', { method: 'POST', body: JSON.stringify(payload) }),
  gossip: () => request('/api/mesh/gossip', { method: 'POST', body: '{}' }),
  flush: () => request('/api/mesh/flush', { method: 'POST', body: '{}' }),
  reset: () => request('/api/demo/reset', { method: 'POST', body: '{}' }),
  tamper: () => request('/api/demo/tamper', { method: 'POST', body: '{}' }),
  replay: () => request('/api/demo/replay', { method: 'POST', body: '{}' }),
  duplicateStorm: () => request('/api/demo/duplicate-storm', { method: 'POST', body: '{}' })
};
