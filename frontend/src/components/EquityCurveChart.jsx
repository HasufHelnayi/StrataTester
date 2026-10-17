import React, { useState, useMemo } from 'react';
import { LineChart } from 'lucide-react';

export default function EquityCurveChart({ equityCurve, initialCapital }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const { minVal, maxVal } = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return { minVal: 0, maxVal: 10000 };
    let min = Infinity;
    let max = -Infinity;
    for (const pt of equityCurve) {
      if (pt.equity < min) min = pt.equity;
      if (pt.benchmark < min) min = pt.benchmark;
      if (pt.equity > max) max = pt.equity;
      if (pt.benchmark > max) max = pt.benchmark;
    }
    const pad = (max - min) * 0.08 || 100;
    return { minVal: Math.max(0, min - pad), maxVal: max + pad };
  }, [equityCurve]);

  if (!equityCurve || equityCurve.length === 0) return null;

  const width = 900;
  const height = 240;
  const paddingRight = 65;
  const chartW = width - paddingRight;

  const getY = (val) => {
    return height - ((val - minVal) / (maxVal - minVal)) * height;
  };

  const getX = (i) => {
    return (i / (equityCurve.length - 1)) * chartW;
  };

  // Build SVG path strings
  let equityPath = '';
  let benchmarkPath = '';
  let equityAreaPath = '';

  equityCurve.forEach((pt, i) => {
    const x = getX(i);
    const yEq = getY(pt.equity);
    const yBm = getY(pt.benchmark);

    if (i === 0) {
      equityPath = `M ${x} ${yEq}`;
      benchmarkPath = `M ${x} ${yBm}`;
      equityAreaPath = `M ${x} ${height} L ${x} ${yEq}`;
    } else {
      equityPath += ` L ${x} ${yEq}`;
      benchmarkPath += ` L ${x} ${yBm}`;
      equityAreaPath += ` L ${x} ${yEq}`;
    }
  });

  equityAreaPath += ` L ${chartW} ${height} Z`;

  const activePoint = hoveredIdx !== null ? equityCurve[hoveredIdx] : equityCurve[equityCurve.length - 1];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <LineChart size={18} color="#10b981" />
          <span>Portfolio Equity vs Benchmark</span>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#00f2fe' }}></span>
            <span>Strategy: <b>${activePoint.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#64748b' }}></span>
            <span>Buy & Hold: <b>${activePoint.benchmark?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
          </div>
          {activePoint.time && (
            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
              {new Date(activePoint.time).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="chart-canvas-wrapper" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height * pct;
            const val = maxVal - pct * (maxVal - minVal);
            return (
              <g key={idx}>
                <line x1="0" y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <text x={chartW + 6} y={y + 4} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
                  ${val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Initial Capital baseline */}
          {initialCapital && (
            <line
              x1="0"
              y1={getY(initialCapital)}
              x2={chartW}
              y2={getY(initialCapital)}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="4 4"
            />
          )}

          {/* Area fill for Strategy */}
          <path d={equityAreaPath} fill="url(#equityGrad)" />

          {/* Benchmark line */}
          <path d={benchmarkPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />

          {/* Strategy line */}
          <path d={equityPath} fill="none" stroke="#00f2fe" strokeWidth="2.2" />

          {/* Interactive hover line */}
          {hoveredIdx !== null && (
            <g>
              <line
                x1={getX(hoveredIdx)}
                y1="0"
                x2={getX(hoveredIdx)}
                y2={height}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredIdx)}
                cy={getY(activePoint.equity)}
                r="4"
                fill="#00f2fe"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Invisible hover capture rects */}
          {equityCurve.map((_, i) => {
            const step = chartW / equityCurve.length;
            return (
              <rect
                key={i}
                x={getX(i) - step / 2}
                y="0"
                width={step}
                height={height}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
