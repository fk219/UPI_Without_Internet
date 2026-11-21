import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

const eventId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useMesh() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [mesh, setMesh] = useState({ devices: [], idempotencyCacheSize: 0 });
  const [serverKey, setServerKey] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastResults, setLastResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');

  const pushEvent = useCallback((kind, title, detail = '') => {
    setEvents((current) =>
      [{ id: eventId(), kind, title, detail, at: new Date().toISOString() }, ...current].slice(0, 9)
    );
  }, []);

  const refresh = useCallback(async () => {
    const [accountsResponse, transactionsResponse, meshResponse] = await Promise.all([
      api.accounts(),
      api.transactions(50),
      api.mesh()
    ]);
    setAccounts(accountsResponse.items);
    setTransactions(transactionsResponse.items);
    setMesh(meshResponse);
    setError('');
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([refresh(), api.serverKey().catch(() => null)])
      .then(([, key]) => {
        if (active) setServerKey(key);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const run = async (name, task) => {
    setAction(name);
    setError('');
    try {
      return await task();
    } catch (err) {
      setError(err.message);
      pushEvent('error', 'Action failed', err.message);
      return null;
    } finally {
      setAction('');
    }
  };

  const send = (payload) =>
    run('send', async () => {
      const result = await api.send(payload);
      await refresh();
      pushEvent(
        'sealed',
        `Packet sealed for ${result.packetIdShort}`,
        `₹${result.amount} encrypted at ${result.injectedAt} with TTL ${result.ttl}`
      );
      return result;
    });

  const gossip = () =>
    run('gossip', async () => {
      const result = await api.gossip();
      await refresh();
      pushEvent('gossip', 'Gossip round complete', `${result.transfers} packet copies moved between phones`);
      return result;
    });

  const flush = () =>
    run('flush', async () => {
      const result = await api.flush();
      await refresh();
      setLastResults(result.results);
      const settled = result.results.filter((item) => item.outcome === 'SETTLED').length;
      const duplicates = result.results.filter((item) => item.outcome === 'DUPLICATE_DROPPED').length;
      const rejected = result.results.filter((item) => item.outcome === 'REJECTED').length;
      pushEvent(
        'flush',
        `${result.uploadsAttempted} bridge uploads`,
        `${settled} settled · ${duplicates} duplicate · ${rejected} rejected`
      );
      return result;
    });

  const runRoute = (payload) =>
    run('route', async () => {
      await api.send(payload);
      await api.gossip();
      await api.gossip();
      const result = await api.flush();
      await refresh();
      setLastResults(result.results);
      const settled = result.results.filter((item) => item.outcome === 'SETTLED').length;
      const duplicates = result.results.filter((item) => item.outcome === 'DUPLICATE_DROPPED').length;
      pushEvent(
        'route',
        'Full route completed',
        `${settled} settled · ${duplicates} duplicate · ${result.uploadsAttempted} uploads`
      );
      return result;
    });

  const reset = () =>
    run('reset', async () => {
      await api.reset();
      await refresh();
      setLastResults([]);
      setEvents([]);
      pushEvent('reset', 'Demo reset', 'Balances restored, ledger cleared, mesh emptied');
    });

  const tamper = () =>
    run('tamper', async () => {
      const result = await api.tamper();
      await refresh();
      pushEvent(
        result.outcome === 'INVALID' ? 'blocked' : 'error',
        'Tampered packet test',
        result.reason ? `Rejected: ${result.reason}` : `Outcome: ${result.outcome}`
      );
      return result;
    });

  const replay = () =>
    run('replay', async () => {
      const result = await api.replay();
      await refresh();
      pushEvent(
        'blocked',
        'Replay test',
        `First: ${result.first.outcome} · Second: ${result.second.outcome}`
      );
      return result;
    });

  const duplicateStorm = () =>
    run('storm', async () => {
      const result = await api.duplicateStorm();
      await refresh();
      const settled = result.results.filter((item) => item.outcome === 'SETTLED').length;
      const duplicates = result.results.filter((item) => item.outcome === 'DUPLICATE_DROPPED').length;
      pushEvent('storm', 'Duplicate storm', `${settled} settled · ${duplicates} duplicates dropped`);
      return result;
    });

  return {
    accounts,
    transactions,
    mesh,
    serverKey,
    events,
    lastResults,
    loading,
    action,
    error,
    refresh,
    send,
    gossip,
    flush,
    runRoute,
    reset,
    tamper,
    replay,
    duplicateStorm
  };
}
