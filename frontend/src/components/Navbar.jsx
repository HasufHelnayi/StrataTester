import React from 'react';
import { Terminal, Code2, Play } from 'lucide-react';

export default function Navbar({
  apiOnline,
  onOpenPythonModal,
  onOpenCustomEditor,
  onRunBacktest,
  loading,
}) {
  return (
    <header className="top-navbar">
      <div className="brand-section">
        <div className="brand-logo">Σ</div>
        <div>
          <span className="brand-title">StrataTester</span>
          <span style={{ marginLeft: '8px' }} className="brand-badge">Quant Terminal</span>
        </div>
      </div>

      <div className="nav-actions">
        <div className="api-status-badge">
          <span className={`status-dot ${apiOnline ? '' : 'offline'}`}></span>
          <span>{apiOnline ? 'API 127.0.0.1:8000 LIVE' : 'API DISCONNECTED'}</span>
        </div>

        <button
          className="btn-secondary"
          onClick={onOpenCustomEditor}
          title="Write or paste custom Python strategy code"
        >
          <Code2 size={15} />
          <span>Python Strategy Editor</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenPythonModal}
          title="View Python SDK code & API integration"
        >
          <Terminal size={15} />
          <span>Python SDK / API</span>
        </button>

        <button
          className="btn-primary"
          onClick={onRunBacktest}
          disabled={loading}
          id="btn-run-backtest"
        >
          <Play size={16} fill="currentColor" />
          <span>{loading ? 'Simulating...' : 'Run Backtest'}</span>
        </button>
      </div>
    </header>
  );
}
