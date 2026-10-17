import React, { useState, useMemo } from 'react';
import { CandlestickChart as CandleIcon, Eye, EyeOff } from 'lucide-react';

export default function CandlestickChart({ candles, signals, trades = [], symbol, timeframe }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showTrades, setShowTrades] = useState(true);

  // Sample or slice candles to display nicely in the viewport (last 140 candles if many)
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
    const pad = (max - min) * 0.1 || 1;
    return { minPrice: min - pad, maxPrice: max + pad, maxVol: mv };
  }, [displayCandles]);

  // Match trades to visible candles by timestamp
  const tradeMarkers = useMemo(() => {
    if (!trades || trades.length === 0 || displayCandles.length === 0) {
      return { entries: {}, exits: {} };
    }
    const entries = {};
    const exits = {};

    const candleTimes = displayCandles.map((c) => ({
      ts: new Date(c.timestamp).getTime(),
      orig: c.timestamp,
    }));

    for (const t of trades) {
      const entryTs = new Date(t.entry_time).getTime();
      const exitTs = t.exit_time ? new Date(t.exit_time).getTime() : null;

      let bestEntry = null;
      let minEntryDiff = Infinity;
      let bestExit = null;
      let minExitDiff = Infinity;

      for (const c of candleTimes) {
        const dEntry = Math.abs(c.ts - entryTs);
        if (dEntry < minEntryDiff) {
          minEntryDiff = dEntry;
          bestEntry = c.orig;
        }
        if (exitTs) {
          const dExit = Math.abs(c.ts - exitTs);
          if (dExit < minExitDiff) {
            minExitDiff = dExit;
            bestExit = c.orig;
          }
        }
      }

      // Associate if within 2 days
      if (bestEntry && minEntryDiff <= 86400000 * 2) {
        entries[bestEntry] = t;
      }
      if (bestExit && minExitDiff <= 86400000 * 2) {
        exits[bestExit] = t;
      }
    }
    return { entries, exits };
  }, [trades, displayCandles]);

  if (displayCandles.length === 0) {
    return (
      <div className="chart-card">
        <div className="empty-state">No candlestick data available to render.</div>
      </div>
    );
  }

  const width = 900;
  const height = 330;
  const priceHeight = 245;
  const volHeight = 60;
  const paddingRight = 65;

  const candleWidth = Math.max(2, (width - paddingRight) / displayCandles.length - 2);

  const getY = (val) => {
    return priceHeight - ((val - minPrice) / (maxPrice - minPrice)) * priceHeight;
  };

  const getVolY = (vol) => {
    const norm = maxVol > 0 ? vol / maxVol : 0;
    return height - norm * volHeight;
  };

  const activeCandle = hoveredIndex !== null ? displayCandles[hoveredIndex] : displayCandles[displayCandles.length - 1];
  const activeEntryTrade = activeCandle ? tradeMarkers.entries[activeCandle.timestamp] : null;
  const activeExitTrade = activeCandle ? tradeMarkers.exits[activeCandle.timestamp] : null;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <CandleIcon size={18} color="#00f2fe" />
          <span>{symbol} Candlesticks & Execution Overlay</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '6px' }}>({timeframe})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Active Trade / Candle Legend */}
          {activeEntryTrade && (
            <span style={{ fontSize: '0.75rem', background: activeEntryTrade.type === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)', color: activeEntryTrade.type === 'LONG' ? '#10b981' : '#f43f5e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Entry: {activeEntryTrade.type} @ ${activeEntryTrade.entry_price?.toFixed(2)}
            </span>
          )}
          {activeExitTrade && (
            <span style={{ fontSize: '0.75rem', background: activeExitTrade.pnl >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)', color: activeExitTrade.pnl >= 0 ? '#10b981' : '#f43f5e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Exit PnL: {activeExitTrade.pnl >= 0 ? '+' : ''}${activeExitTrade.pnl?.toFixed(2)} ({activeExitTrade.pnl_pct >= 0 ? '+' : ''}{activeExitTrade.pnl_pct?.toFixed(2)}%)
            </span>
          )}

          {activeCandle && !activeEntryTrade && !activeExitTrade && (
            <div className="chart-legend">
              <span>O: <b style={{ color: '#fff' }}>${activeCandle.open?.toFixed(2)}</b></span>
              <span>H: <b style={{ color: '#10b981' }}>${activeCandle.high?.toFixed(2)}</b></span>
              <span>L: <b style={{ color: '#f43f5e' }}>${activeCandle.low?.toFixed(2)}</b></span>
              <span>C: <b style={{ color: activeCandle.close >= activeCandle.open ? '#10b981' : '#f43f5e' }}>${activeCandle.close?.toFixed(2)}</b></span>
            </div>
          )}

          {/* Toggle Trade Markers */}
          <button
            onClick={() => setShowTrades(!showTrades)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: showTrades ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showTrades ? 'rgba(0, 242, 254, 0.35)' : 'rgba(255,255,255,0.1)'}`,
              color: showTrades ? '#00f2fe' : '#94a3b8',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Toggle Trade Entry/Exit Markers"
          >
            {showTrades ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Trades {showTrades ? 'ON' : 'OFF'}</span>
          </button>
        </div>
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

            const entryTrade = showTrades ? tradeMarkers.entries[c.timestamp] : null;
            const exitTrade = showTrades ? tradeMarkers.exits[c.timestamp] : null;

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
                  fill={isUp ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)'}
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

                {/* Trade Entry Marker */}
                {entryTrade && entryTrade.type === 'LONG' && (
                  <g transform={`translate(${x}, ${yLow + 16})`}>
                    <polygon points="0,-7 5,3 -5,3" fill="#10b981" />
                    <circle cx="0" cy="0" r="8" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="0.8" />
                    <text x="0" y="14" fill="#10b981" fontSize="7.5" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">BUY</text>
                  </g>
                )}
                {entryTrade && entryTrade.type === 'SHORT' && (
                  <g transform={`translate(${x}, ${yHigh - 16})`}>
                    <polygon points="0,7 5,-3 -5,-3" fill="#f43f5e" />
                    <circle cx="0" cy="0" r="8" fill="rgba(244, 63, 94, 0.15)" stroke="#f43f5e" strokeWidth="0.8" />
                    <text x="0" y="-10" fill="#f43f5e" fontSize="7.5" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">SELL</text>
                  </g>
                )}

                {/* Trade Exit Marker */}
                {exitTrade && (
                  <g transform={`translate(${x}, ${getY(exitTrade.exit_price || c.close)})`}>
                    <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill={exitTrade.pnl >= 0 ? '#00f2fe' : '#fb7185'} stroke="#06090e" strokeWidth="1" />
                    <text x="0" y={exitTrade.pnl >= 0 ? -9 : 14} fill={exitTrade.pnl >= 0 ? '#00f2fe' : '#fb7185'} fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                      {exitTrade.pnl >= 0 ? '+' : ''}{exitTrade.pnl_pct?.toFixed(1)}%
                    </text>
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
