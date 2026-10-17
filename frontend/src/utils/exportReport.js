/**
 * Generates an institutional-grade printable HTML report for the backtest tearsheet.
 */
export function generateInstitutionalReport(result, config) {
  if (!result || !result.metrics) return;

  const m = result.metrics;
  const now = new Date().toUTCString();

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StrataTester Tearsheet — ${config.symbol} (${config.strategy})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #06090e;
      color: #e2e8f0;
      padding: 2.5rem;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #00f2fe;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .title {
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #fff;
    }
    .meta {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: #0c1220;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
    }
    .card-label {
      font-size: 0.72rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .card-val {
      font-size: 1.4rem;
      font-weight: 800;
      margin-top: 0.35rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .pos { color: #10b981; }
    .neg { color: #f43f5e; }
    .neu { color: #00f2fe; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      font-size: 0.85rem;
    }
    th, td {
      padding: 0.65rem 1rem;
      text-align: left;
      border-bottom: 1px solid #1e293b;
    }
    th {
      background: #0c1220;
      color: #94a3b8;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td.val {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      text-align: right;
    }
    .footer {
      font-size: 0.75rem;
      color: #64748b;
      border-top: 1px solid #1e293b;
      padding-top: 1rem;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { background: #fff !important; color: #0f172a !important; padding: 1rem; }
      .header { border-bottom-color: #0284c7; }
      .title { color: #0f172a; }
      .meta { color: #475569; }
      .card { background: #f8fafc !important; border-color: #cbd5e1 !important; }
      .card-label { color: #475569 !important; }
      .pos { color: #059669 !important; }
      .neg { color: #dc2626 !important; }
      .neu { color: #0284c7 !important; }
      th { background: #f1f5f9 !important; color: #475569 !important; }
      td, th { border-bottom-color: #e2e8f0 !important; color: #0f172a !important; }
      .footer { border-top-color: #cbd5e1 !important; color: #64748b !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 1rem; display: flex; justify-content: flex-end;">
    <button onclick="window.print()" style="background: #00f2fe; color: #06090e; font-weight: 700; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="title">StrataTester Quantitative Tearsheet</div>
      <div class="meta">Asset: <b>${config.symbol}</b> | Timeframe: <b>${config.timeframe}</b> | Lookback: <b>${config.lookback_days} Days</b> | Strategy: <b>${config.strategy.toUpperCase()}</b></div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 0.85rem; font-weight: 700; color: #00f2fe;">STRATA ENGINE v1.0</div>
      <div class="meta">Generated: ${now}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Net Profit</div>
      <div class="card-val ${m.net_profit >= 0 ? 'pos' : 'neg'}">$${m.net_profit?.toLocaleString()} (${m.net_profit_pct >= 0 ? '+' : ''}${m.net_profit_pct}%)</div>
    </div>
    <div class="card">
      <div class="card-label">Sharpe Ratio</div>
      <div class="card-val neu">${m.sharpe_ratio}</div>
    </div>
    <div class="card">
      <div class="card-label">Max Drawdown</div>
      <div class="card-val neg">${m.max_drawdown_pct}%</div>
    </div>
    <div class="card">
      <div class="card-label">Win Rate / Trades</div>
      <div class="card-val pos">${m.win_rate_pct}% <span style="font-size: 0.8rem; color: #94a3b8;">(${m.total_trades} trades)</span></div>
    </div>
  </div>

  <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Institutional Tearsheet Metrics</h3>
  <table>
    <thead>
      <tr>
        <th>Performance & Return</th>
        <th style="text-align: right;">Value</th>
        <th>Risk & Drawdown</th>
        <th style="text-align: right;">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Initial Capital</td>
        <td class="val">$${m.initial_capital?.toLocaleString()}</td>
        <td>Max Drawdown</td>
        <td class="val neg">${m.max_drawdown_pct}%</td>
      </tr>
      <tr>
        <td>Final Equity</td>
        <td class="val ${m.final_equity >= m.initial_capital ? 'pos' : 'neg'}">$${m.final_equity?.toLocaleString()}</td>
        <td>Max Drawdown Duration</td>
        <td class="val">${m.max_drawdown_duration_bars} bars</td>
      </tr>
      <tr>
        <td>Benchmark Return (Buy & Hold)</td>
        <td class="val">${m.benchmark_return_pct >= 0 ? '+' : ''}${m.benchmark_return_pct}%</td>
        <td>Annualized Volatility</td>
        <td class="val">${m.annualized_volatility_pct}%</td>
      </tr>
      <tr>
        <td>CAGR</td>
        <td class="val ${m.cagr_pct >= 0 ? 'pos' : 'neg'}">${m.cagr_pct}%</td>
        <td>Sortino Ratio</td>
        <td class="val neu">${m.sortino_ratio}</td>
      </tr>
      <tr>
        <td>Profit Factor</td>
        <td class="val">${m.profit_factor}</td>
        <td>Calmar Ratio</td>
        <td class="val neu">${m.calmar_ratio}</td>
      </tr>
      <tr>
        <td>Expectancy ($ / Trade)</td>
        <td class="val ${m.expectancy >= 0 ? 'pos' : 'neg'}">$${m.expectancy}</td>
        <td>Win / Loss Ratio</td>
        <td class="val">${m.win_loss_ratio}</td>
      </tr>
      <tr>
        <td>Total Commission & Fees</td>
        <td class="val">$${m.total_fees_paid}</td>
        <td>Winning / Losing Trades</td>
        <td class="val">${m.winning_trades} / ${m.losing_trades}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>StrataTester Institutional Analytics Engine &copy; 2026</span>
    <span>CONFIDENTIAL &bull; FOR BACKTESTING & SIMULATION PURPOSES ONLY</span>
  </div>
</body>
</html>`;

  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
  }
}
