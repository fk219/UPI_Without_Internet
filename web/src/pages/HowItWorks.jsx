import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Network, ShieldCheck } from 'lucide-react';

const endpoints = [
  ['GET', '/api/accounts', 'Seeded demo balances'],
  ['POST', '/api/demo/send', 'Encrypt an instruction and inject it into the mesh'],
  ['POST', '/api/mesh/gossip', 'Copy held packets between simulated phones'],
  ['POST', '/api/mesh/flush', 'Have every 4G bridge upload what it holds'],
  ['POST', '/api/bridge/ingest', 'Production-shaped bridge ingestion endpoint'],
  ['GET', '/api/transactions', 'Read the settled and rejected ledger']
];

export function HowItWorks({ data }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">HOW IT WORKS / THE SHORT VERSION</p>
          <h1>
            Deferred settlement,
            <br />
            <em>without trust in the room.</em>
          </h1>
          <p className="lede">
            The mesh only carries ciphertext. The backend is the first place a payment becomes
            readable, and the first place it can settle.
          </p>
        </div>
        <Link to="/" className="back-link">
          <ArrowLeft size={14} /> Back to the control room
        </Link>
      </header>

      <section className="pipeline">
        <div className="pipeline-step">
          <span className="step-number">01</span>
          <LockKeyhole size={18} />
          <h2>Encrypt on the phone</h2>
          <p>
            A fresh AES-256-GCM key encrypts the payment instruction. RSA-OAEP wraps only that key
            with the backend&apos;s public key. A stranger can carry the blob but cannot read or edit it.
          </p>
        </div>
        <div className="pipeline-step">
          <span className="step-number">02</span>
          <Network size={18} />
          <h2>Relay across the room</h2>
          <p>
            Offline phones gossip copies of the packet. TTL falls by one per hop. The packet can
            reach the 4G bridge through any path; duplicate copies are expected.
          </p>
        </div>
        <div className="pipeline-step">
          <span className="step-number">03</span>
          <ShieldCheck size={18} />
          <h2>Settle once</h2>
          <p>
            The bridge uploads the ciphertext. The server hashes the base64 ciphertext, claims that
            hash, decrypts, checks freshness, and writes the ledger row. A duplicate hash cannot
            settle twice.
          </p>
        </div>
      </section>

      <div className="explain-grid">
        <section className="panel wire-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">THE WIRE FORMAT</p>
              <h2>Ciphertext, then trust.</h2>
            </div>
            <KeyRound size={18} className="panel-icon" />
          </div>
          <pre className="wire-code">{`[ 256-byte RSA-OAEP encrypted AES key ]
[ 12-byte GCM IV ]
[ AES-256-GCM ciphertext ]
[ 16-byte GCM auth tag ]

base64( all of the above )`}</pre>
          <p className="panel-note">
            {data.serverKey
              ? `${data.serverKey.algorithm}. ${data.serverKey.hybridScheme}.`
              : 'RSA-2048 / OAEP-SHA256 wrapping an AES-256-GCM session key.'}
          </p>
        </section>

        <section className="panel proof-panel">
          <p className="eyebrow">THE THREE FAILURE TESTS</p>
          <h2>What the lab lets you break.</h2>
          <div className="proof-row">
            <span className="proof-index">A</span>
            <p><strong>Tamper.</strong> One flipped ciphertext byte causes GCM authentication to fail.</p>
          </div>
          <div className="proof-row">
            <span className="proof-index">B</span>
            <p><strong>Replay.</strong> The second delivery has the same hash and is dropped.</p>
          </div>
          <div className="proof-row">
            <span className="proof-index">C</span>
            <p><strong>Duplicate storm.</strong> Four bridges upload at once; only one debit lands.</p>
          </div>
        </section>
      </div>

      <section className="panel api-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">API SURFACE</p>
            <h2>Small enough to audit.</h2>
          </div>
          <span className="mono tiny muted">Express · MongoDB</span>
        </div>
        <div className="endpoint-list">
          {endpoints.map(([method, path, note]) => (
            <div key={path} className="endpoint-row">
              <span className={`method method-${method.toLowerCase()}`}>{method}</span>
              <code>{path}</code>
              <span>{note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="honest-box">
        <p className="eyebrow">HONEST LIMITATIONS</p>
        <h2>What this does not solve.</h2>
        <ul>
          <li>The receiver cannot verify the sender has funds offline. The payment is an IOU until settlement.</li>
          <li>A malicious sender can attempt an offline double-spend. The second settlement is rejected, but the receiver may already have handed over goods.</li>
          <li>The mesh is simulated in software; real BLE background behavior is much harder.</li>
          <li>The private key is generated per process. Production needs an HSM or KMS.</li>
        </ul>
        <Link to="/" className="btn primary">
          Run the demo <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
