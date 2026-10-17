import numpy as np
import pandas as pd
from typing import Dict, List, Any


def calculate_tearsheet_metrics(
    equity_series: pd.Series,
    benchmark_series: pd.Series,
    trades: List[Dict[str, Any]],
    timeframe: str = "1h",
    initial_capital: float = 10000.0,
    risk_free_rate: float = 0.0,
) -> Dict[str, Any]:
    """
    Computes rigorous quantitative tearsheet metrics.
    Handles division by zero and edge cases gracefully.
    """
    if equity_series.empty or len(equity_series) < 2:
        return _empty_metrics(initial_capital)

    # Periods per year based on timeframe
    tf_lower = timeframe.lower()
    if tf_lower in ["1m", "m1"]:
        periods_per_year = 365.25 * 24 * 60
    elif tf_lower in ["5m", "m5"]:
        periods_per_year = 365.25 * 24 * 12
    elif tf_lower in ["15m", "m15"]:
        periods_per_year = 365.25 * 24 * 4
    elif tf_lower in ["1h", "h1"]:
        periods_per_year = 365.25 * 24
    elif tf_lower in ["4h", "h4"]:
        periods_per_year = 365.25 * 6
    elif tf_lower in ["1d", "d1"]:
        periods_per_year = 365.25
    else:
        periods_per_year = 365.25 * 24  # default to hourly

    # Equity and returns
    final_equity = float(equity_series.iloc[-1])
    net_profit = final_equity - initial_capital
    net_profit_pct = (net_profit / initial_capital) * 100.0

    # Benchmark return (Buy & hold)
    if not benchmark_series.empty and benchmark_series.iloc[0] > 0:
        benchmark_return_pct = float(((benchmark_series.iloc[-1] - benchmark_series.iloc[0]) / benchmark_series.iloc[0]) * 100.0)
    else:
        benchmark_return_pct = 0.0

    # Returns per bar
    pct_returns = equity_series.pct_change().dropna()
    total_bars = len(equity_series)
    years = max(total_bars / periods_per_year, 1.0 / periods_per_year)

    # CAGR
    if final_equity > 0 and initial_capital > 0:
        cagr = (pow(final_equity / initial_capital, 1.0 / years) - 1.0) * 100.0
    else:
        cagr = -100.0

    # Volatility (Annualized)
    if len(pct_returns) > 1 and pct_returns.std() > 0:
        vol_annual = float(pct_returns.std() * np.sqrt(periods_per_year) * 100.0)
    else:
        vol_annual = 0.0

    # Sharpe Ratio
    rf_per_period = risk_free_rate / periods_per_year
    excess_returns = pct_returns - rf_per_period
    std_excess = float(pct_returns.std())
    if std_excess > 1e-9:
        mean_excess = float(excess_returns.mean())
        sharpe_ratio = float((mean_excess / std_excess) * np.sqrt(periods_per_year))
    else:
        sharpe_ratio = 0.0

    # Sortino Ratio (Downside deviation)
    negative_returns = pct_returns[pct_returns < 0]
    if len(negative_returns) > 1:
        downside_std = float(negative_returns.std())
        if downside_std > 1e-9:
            sortino_ratio = float((mean_excess / downside_std) * np.sqrt(periods_per_year))
        else:
            sortino_ratio = 0.0
    else:
        sortino_ratio = 0.0 if sharpe_ratio <= 0 else sharpe_ratio * 1.5

    # Drawdown calculation
    cummax = equity_series.cummax()
    drawdowns = (equity_series - cummax) / cummax
    max_dd = float(abs(drawdowns.min())) * 100.0

    # Max Drawdown Duration (consecutive bars in drawdown)
    in_dd = drawdowns < 0
    dd_groups = (~in_dd).cumsum()
    dd_duration = int(in_dd.groupby(dd_groups).sum().max()) if in_dd.any() else 0

    # Calmar Ratio
    if max_dd > 0.01:
        calmar_ratio = float(cagr / max_dd)
    else:
        calmar_ratio = float(cagr / 0.01) if cagr > 0 else 0.0

    # Trade statistics
    total_trades = len(trades)
    winning_trades = [t for t in trades if t["pnl"] > 0]
    losing_trades = [t for t in trades if t["pnl"] < 0]
    num_wins = len(winning_trades)
    num_losses = len(losing_trades)

    win_rate_pct = (num_wins / total_trades * 100.0) if total_trades > 0 else 0.0

    gross_profit = sum(t["pnl"] for t in winning_trades)
    gross_loss = abs(sum(t["pnl"] for t in losing_trades))

    if gross_loss > 0:
        profit_factor = float(gross_profit / gross_loss)
    elif gross_profit > 0:
        profit_factor = 999.0
    else:
        profit_factor = 0.0

    avg_trade_pnl = float(np.mean([t["pnl"] for t in trades])) if total_trades > 0 else 0.0
    avg_trade_pnl_pct = float(np.mean([t["pnl_pct"] for t in trades])) if total_trades > 0 else 0.0

    avg_win_pnl = float(np.mean([t["pnl"] for t in winning_trades])) if num_wins > 0 else 0.0
    avg_loss_pnl = float(np.mean([t["pnl"] for t in losing_trades])) if num_losses > 0 else 0.0

    win_loss_ratio = float(abs(avg_win_pnl / avg_loss_pnl)) if abs(avg_loss_pnl) > 0 else (999.0 if avg_win_pnl > 0 else 0.0)

    # Expectancy ($ per trade) = (Win% * AvgWin) - (Loss% * AvgLoss)
    p_win = num_wins / total_trades if total_trades > 0 else 0.0
    p_loss = num_losses / total_trades if total_trades > 0 else 0.0
    expectancy = float((p_win * avg_win_pnl) - (p_loss * abs(avg_loss_pnl)))

    total_fees = float(sum(t.get("commission_paid", 0.0) for t in trades))

    return {
        "initial_capital": round(initial_capital, 2),
        "final_equity": round(final_equity, 2),
        "net_profit": round(net_profit, 2),
        "net_profit_pct": round(net_profit_pct, 2),
        "benchmark_return_pct": round(benchmark_return_pct, 2),
        "cagr_pct": round(cagr, 2),
        "annualized_volatility_pct": round(vol_annual, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "sortino_ratio": round(sortino_ratio, 2),
        "calmar_ratio": round(calmar_ratio, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "max_drawdown_duration_bars": dd_duration,
        "total_trades": total_trades,
        "winning_trades": num_wins,
        "losing_trades": num_losses,
        "win_rate_pct": round(win_rate_pct, 2),
        "profit_factor": round(profit_factor, 2),
        "avg_trade_pnl": round(avg_trade_pnl, 2),
        "avg_trade_pnl_pct": round(avg_trade_pnl_pct, 2),
        "avg_win_pnl": round(avg_win_pnl, 2),
        "avg_loss_pnl": round(avg_loss_pnl, 2),
        "win_loss_ratio": round(win_loss_ratio, 2),
        "expectancy": round(expectancy, 2),
        "total_fees_paid": round(total_fees, 2),
    }


def _empty_metrics(initial_capital: float) -> Dict[str, Any]:
    return {
        "initial_capital": round(initial_capital, 2),
        "final_equity": round(initial_capital, 2),
        "net_profit": 0.0,
        "net_profit_pct": 0.0,
        "benchmark_return_pct": 0.0,
        "cagr_pct": 0.0,
        "annualized_volatility_pct": 0.0,
        "sharpe_ratio": 0.0,
        "sortino_ratio": 0.0,
        "calmar_ratio": 0.0,
        "max_drawdown_pct": 0.0,
        "max_drawdown_duration_bars": 0,
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "win_rate_pct": 0.0,
        "profit_factor": 0.0,
        "avg_trade_pnl": 0.0,
        "avg_trade_pnl_pct": 0.0,
        "avg_win_pnl": 0.0,
        "avg_loss_pnl": 0.0,
        "win_loss_ratio": 0.0,
        "expectancy": 0.0,
        "total_fees_paid": 0.0,
    }
