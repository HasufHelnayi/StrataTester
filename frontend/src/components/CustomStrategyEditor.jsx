import React, { useState, useEffect } from 'react';
import { X, Play, Code2, AlertCircle, RotateCcw, Copy, Check } from 'lucide-react';

const PRESETS = {
  ema_momentum: {
    name: "EMA / SMA Momentum",
    code: `def generate_signals(df, params=None):
    """
    Custom EMA / SMA Momentum Strategy
    df columns: ['open', 'high', 'low', 'close', 'volume']
    Returns Series: 1 (Long), -1 (Short), 0 (Cash)
    """
    ema20 = df['close'].ewm(span=20, adjust=False).mean()
    sma50 = df['close'].rolling(50).mean()
    
    signals = (ema20 > sma50).astype(int)
    return signals
`,
  },
  bollinger_squeeze: {
    name: "Bollinger Squeeze Breakout",
    code: `def generate_signals(df, params=None):
    """
    Bollinger Bands Volatility Breakout
    """
    period = 20
    sma = df['close'].rolling(period).mean()
    std = df['close'].rolling(period).std()
    upper = sma + (2.0 * std)
    lower = sma - (2.0 * std)
    
    signals = pd.Series(0, index=df.index)
    signals[df['close'] > upper] = 1   # Long on upper band breakout
    signals[df['close'] < lower] = -1  # Short on lower band breakdown
    return signals
`,
  },
  zscore_mean_reversion: {
    name: "Z-Score Mean Reversion",
    code: `def generate_signals(df, params=None):
    """
    Statistical Z-Score Mean Reversion
    """
    lookback = 30
    mean = df['close'].rolling(lookback).mean()
    std = df['close'].rolling(lookback).std().replace(0, 1e-6)
    z_score = (df['close'] - mean) / std
    
    signals = pd.Series(0, index=df.index)
    signals[z_score < -2.0] = 1   # Buy oversold extreme
    signals[z_score > 2.0] = -1   # Sell overbought extreme
    return signals
`,
  },
  donchian_breakout: {
    name: "Donchian 20-Day Breakout (Turtle)",
    code: `def generate_signals(df, params=None):
    """
    Classic Donchian Channel Trend Following
    """
    high20 = df['high'].rolling(20).max()
    low20 = df['low'].rolling(20).min()
    
    signals = pd.Series(0, index=df.index)
    signals[df['close'] >= high20] = 1
    signals[df['close'] <= low20] = -1
    return signals
`,
  },
};

const STORAGE_KEY = "strata_custom_strategy_code";

export default function CustomStrategyEditor({ isOpen, onClose, onRunCustom, loading }) {
  const [selectedPreset, setSelectedPreset] = useState("ema_momentum");
  const [code, setCode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || PRESETS.ema_momentum.code;
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      // ignore quota errors
    }
  }, [code]);

  if (!isOpen) return null;

  const handlePresetChange = (e) => {
    const key = e.target.value;
    setSelectedPreset(key);
    if (PRESETS[key]) {
      setCode(PRESETS[key].code);
    }
  };

  const handleReset = () => {
    if (PRESETS[selectedPreset]) {
      setCode(PRESETS[selectedPreset].code);
      setErrorMsg(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className="modal-content" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Code2 size={20} color="#00f2fe" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Python Strategy Code Studio</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Preset Selector */}
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              style={{
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                color: '#e2e8f0',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {Object.entries(PRESETS).map(([k, p]) => (
                <option key={k} value={k}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={handleCopy}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              title="Copy Strategy Code"
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>

            <button
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              title="Reset to Template"
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
            <span>
              Engine provides: <code style={{ color: '#00f2fe' }}>df</code> (OHLCV), <code style={{ color: '#00f2fe' }}>pd</code>, <code style={{ color: '#00f2fe' }}>np</code>. Supported imports: <code style={{ color: '#10b981' }}>pandas, numpy, math, datetime, scipy</code>.
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Autosaved to LocalStorage</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: '100%',
              height: '280px',
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Signal outputs: <b style={{ color: '#10b981' }}>1 (Long)</b>, <b style={{ color: '#f43f5e' }}>-1 (Short)</b>, <b style={{ color: '#94a3b8' }}>0 (Flat)</b>
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleExecute} disabled={loading}>
                <Play size={15} fill="currentColor" />
                <span>{loading ? 'Simulating...' : 'Run Custom Strategy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
