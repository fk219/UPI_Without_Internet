import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Fingerprint,
  FlaskConical,
  Radio,
  ShieldAlert,
  Sparkles,
  Zap
} from 'lucide-react';
import { EventFeed } from '../components/EventFeed.jsx';
import { MeshMap } from '../components/MeshMap.jsx';

const money = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format((Number(paise) || 0) / 100);

const shortTime = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const outcomeClass = (outcome) =>
  outcome === 'SETTLED'
    ? 'ok'
    : outcome === 'REJECTED'
      ? 'warn'
      : outcome === 'DUPLICATE_DROPPED'
        ? 'mute'
        : 'bad';

function Accounts({ accounts, onPick }) {
  return (
    <div className="account-grid">
      {accounts.map((account) => (
        <button
          type="button"
          key={account.vpa}
          className="account-card"
          onClick={() => onPick(account.vpa)}
        >
          <div className="account-card-top">
            <span className="account-initial">{account.holderName.slice(0, 1)}</span>
            <span className="mono tiny muted">{account.vpa}</span>
          </div>
          <p className="account-name">{account.holderName}</p>
          <p className="account-balance">{money(account.balancePaise)}</p>
          <span className="account-foot">seeded ledger account <ArrowUpRight size={11} /></span>
        </button>
      ))}
    </div>
  );
}

function FlushResults({ results }) {
  if (!results.length) {
    return (
      <div className="empty-panel">
        <FlaskConical size={17} />
        <div>
          <p>No bridge flush yet.</p>
          <span>Gossip a packet to the 4G phone, then flush the bridges.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="result-list">
      {results.map((result, index) => (
        <div key={`${result.packetId}-${result.bridgeNode}-${index}`} className="result-row">
          <div>
            <p className="mono tiny muted">{result.bridgeNode} → ingest</p>
            <p className="result-packet">packet {result.packetId}</p>
          </div>
          <div className="result-tail">
            <span className={`chip ${outcomeClass(result.outcome)}`}>{result.outcome}</span>
            {result.reason && <span className="mono tiny muted">{result.reason}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ControlRoom({ data }) {
  const { accounts, transactions, mesh, events, lastResults, action, loading } = data;
  const [form, setForm] = useState({
    senderVpa: 'alice@demo',
    receiverVpa: 'bob@demo',
    amount: '150',
    pin: '1234',
    startDevice: 'phone-alice'
  });
  const [lastPacket, setLastPacket] = useState(null);
  const [formError, setFormError] = useState('');

  const busy = Boolean(action);
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const pickAccount = (vpa) => {
    setForm((current) => {
      if (current.receiverVpa === vpa) {
        return { ...current, senderVpa: vpa, receiverVpa: current.senderVpa };
      }
      return { ...current, senderVpa: vpa };
    });
  };

  const validate = () => {
    if (form.senderVpa === form.receiverVpa) {
      setFormError('Sender and receiver must be different.');
      return false;
    }
    if (!Number(form.amount) || Number(form.amount) <= 0) {
      setFormError('Enter an amount greater than zero.');
      return false;
    }
    setFormError('');
    return true;
  };

  const seal = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const result = await data.send({ ...form, amount: Number(form.amount) });
    if (result) setLastPacket(result);
  };

  const runRoute = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const result = await data.runRoute({ ...form, amount: Number(form.amount) });
    if (result) setLastPacket(null);
  };

  const liquidity = accounts.reduce((total, account) => total + account.balancePaise, 0);
  const inMesh = mesh.devices.reduce((total, device) => total + device.packetCount, 0);
  const settled = transactions.filter((tx) => tx.status === 'SETTLED');
  const settledVolume = settled.reduce((total, tx) => total + tx.amountPaise, 0);
  const rejected = transactions.filter((tx) => tx.status === 'REJECTED').length;

  return (
    <div className="page">
      <header className="page-head control-head">
        <div>
          <p className="eyebrow">CONTROL ROOM / MESH NETWORK 01</p>
          <h1>
            Money that moves
            <br />
            <em>without a signal.</em>
          </h1>
          <p className="lede">
            A payment is encrypted on the sender&apos;s phone, carried by strangers, and settled
            exactly once when any phone reaches 4G. This is a live simulation, not a real UPI rail.
          </p>
        </div>
        <div className="head-aside">
          <div className="head-badge">
            <Radio size={13} />
            <span>deferred settlement</span>
          </div>
          <p className="head-note">
            {loading ? 'Syncing the network…' : `${mesh.devices.length} devices · ${inMesh} packets in transit`}
          </p>
        </div>
      </header>

      <section className="metric-strip" aria-label="Network metrics">
        <div className="metric">
          <span className="metric-label">Ledger liquidity</span>
          <strong>{money(liquidity)}</strong>
          <span className="metric-foot">across {accounts.length} seeded accounts</span>
        </div>
        <div className="metric">
          <span className="metric-label">Packets in mesh</span>
          <strong>{inMesh}</strong>
          <span className="metric-foot">ciphertext copies only</span>
        </div>
        <div className="metric">
          <span className="metric-label">Settled volume</span>
          <strong>{money(settledVolume)}</strong>
          <span className="metric-foot">{settled.length} settled · {rejected} rejected</span>
        </div>
        <div className="metric">
          <span className="metric-label">Idempotency claims</span>
          <strong>{mesh.idempotencyCacheSize}</strong>
          <span className="metric-foot">one claim per ciphertext hash</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">01 / THE LEDGER</p>
            <h2>Four accounts, one closed room.</h2>
          </div>
          <p className="section-aside">Click an account to stage it as the sender.</p>
        </div>
        <Accounts accounts={accounts} onPick={pickAccount} />
      </section>

      <div className="workspace-grid">
        <section className="panel send-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">02 / SENDER PHONE</p>
              <h2>Seal a payment.</h2>
            </div>
            <Fingerprint size={19} className="panel-icon" />
          </div>

          <form onSubmit={seal} className="send-form">
            <label>
              <span>From</span>
              <select value={form.senderVpa} onChange={setField('senderVpa')} disabled={busy}>
                {accounts.map((account) => (
                  <option key={account.vpa} value={account.vpa}>
                    {account.holderName} · {account.vpa}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>To</span>
              <select value={form.receiverVpa} onChange={setField('receiverVpa')} disabled={busy}>
                {accounts.map((account) => (
                  <option key={account.vpa} value={account.vpa}>
                    {account.holderName} · {account.vpa}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Amount (₹)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={setField('amount')}
                disabled={busy}
              />
            </label>
            <label>
              <span>Demo PIN</span>
              <input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={setField('pin')}
                disabled={busy}
              />
            </label>
            <label className="field-wide">
              <span>Inject at</span>
              <select value={form.startDevice} onChange={setField('startDevice')} disabled={busy}>
                {mesh.devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label} · {device.hasInternet ? '4G' : 'offline'}
                  </option>
                ))}
              </select>
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions field-wide">
              <button type="submit" className="btn secondary" disabled={busy}>
                {action === 'send' ? 'Sealing…' : 'Seal packet'}
              </button>
              <button type="button" className="btn primary" onClick={runRoute} disabled={busy}>
                {action === 'route' ? 'Routing…' : 'Run the full route'}
                <ArrowRight size={15} />
              </button>
            </div>
            <p className="form-note field-wide">
              The instruction is encrypted with RSA-OAEP + AES-256-GCM before it touches the mesh.
            </p>

            <div className="flow-strip field-wide" aria-hidden="true">
              <span><b>01</b> encrypt</span>
              <i />
              <span><b>02</b> gossip</span>
              <i />
              <span><b>03</b> settle</span>
            </div>
          </form>

          {lastPacket && (
            <div className="packet-preview">
              <div>
                <p className="mono tiny muted">last sealed packet</p>
                <p className="packet-id">{lastPacket.packetIdShort} · TTL {lastPacket.ttl}</p>
              </div>
              <code>{lastPacket.ciphertextPreview}</code>
            </div>
          )}
        </section>

        <section className="panel action-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">03 / THE ROOM</p>
              <h2>Move the packet.</h2>
            </div>
            <Zap size={19} className="panel-icon" />
          </div>

          <div className="action-stack">
            <button type="button" className="action-button" onClick={data.gossip} disabled={busy}>
              <span className="action-icon"><Radio size={15} /></span>
              <span>
                <strong>{action === 'gossip' ? 'Gossiping…' : 'Gossip one round'}</strong>
                <small>Every phone shares what it holds.</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <button type="button" className="action-button" onClick={data.flush} disabled={busy}>
              <span className="action-icon"><Zap size={15} /></span>
              <span>
                <strong>{action === 'flush' ? 'Flushing…' : 'Flush the bridges'}</strong>
                <small>Every 4G phone uploads every copy.</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <button type="button" className="action-button" onClick={data.tamper} disabled={busy}>
              <span className="action-icon"><ShieldAlert size={15} /></span>
              <span>
                <strong>Tamper test</strong>
                <small>Flip one ciphertext byte. Watch it fail.</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <button type="button" className="action-button" onClick={data.replay} disabled={busy}>
              <span className="action-icon"><FlaskConical size={15} /></span>
              <span>
                <strong>Replay test</strong>
                <small>Deliver the same packet twice.</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <button type="button" className="action-button" onClick={data.duplicateStorm} disabled={busy}>
              <span className="action-icon"><Sparkles size={15} /></span>
              <span>
                <strong>Duplicate storm</strong>
                <small>Four bridges settle the same packet.</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <p className="panel-note">
            Every action hits the live Express API and MongoDB ledger. Reset restores the seeded balances.
          </p>
        </section>
      </div>

      <section className="panel mesh-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">04 / MESH TOPOLOGY</p>
            <h2>Five phones. One packet.</h2>
          </div>
          <div className="mesh-legend">
            <span><i className="legend-dot online" /> 4G bridge</span>
            <span><i className="legend-dot" /> offline relay</span>
          </div>
        </div>
        <MeshMap devices={mesh.devices} />
      </section>

      <div className="workspace-grid lower-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">05 / LAST INGEST</p>
              <h2>What the bridges returned.</h2>
            </div>
            <span className="mono tiny muted">{lastResults.length} attempts</span>
          </div>
          <FlushResults results={lastResults} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">06 / EVENT TAPE</p>
              <h2>Live room log.</h2>
            </div>
            <span className="mono tiny muted">{events.length} events</span>
          </div>
          <EventFeed events={events} />
        </section>
      </div>

      <section className="closing-strip">
        <p>
          <strong>Honest limitation:</strong> the receiver cannot verify funds offline. A malicious
          sender can attempt a double-spend; the second settlement is rejected when it reaches the
          ledger.
        </p>
        <button type="button" className="link-button" onClick={data.reset} disabled={busy}>
          Reset the demo <ArrowRight size={13} />
        </button>
      </section>
    </div>
  );
}
