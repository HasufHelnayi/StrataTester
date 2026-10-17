import React, { useState, useMemo } from 'react';
import { CandlestickChart as CandleIcon } from 'lucide-react';

export default function CandlestickChart({ candles, signals, symbol, timeframe }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Sample or slice candles to display nicely in the viewport (last 120 candles if many)
  const displayCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles.length > 140 ? candles.slice(-140) : candles;
  }, [candles]);

  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (displayCandles.length === 0) return { minPrice: 0, maxPrice: 100, maxVol: 100 };
    let min = Infinity;
    let max = -Infinity;
    let mv = 0;
    for (const c of displayCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > mv) mv = c.volume;
    }
    const pad = (max - min) * 0.08 || 1;
    return { minPrice: min - pad, maxPrice: max + pad, maxVol: mv };
  }, [displayCandles]);

  // Map signals to candle timestamps
  const signalMap = useMemo(() => {
    const map = {};
    if (!signals) return map;
    for (const s of signals) {
      map[s.time] = s;
    }
    return map;
  }, [signals]);

  if (displayCandles.length === 0) {
    return (
      <div className="chart-card">
        <div className="empty-state">No candlestick data available to render.</div>
      </div>
    );
  }

  const width = 900;
  const height = 320;
  const priceHeight = 240;
  const volHeight = 60;
  const paddingRight = 60;

  const candleWidth = Math.max(2, (width - paddingRight) / displayCandles.length - 2);

  const getY = (val) => {
    return priceHeight - ((val - minPrice) / (maxPrice - minPrice)) * priceHeight;
  };

  const getVolY = (vol) => {
    const norm = maxVol > 0 ? vol / maxVol : 0;
    return height - norm * volHeight;
  };

  const activeCandle = hoveredIndex !== null ? displayCandles[hoveredIndex] : displayCandles[displayCandles.length - 1];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <CandleIcon size={18} color="#00f2fe" />
          <span>{symbol} Candlestick & Trade Signals</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '6px' }}>({timeframe})</span>
        </div>

        {activeCandle && (
          <div className="chart-legend">
            <span>O: <b style={{ color: '#fff' }}>${activeCandle.open?.toFixed(2)}</b></span>
            <span>H: <b style={{ color: '#10b981' }}>${activeCandle.high?.toFixed(2)}</b></span>
            <span>L: <b style={{ color: '#f43f5e' }}>${activeCandle.low?.toFixed(2)}</b></span>
            <span>C: <b style={{ color: activeCandle.close >= activeCandle.open ? '#10b981' : '#f43f5e' }}>${activeCandle.close?.toFixed(2)}</b></span>
            <span>Vol: <b>{activeCandle.volume?.toLocaleString()}</b></span>
          </div>
        )}
      </div>

      <div className="chart-canvas-wrapper" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = priceHeight * pct;
            const priceVal = maxPrice - pct * (maxPrice - minPrice);
            return (
              <g key={idx}>
                <line x1="0" y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <text x={width - paddingRight + 6} y={y + 4} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
                  ${priceVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume separator */}
          <line x1="0" y1={priceHeight} x2={width - paddingRight} y2={priceHeight} stroke="rgba(255,255,255,0.1)" />

          {/* Candles & Volume Bars */}
          {displayCandles.map((c, i) => {
            const x = i * ((width - paddingRight) / displayCandles.length) + candleWidth / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#10b981' : '#f43f5e';

            const yOpen = getY(c.open);
            const yClose = getY(c.close);
            const yHigh = getY(c.high);
            const yLow = getY(c.low);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            const volY = getVolY(c.volume);
            const volH = height - volY;

            const sig = signalMap[c.timestamp];

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                style={{ cursor: 'crosshair' }}
              >
                {/* Volume Bar */}
                <rect
                  x={x - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volH}
                  fill={isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
                />

                {/* High/Low Wick */}
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />

                {/* Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />

                {/* Trade Execution Signal Marker */}
                {sig && sig.type === 'BUY' && (
                  <g transform={`translate(${x}, ${yLow + 14})`}>
                    <polygon points="0,-8 5,2 -5,2" fill="#00f2fe" />
                    <text x="0" y="10" fill="#00f2fe" fontSize="8" fontWeight="bold" textAnchor="middle">BUY</text>
                  </g>
                )}
                {sig && sig.type === 'SELL' && (
                  <g transform={`translate(${x}, ${yHigh - 14})`}>
                    <polygon points="0,8 5,-2 -5,-2" fill="#f43f5e" />
                    <text x="0" y="-6" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="middle">SELL</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Hover Crosshair */}
          {hoveredIndex !== null && (
            <line
              x1={hoveredIndex * ((width - paddingRight) / displayCandles.length) + candleWidth / 2}
              y1="0"
              x2={hoveredIndex * ((width - paddingRight) / displayCandles.length) + candleWidth / 2}
              y2={height}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
