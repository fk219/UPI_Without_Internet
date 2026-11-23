const base = import.meta.env.VITE_API_URL || '';
const operatorToken = import.meta.env.VITE_DEMO_ADMIN_TOKEN || 'demo-operator-key';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 3 : 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers: {
          'content-type': 'application/json',
          'x-demo-admin-token': operatorToken,
          ...(options.headers || {})
        },
        ...options
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;

      lastError = new Error(data?.error?.message || `Request failed (${response.status})`);
      const retryable = [502, 503, 504].includes(response.status);
      if (!retryable || attempt === maxAttempts) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
    }
    await wait(1200 * attempt);
  }

  throw lastError;
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
