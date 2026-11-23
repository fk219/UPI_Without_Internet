import { NavLink, Route, Routes } from 'react-router-dom';
import { Activity, BookOpen, CircleDot, GitBranch, Radio, RefreshCw } from 'lucide-react';
import { useMesh } from './useMesh.js';
import { ControlRoom } from './pages/ControlRoom.jsx';
import { Ledger } from './pages/Ledger.jsx';
import { HowItWorks } from './pages/HowItWorks.jsx';

function MeshMark() {
  return (
    <svg viewBox="0 0 48 48" className="mesh-mark" aria-hidden="true">
      <path d="M10 14 24 8l14 6v20l-14 6-14-6Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 14l14 8 14-8M24 22v18" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="14" r="2.5" fill="currentColor" />
      <circle cx="38" cy="14" r="2.5" fill="currentColor" />
      <circle cx="24" cy="40" r="2.5" fill="currentColor" />
      <circle cx="24" cy="22" r="2.5" fill="currentColor" />
    </svg>
  );
}

function Shell({ children, mesh, action, error, reset, onRetry }) {
  const online = !error;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <MeshMark />
          <div>
            <p className="brand-name">Mesh / UPI</p>
            <p className="brand-sub">deferred settlement lab</p>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end>
            <Radio size={15} /> Control room
          </NavLink>
          <NavLink to="/ledger">
            <BookOpen size={15} /> Ledger
          </NavLink>
          <NavLink to="/how-it-works">
            <GitBranch size={15} /> Guide
          </NavLink>
        </nav>

        <div className="sidebar-status">
          <div className={`status-line ${online ? 'is-online' : 'is-offline'}`}>
            <span className="status-dot" />
            <span>{online ? 'API connected' : 'API unavailable'}</span>
          </div>
          <div className="status-line">
            <CircleDot size={12} />
            <span>{mesh.idempotencyCacheSize} hashes claimed</span>
          </div>
          <div className="status-line">
            <Activity size={12} />
            <span>{action ? `Running ${action}…` : 'Mesh idle'}</span>
          </div>
          <button type="button" className="sidebar-reset" onClick={reset} disabled={Boolean(action)}>
            <RefreshCw size={12} /> Reset demo
          </button>
        </div>

        <p className="sidebar-note">
          Simulation only.<br />No real money moves.
        </p>
      </aside>

      <div className="mobile-bar">
        <div className="brand compact">
          <MeshMark />
          <p className="brand-name">Mesh / UPI</p>
        </div>
        <nav className="mobile-nav" aria-label="Primary mobile">
          <NavLink to="/" end>Control</NavLink>
          <NavLink to="/ledger">Ledger</NavLink>
          <NavLink to="/how-it-works">Guide</NavLink>
        </nav>
      </div>

      <main className="main">
        {error && (
          <div className="error-banner" role="alert">
            <span><strong>Connection issue.</strong> {error}</span>
            <button type="button" className="btn secondary small" onClick={onRetry}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const data = useMesh();
  return (
    <Shell
      mesh={data.mesh}
      action={data.action}
      error={data.error}
      reset={data.reset}
      onRetry={data.refresh}
    >
      <Routes>
        <Route path="/" element={<ControlRoom data={data} />} />
        <Route path="/ledger" element={<Ledger data={data} />} />
        <Route path="/how-it-works" element={<HowItWorks data={data} />} />
      </Routes>
    </Shell>
  );
}
