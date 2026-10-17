import React, { useState } from 'react';
import { ListOrdered, Download } from 'lucide-react';

export default function TradeLogTable({ trades }) {
  const [filterType, setFilterType] = useState('ALL');

  if (!trades || trades.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">
            <ListOrdered size={18} color="#00f2fe" />
            <span>Executed Trade Log (0 Trades)</span>
          </div>
        </div>
        <div className="empty-state">No trades executed with the current strategy parameters.</div>
      </div>
    );
  }

  const filteredTrades = trades.filter((t) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'WINS') return t.pnl > 0;
    if (filterType === 'LOSSES') return t.pnl <= 0;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Trade ID", "Type", "Entry Time", "Entry Price", "Exit Time", "Exit Price", "Size", "PnL ($)", "PnL (%)", "Commission", "Duration (Bars)", "Exit Reason"];
    const rows = trades.map(t => [
      t.trade_id,
      t.type,
      t.entry_time,
      t.entry_price,
      t.exit_time,
      t.exit_price,
      t.size,
      t.pnl,
      t.pnl_pct,
      t.commission_paid,
      t.duration_periods,
      t.exit_reason
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stratatester_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <ListOrdered size={18} color="#00f2fe" />
          <span>Executed Trade Log ({trades.length} Trades)</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#0b0f17', padding: '3px', borderRadius: '6px' }}>
            {['ALL', 'WINS', 'LOSSES'].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterType(mode)}
                style={{
                  background: filterType === mode ? '#1e293b' : 'transparent',
                  color: filterType === mode ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <button className="btn-secondary" onClick={exportCSV} title="Export Trades to CSV">
            <Download size={13} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="trade-table-container">
        <table className="quant-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Entry Time</th>
              <th>Entry Price</th>
              <th>Exit Time</th>
              <th>Exit Price</th>
              <th>Size</th>
              <th>PnL ($)</th>
              <th>PnL (%)</th>
              <th>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((t) => {
              const isProfit = t.pnl >= 0;
              return (
                <tr key={t.trade_id}>
                  <td style={{ color: '#64748b' }}>{t.trade_id}</td>
                  <td>
                    <span className={t.type === 'LONG' ? 'badge-long' : 'badge-short'}>
                      {t.type}
                    </span>
                  </td>
                  <td>{t.entry_time ? new Date(t.entry_time).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>${t.entry_price?.toFixed(2)}</td>
                  <td>{t.exit_time ? new Date(t.exit_time).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>${t.exit_price?.toFixed(2)}</td>
                  <td>{t.size?.toFixed(4)}</td>
                  <td className={isProfit ? 'val-positive' : 'val-negative'}>
                    {isProfit ? '+' : ''}${t.pnl?.toFixed(2)}
                  </td>
                  <td className={isProfit ? 'val-positive' : 'val-negative'}>
                    {isProfit ? '+' : ''}{t.pnl_pct?.toFixed(2)}%
                  </td>
                  <td style={{ textTransform: 'capitalize', color: '#94a3b8' }}>
                    {t.exit_reason.replace('_', ' ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
