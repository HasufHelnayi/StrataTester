import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export default function PythonSdkModal({ isOpen, onClose, currentConfig }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const symbol = currentConfig?.symbol || 'BTCUSDT';
  const timeframe = currentConfig?.timeframe || '1h';
  const lookback = currentConfig?.lookback_days || 90;
  const strategy = currentConfig?.strategy || 'rsi_reversion';
  const capital = currentConfig?.initial_capital || 10000;
  const allowShort = currentConfig?.allow_short || false;

  const pythonSnippet = `"""
StrataTester Quant SDK Python Example
Automate backtesting & quantitative strategy research
"""
from strata_sdk import StrataClient

# Initialize connection to local or remote StrataTester engine
client = StrataClient(base_url="http://127.0.0.1:8000")

# 1. Run backtest
result = client.run_backtest(
    symbol="${symbol}",
    timeframe="${timeframe}",
    lookback_days=${lookback},
    strategy="${strategy}",
    params=${JSON.stringify(currentConfig?.params || {}, null, 4)},
    initial_capital=${capital},
    commission_rate=${currentConfig?.commission_rate || 0.001},
    slippage_rate=${currentConfig?.slippage_rate || 0.0005},
    allow_short=${allowShort ? 'True' : 'False'}
)

# 2. Print institutional tearsheet
print(result.tearsheet())

# 3. Access pandas DataFrames for deep quant analytics
equity_df = result.equity_df()
trades_df = result.trades_df()

print(f"Final Equity: \${result.metrics['final_equity']:,.2f}")
print(f"Sharpe Ratio: {result.metrics['sharpe_ratio']}")
print(f"Max Drawdown: {result.metrics['max_drawdown_pct']}%")
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} color="#0ea5e9" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Python API & SDK Integration</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
            StrataTester features first-class Python support. You can run automated parameter sweeps, genetic algorithms, and custom algorithmic strategies directly from your terminal or Jupyter Notebook.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8' }}>
              Reproduce Current Parameters via Python SDK:
            </span>
            <button className="btn-secondary" onClick={copyToClipboard} style={{ padding: '0.3rem 0.7rem' }}>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="code-block">{pythonSnippet}</pre>

          <div style={{ background: 'rgba(14, 165, 233, 0.08)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>
              Direct REST API Endpoints:
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#cbd5e1' }}>
              • POST http://127.0.0.1:8000/api/backtest/run<br/>
              • POST http://127.0.0.1:8000/api/strategies/custom<br/>
              • GET  http://127.0.0.1:8000/docs (Interactive OpenAPI / Swagger)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
