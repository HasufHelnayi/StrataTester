import React, { useState } from 'react';
import { X, Play, Code2, AlertCircle, CheckCircle } from 'lucide-react';

const DEFAULT_CODE = `def generate_signals(df):
    """
    Custom Momentum Strategy
    df contains: ['open', 'high', 'low', 'close', 'volume']
    Return Series of signals: 1 (Long), -1 (Short), 0 (Cash)
    """
    # 20-period Exponential Moving Average
    ema20 = df['close'].ewm(span=20, adjust=False).mean()
    
    # 50-period Simple Moving Average
    sma50 = df['close'].rolling(50).mean()
    
    # Generate Long when EMA20 > SMA50, otherwise cash
    signals = (ema20 > sma50).astype(int)
    
    return signals
`;

export default function CustomStrategyEditor({ isOpen, onClose, onRunCustom, loading }) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setErrorMsg(null);
    try {
      await onRunCustom(code);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error executing custom strategy');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Code2 size={18} color="#00f2fe" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Python Strategy Code Studio</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Write or edit standard Python code. The engine supplies <code style={{ color: '#0ea5e9' }}>df</code> (OHLCV dataframe), <code style={{ color: '#0ea5e9' }}>pd</code>, and <code style={{ color: '#0ea5e9' }}>np</code>. Return a Series with values <code style={{ color: '#10b981' }}>1 (Long)</code>, <code style={{ color: '#f43f5e' }}>-1 (Short)</code>, or <code style={{ color: '#94a3b8' }}>0 (Flat)</code>.
          </p>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: '100%',
              height: '240px',
              background: '#06090e',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '1rem',
              color: '#e2e8f0',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.84rem',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'vertical',
            }}
            spellCheck="false"
          />

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.65rem 1rem', borderRadius: '6px', color: '#fb7185', fontSize: '0.8rem' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleExecute} disabled={loading}>
              <Play size={15} fill="currentColor" />
              <span>{loading ? 'Running...' : 'Run Custom Strategy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
