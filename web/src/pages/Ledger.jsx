import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, CircleSlash, ShieldCheck } from 'lucide-react';

const money = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format((Number(paise) || 0) / 100);

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—';

const statusClass = (status) =>
  status === 'SETTLED' ? 'ok' : status === 'REJECTED' ? 'warn' : 'mute';

export function Ledger({ data }) {
  const [filter, setFilter] = useState('ALL');
  const transactions = data.transactions;
  const filtered = useMemo(
    () => (filter === 'ALL' ? transactions : transactions.filter((tx) => tx.status === filter)),
    [transactions, filter]
  );

  const settled = transactions.filter((tx) => tx.status === 'SETTLED');
  const rejected = transactions.filter((tx) => tx.status === 'REJECTED');
  const volume = settled.reduce((total, tx) => total + tx.amountPaise, 0);

  return (
    <div className="page">
      <header className="page-head ledger-head">
        <div>
          <p className="eyebrow">LEDGER / SETTLEMENT RECORD</p>
          <h1>
            Every packet,
            <br />
            <em>accounted for.</em>
          </h1>
          <p className="lede">
            A permanent record of what reached the backend. Each row is keyed by the ciphertext
            hash, so a duplicate delivery cannot settle twice.
          </p>
        </div>
        <Link to="/" className="back-link">
          <ArrowLeft size={14} /> Back to the control room
        </Link>
      </header>

      <section className="metric-strip ledger-metrics" aria-label="Ledger summary">
        <div className="metric">
          <span className="metric-label">Settled</span>
          <strong>{settled.length}</strong>
          <span className="metric-foot">unique packets</span>
        </div>
        <div className="metric">
          <span className="metric-label">Settled volume</span>
          <strong>{money(volume)}</strong>
          <span className="metric-foot">across the demo accounts</span>
        </div>
        <div className="metric">
          <span className="metric-label">Rejected</span>
          <strong>{rejected.length}</strong>
          <span className="metric-foot">insufficient funds or unknown receiver</span>
        </div>
        <div className="metric">
          <span className="metric-label">Ledger records</span>
          <strong>{transactions.length}</strong>
          <span className="metric-foot">latest 50 transactions</span>
        </div>
      </section>

      <div className="ledger-grid">
        <section className="panel ledger-panel">
          <div className="panel-head ledger-panel-head">
            <div>
              <p className="eyebrow">TRANSACTION RECORD</p>
              <h2>The ledger.</h2>
            </div>
            <div className="filter-tabs" role="group" aria-label="Filter ledger">
              {['ALL', 'SETTLED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={filter === status ? 'is-active' : ''}
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? 'All' : status.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={22} />
              <p>No transactions yet.</p>
              <span>Seal a packet and flush the bridges to write the first row.</span>
              <Link to="/" className="btn secondary">Open the control room</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Packet</th>
                    <th>Amount</th>
                    <th>Route</th>
                    <th>Bridge</th>
                    <th>Status</th>
                    <th>Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="mono packet-hash">{tx.packetHashShort}…</span>
                        <span className="tx-detail">{tx.reason || 'ciphertext hash'}</span>
                      </td>
                      <td className="amount-cell">{money(tx.amountPaise)}</td>
                      <td>
                        <span className="route-line">{tx.senderVpa}</span>
                        <span className="route-arrow"><ArrowUpRight size={11} /> {tx.receiverVpa}</span>
                      </td>
                      <td>
                        <span className="mono tiny">{tx.bridgeNodeId}</span>
                        <span className="tx-detail">{tx.hopCount} hops</span>
                      </td>
                      <td>
                        <span className={`chip ${statusClass(tx.status)}`}>{tx.status}</span>
                      </td>
                      <td className="time-cell">{dateTime(tx.settledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="ledger-aside">
          <div className="panel proof-panel">
            <p className="eyebrow">WHAT THIS PROVES</p>
            <h2>One hash. One settlement.</h2>
            <div className="proof-row">
              <CheckCircle2 size={16} />
              <p><strong>Settled once.</strong> The unique packet hash is the idempotency key.</p>
            </div>
            <div className="proof-row">
              <ShieldCheck size={16} />
              <p><strong>Tamper-aware.</strong> AES-GCM authentication rejects modified ciphertext.</p>
            </div>
            <div className="proof-row">
              <CircleSlash size={16} />
              <p><strong>Replay-safe.</strong> A second delivery of the same packet is dropped.</p>
            </div>
          </div>

          <div className="panel side-note">
            <p className="eyebrow">READ THE CODE</p>
            <p>
              The server hashes the base64 ciphertext, claims it, decrypts it, checks freshness, then
              writes the debit and credit. The ledger row is the durable record of that decision.
            </p>
            <Link to="/how-it-works" className="link-button">
              How the pipeline works <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
