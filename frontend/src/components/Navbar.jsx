import React from 'react';
import { Terminal, Code2, Play, Dices, Sliders, FileText } from 'lucide-react';

export default function Navbar({
  apiOnline,
  onOpenPythonModal,
  onOpenCustomEditor,
  onOpenOptimizer,
  onOpenMonteCarlo,
  onExportReport,
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
          <span>{apiOnline ? 'API LIVE' : 'API DISCONNECTED'}</span>
        </div>

        <button
          className="btn-secondary"
          onClick={onOpenOptimizer}
          title="Optimize strategy parameters using grid search"
        >
          <Sliders size={14} color="#00f2fe" />
          <span>Optimizer</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenMonteCarlo}
          title="Run bootstrap Monte Carlo simulation & risk of ruin analysis"
        >
          <Dices size={14} color="#a855f7" />
          <span>Monte Carlo</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onExportReport}
          title="Print or export institutional PDF / HTML report"
        >
          <FileText size={14} color="#10b981" />
          <span>Report</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenCustomEditor}
          title="Write or paste custom Python strategy code"
        >
          <Code2 size={14} />
          <span>Python Studio</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenPythonModal}
          title="View Python SDK code & API integration"
        >
          <Terminal size={14} />
          <span>SDK</span>
        </button>

        <button
          className="btn-primary"
          onClick={onRunBacktest}
          disabled={loading}
          id="btn-run-backtest"
        >
          <Play size={15} fill="currentColor" />
          <span>{loading ? 'Simulating...' : 'Run Backtest'}</span>
        </button>
      </div>
    </header>
  );
}
