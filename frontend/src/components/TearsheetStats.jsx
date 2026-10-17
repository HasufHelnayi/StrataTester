import React from 'react';
import { TrendingUp, TrendingDown, ShieldAlert, Award, BarChart2, DollarSign, Percent, Clock } from 'lucide-react';

export default function TearsheetStats({ metrics }) {
  if (!metrics) return null;

  const netProfit = metrics.net_profit ?? 0;
  const netProfitPct = metrics.net_profit_pct ?? 0;
  const sharpe = metrics.sharpe_ratio ?? 0;
  const sortino = metrics.sortino_ratio ?? 0;
  const calmar = metrics.calmar_ratio ?? 0;
  const maxDD = metrics.max_drawdown_pct ?? 0;
  const winRate = metrics.win_rate_pct ?? 0;
  const profitFactor = metrics.profit_factor ?? 0;
  const cagr = metrics.cagr_pct ?? 0;
  const bmReturn = metrics.benchmark_return_pct ?? 0;

  const isProfitable = netProfit >= 0;

  return (
    <div className="tearsheet-grid">
      {/* Net Profit */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Net Profit</span>
          {isProfitable ? <TrendingUp size={15} className="val-positive" /> : <TrendingDown size={15} className="val-negative" />}
        </div>
        <div className={`stat-value ${isProfitable ? 'val-positive' : 'val-negative'}`}>
          {isProfitable ? '+' : ''}${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="stat-sub">
          {netProfitPct >= 0 ? '+' : ''}{netProfitPct.toFixed(2)}% ROI
        </div>
      </div>

      {/* Benchmark Return */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Benchmark (B&H)</span>
          <Percent size={14} className="val-neutral" />
        </div>
        <div className={`stat-value ${bmReturn >= 0 ? 'val-positive' : 'val-negative'}`}>
          {bmReturn >= 0 ? '+' : ''}{bmReturn.toFixed(2)}%
        </div>
        <div className="stat-sub">
          Alpha: {(netProfitPct - bmReturn).toFixed(2)}%
        </div>
      </div>

      {/* Sharpe Ratio */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Sharpe Ratio</span>
          <Award size={15} color="#38bdf8" />
        </div>
        <div className={`stat-value ${sharpe >= 1.5 ? 'val-positive' : sharpe >= 1.0 ? 'val-neutral' : sharpe < 0 ? 'val-negative' : ''}`}>
          {sharpe.toFixed(2)}
        </div>
        <div className="stat-sub">
          {sharpe >= 2.0 ? 'Excellent' : sharpe >= 1.0 ? 'Acceptable' : 'Suboptimal'}
        </div>
      </div>

      {/* Sortino Ratio */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Sortino Ratio</span>
          <Award size={15} color="#a855f7" />
        </div>
        <div className="stat-value val-neutral">
          {sortino.toFixed(2)}
        </div>
        <div className="stat-sub">
          Downside Risk Adj.
        </div>
      </div>

      {/* Max Drawdown */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Max Drawdown</span>
          <ShieldAlert size={15} className="val-negative" />
        </div>
        <div className="stat-value val-negative">
          -{maxDD.toFixed(2)}%
        </div>
        <div className="stat-sub">
          Duration: {metrics.max_drawdown_duration_bars || 0} bars
        </div>
      </div>

      {/* Win Rate */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Win Rate</span>
          <BarChart2 size={15} color="#10b981" />
        </div>
        <div className={`stat-value ${winRate >= 50 ? 'val-positive' : 'val-negative'}`}>
          {winRate.toFixed(1)}%
        </div>
        <div className="stat-sub">
          {metrics.winning_trades}W / {metrics.losing_trades}L ({metrics.total_trades} total)
        </div>
      </div>

      {/* Profit Factor */}
      <div className="stat-card">
        <div className="stat-label">
          <span>Profit Factor</span>
          <DollarSign size={15} color="#f59e0b" />
        </div>
        <div className={`stat-value ${profitFactor >= 1.5 ? 'val-positive' : profitFactor < 1 ? 'val-negative' : 'val-neutral'}`}>
          {profitFactor.toFixed(2)}
        </div>
        <div className="stat-sub">
          Win/Loss: {metrics.win_loss_ratio?.toFixed(2) || '0.00'}
        </div>
      </div>

      {/* CAGR & Calmar */}
      <div className="stat-card">
        <div className="stat-label">
          <span>CAGR / Calmar</span>
          <Clock size={15} color="#38bdf8" />
        </div>
        <div className="stat-value val-neutral" style={{ fontSize: '1.15rem' }}>
          {cagr.toFixed(1)}% / {calmar.toFixed(2)}
        </div>
        <div className="stat-sub">
          Fees: ${metrics.total_fees_paid?.toFixed(2) || '0.00'}
        </div>
      </div>
    </div>
  );
}
