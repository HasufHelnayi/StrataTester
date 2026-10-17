import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function DrawdownChart({ equityCurve, maxDrawdownPct }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!equityCurve || equityCurve.length === 0) return null;

  const width = 900;
  const height = 140;
  const paddingRight = 65;
  const chartW = width - paddingRight;

  const minDD = Math.min(-1, -(maxDrawdownPct || 20) * 1.15); // e.g. -25%
  const maxDD = 0; // 0% is peak

  const getY = (ddVal) => {
    // ddVal is negative, 0 is at top (y=0)
    const norm = (ddVal - maxDD) / (minDD - maxDD);
    return norm * height;
  };

  const getX = (i) => {
    return (i / (equityCurve.length - 1)) * chartW;
  };

  let ddPath = '';
  let ddAreaPath = '';

  equityCurve.forEach((pt, i) => {
    const x = getX(i);
    const dd = pt.drawdown !== undefined ? -Math.abs(pt.drawdown) : 0;
    const y = getY(dd);

    if (i === 0) {
      ddPath = `M ${x} ${y}`;
      ddAreaPath = `M ${x} 0 L ${x} ${y}`;
    } else {
      ddPath += ` L ${x} ${y}`;
      ddAreaPath += ` L ${x} ${y}`;
    }
  });

  ddAreaPath += ` L ${chartW} 0 Z`;

  const activePoint = hoveredIdx !== null ? equityCurve[hoveredIdx] : equityCurve[equityCurve.length - 1];
  const activeDD = activePoint?.drawdown !== undefined ? -Math.abs(activePoint.drawdown) : 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <ShieldAlert size={16} color="#f43f5e" />
          <span>Underwater Portfolio Drawdown</span>
        </div>

        <div className="chart-legend">
          <span>Current Drawdown: <b style={{ color: '#f43f5e' }}>{activeDD.toFixed(2)}%</b></span>
          <span>Max: <b style={{ color: '#f43f5e' }}>-{maxDrawdownPct?.toFixed(2)}%</b></span>
        </div>
      </div>

      <div className="chart-canvas-wrapper" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = height * pct;
            const val = pct * minDD;
            return (
              <g key={idx}>
                <line x1="0" y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <text x={chartW + 6} y={y + 4} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
                  {val.toFixed(0)}%
                </text>
              </g>
            );
          })}

          <path d={ddAreaPath} fill="url(#drawdownGrad)" />
          <path d={ddPath} fill="none" stroke="#f43f5e" strokeWidth="1.5" />

          {/* Invisible hover rects */}
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
