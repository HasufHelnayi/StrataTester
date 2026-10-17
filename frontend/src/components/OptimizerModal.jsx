import React, { useState } from 'react';
import { X, Sliders, Play, Award, Check, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { runOptimization } from '../services/api';

const DEFAULT_GRIDS = {
  sma_crossover: {
    fast_period: "5, 10, 15, 20",
    slow_period: "25, 40, 60, 80",
  },
  rsi_reversion: {
    rsi_period: "10, 14, 21",
    oversold: "25, 30, 35",
    overbought: "65, 70, 75",
  },
  macd_trend: {
    fast_period: "8, 12, 16",
    slow_period: "21, 26, 34",
    signal_period: "7, 9",
  },
  bollinger_bands: {
    period: "15, 20, 25",
    std_dev: "1.8, 2.0, 2.2",
  },
};

export default function OptimizerModal({
  isOpen,
  onClose,
  config,
  onApplyParams,
}) {
  const currentStrategy = config.strategy || 'sma_crossover';
  const [gridInputs, setGridInputs] = useState(() => DEFAULT_GRIDS[currentStrategy] || {});
  const [sortBy, setSortBy] = useState('sharpe_ratio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [appliedRank, setAppliedRank] = useState(null);

  if (!isOpen) return null;

  const handleGridParamChange = (k, val) => {
    setGridInputs(prev => ({ ...prev, [k]: val }));
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setAppliedRank(null);
    try {
      const parsedGrid = {};
      for (const [k, v] of Object.entries(gridInputs)) {
        parsedGrid[k] = v.split(',').map(s => {
          const num = Number(s.trim());
          return isNaN(num) ? s.trim() : num;
        });
      }

      const res = await runOptimization({
        strategy: currentStrategy,
        symbol: config.symbol,
        timeframe: config.timeframe,
        lookback_days: config.lookback_days,
        param_grid: parsedGrid,
        initial_capital: config.initial_capital,
        commission_rate: config.commission_rate,
        slippage_rate: config.slippage_rate,
        position_size_pct: config.position_size_pct || 1.0,
        allow_short: config.allow_short || false,
        stop_loss_pct: config.stop_loss_pct || null,
        take_profit_pct: config.take_profit_pct || null,
        sort_by: sortBy,
        max_combinations: 36,
      });

      setResult(res);
    } catch (err) {
      setError(err.message || 'Optimization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (params, rank) => {
    onApplyParams(params);
    setAppliedRank(rank);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={20} color="#00f2fe" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Strategy Parameter Grid Optimizer</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
              <ArrowUpDown size={14} />
              <span>Objective:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: '#090d16',
                  border: '1px solid var(--border-subtle)',
                  color: '#e2e8f0',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              >
                <option value="sharpe_ratio">Sharpe Ratio</option>
                <option value="net_profit_pct">Net Profit %</option>
                <option value="max_drawdown_pct">Lowest Max Drawdown</option>
                <option value="win_rate_pct">Win Rate %</option>
              </select>
            </div>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '6px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.65rem 1rem', borderRadius: '6px', color: '#fb7185', fontSize: '0.8rem' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Grid Parameters Input */}
          <div style={{ background: '#06090e', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.6rem' }}>
              Parameter Search Space for {currentStrategy.toUpperCase()} (comma-separated):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(DEFAULT_GRIDS[currentStrategy] || {}).map(([paramKey, defVal]) => (
                <div key={paramKey} className="form-group">
                  <label className="form-label" style={{ textTransform: 'capitalize' }}>
                    {paramKey.replace('_', ' ')}
                  </label>
                  <input
                    type="text"
                    value={gridInputs[paramKey] !== undefined ? gridInputs[paramKey] : defVal}
                    onChange={(e) => handleGridParamChange(paramKey, e.target.value)}
                    style={{
                      background: '#0a0f1d',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#00f2fe',
                      padding: '6px 10px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button className="btn-primary" onClick={handleExecute} disabled={loading} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                <Play size={13} fill="currentColor" />
                <span>{loading ? 'Optimizing Grid...' : 'Run Parameter Sweep'}</span>
              </button>
            </div>
          </div>

          {/* Leaderboard Table */}
          {result && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>Tested {result.total_combinations_tested} combinations sorted by <b style={{ color: '#00f2fe' }}>{sortBy}</b></span>
                {result.best_result && (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} /> Best Sharpe: {result.best_result.sharpe_ratio}
                  </span>
                )}
              </div>

              <div className="table-responsive" style={{ maxHeight: '250px' }}>
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Parameters</th>
                      <th>Sharpe</th>
                      <th>Return</th>
                      <th>Max DD</th>
                      <th>Win Rate</th>
                      <th>Trades</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.leaderboard?.map((item) => (
                      <tr key={item.rank} style={{ background: item.rank === 1 ? 'rgba(0, 242, 254, 0.05)' : 'transparent' }}>
                        <td>
                          {item.rank === 1 ? (
                            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>★ #1</span>
                          ) : (
                            `#${item.rank}`
                          )}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#e2e8f0' }}>
                          {JSON.stringify(item.params).replace(/["{}]/g, '').replace(/:/g, '= ')}
                        </td>
                        <td style={{ fontWeight: 600, color: item.sharpe_ratio >= 1.0 ? '#10b981' : item.sharpe_ratio > 0 ? '#00f2fe' : '#f43f5e' }}>
                          {item.sharpe_ratio}
                        </td>
                        <td style={{ fontWeight: 600, color: item.net_profit_pct >= 0 ? '#10b981' : '#f43f5e' }}>
                          {item.net_profit_pct >= 0 ? '+' : ''}{item.net_profit_pct}%
                        </td>
                        <td style={{ color: '#fb7185' }}>{item.max_drawdown_pct}%</td>
                        <td>{item.win_rate_pct}%</td>
                        <td>{item.total_trades}</td>
                        <td>
                          <button
                            onClick={() => handleApply(item.params, item.rank)}
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: appliedRank === item.rank ? '#10b981' : '#00f2fe' }}
                          >
                            {appliedRank === item.rank ? <Check size={12} /> : 'Apply'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
