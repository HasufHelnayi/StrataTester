import React, { useState } from 'react';
import { X, Dices, AlertTriangle, ShieldCheck, TrendingUp, RefreshCw } from 'lucide-react';
import { runMonteCarlo } from '../services/api';

export default function MonteCarloModal({ isOpen, onClose, trades, initialCapital = 10000 }) {
  const [numSimulations, setNumSimulations] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!trades || trades.length < 2) {
      setError("At least 2 executed trades are required to run Monte Carlo analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await runMonteCarlo({
        trades,
        initial_capital: initialCapital,
        num_simulations: numSimulations,
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Monte Carlo simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const m = data?.metrics || {};
  const curves = data?.percentile_curves;

  // Chart calculations
  const width = 760;
  const height = 240;
  const paddingRight = 60;
  const paddingLeft = 10;

  let minEq = initialCapital * 0.7;
  let maxEq = initialCapital * 1.3;

  if (curves && curves.p5 && curves.p95) {
    const allVals = [...curves.p5, ...curves.p95, initialCapital];
    minEq = Math.min(...allVals) * 0.95;
    maxEq = Math.max(...allVals) * 1.05;
  }

  const getY = (val) => {
    return height - ((val - minEq) / (maxEq - minEq)) * height;
  };

  const getPoints = (arr) => {
    if (!arr || arr.length === 0) return '';
    const stepW = (width - paddingRight - paddingLeft) / (arr.length - 1);
    return arr.map((v, i) => `${paddingLeft + i * stepW},${getY(v)}`).join(' ');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Dices size={20} color="#00f2fe" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Monte Carlo Risk & Ruin Engine</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              value={numSimulations}
              onChange={(e) => setNumSimulations(Number(e.target.value))}
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
              <option value={300}>300 Paths</option>
              <option value={500}>500 Paths</option>
              <option value={1000}>1,000 Paths</option>
            </select>

            <button className="btn-primary" onClick={handleRun} disabled={loading} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
            </button>

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

          {!data && !error && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
              <Dices size={36} color="#00f2fe" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>Bootstrap Trade Reshuffling</p>
              <p style={{ fontSize: '0.8rem', maxWidth: '480px', margin: '0.4rem auto', color: '#64748b' }}>
                Simulates hundreds of alternate market paths by resampling executed trades with replacement. Generates confidence cones and risk of ruin probabilities.
              </p>
              <button className="btn-primary" onClick={handleRun} disabled={loading} style={{ marginTop: '1rem' }}>
                Start {numSimulations} Iteration Run
              </button>
            </div>
          )}

          {data && (
            <>
              {/* Metric Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Prob of Profit</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.prob_profit_pct >= 50 ? '#10b981' : '#f43f5e', marginTop: '4px' }}>
                    {m.prob_profit_pct}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Median: {m.median_return_pct >= 0 ? '+' : ''}{m.median_return_pct}%</div>
                </div>

                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>5% Worst-Case Return</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', marginTop: '4px' }}>
                    {m.worst_return_5pct}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>95% Best: +{m.best_return_95pct}%</div>
                </div>

                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Median Max Drawdown</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
                    {m.median_max_drawdown_pct}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Worst 5%: {m.worst_max_drawdown_95pct}%</div>
                </div>

                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    <ShieldCheck size={12} color="#10b981" />
                    <span>Risk of Ruin</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.risk_of_ruin_pct === 0 ? '#10b981' : '#f43f5e', marginTop: '4px' }}>
                    {m.risk_of_ruin_pct}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Drawdown &gt; 50%</div>
                </div>
              </div>

              {/* Fan Chart Visualization */}
              {curves && (
                <div style={{ background: '#06090e', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>Monte Carlo Equity Trajectory Fan (5th - 95th Percentile)</span>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                      <span style={{ color: '#00f2fe' }}>— Median Expectation</span>
                      <span style={{ color: '#10b981' }}>•• 95% Best Case</span>
                      <span style={{ color: '#f43f5e' }}>•• 5% Worst Case</span>
                    </div>
                  </div>

                  <div style={{ height: `${height}px`, width: '100%' }}>
                    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {/* Grid & Initial Capital Baseline */}
                      <line x1={paddingLeft} y1={getY(initialCapital)} x2={width - paddingRight} y2={getY(initialCapital)} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                      <text x={width - paddingRight + 6} y={getY(initialCapital) + 4} fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                        ${initialCapital.toLocaleString()}
                      </text>

                      {/* Sample paths in background */}
                      {data.sample_paths?.map((path, idx) => (
                        <polyline
                          key={idx}
                          points={getPoints(path)}
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="1"
                        />
                      ))}

                      {/* 95th Percentile Upper Line */}
                      <polyline
                        points={getPoints(curves.p95)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />

                      {/* 5th Percentile Lower Line */}
                      <polyline
                        points={getPoints(curves.p5)}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />

                      {/* Median Curve */}
                      <polyline
                        points={getPoints(curves.p50)}
                        fill="none"
                        stroke="#00f2fe"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
