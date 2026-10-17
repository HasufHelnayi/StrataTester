import numpy as np
from typing import List, Dict, Any


def run_monte_carlo_simulation(
    trades: List[Dict[str, Any]],
    initial_capital: float = 10000.0,
    num_simulations: int = 500,
    random_seed: int = 42,
) -> Dict[str, Any]:
    """
    Runs Monte Carlo trade order reshuffling (bootstrap with replacement)
    to assess drawdown risk, return variance, and probability of ruin.
    """
    if not trades or len(trades) < 2:
        return {
            "error": "At least 2 completed trades are required for Monte Carlo simulation.",
            "num_simulations": 0,
            "metrics": {},
            "percentiles": {},
            "sample_paths": [],
        }

    pnl_list = np.array([float(t.get("pnl", 0.0)) for t in trades])
    num_trades = len(pnl_list)

    # Set deterministic seed for reproducibility
    np.random.seed(random_seed)

    # Reshuffle trades with replacement: shape (num_simulations, num_trades)
    sampled_indices = np.random.randint(0, num_trades, size=(num_simulations, num_trades))
    sampled_pnls = pnl_list[sampled_indices]

    # Cumulative equity trajectories: shape (num_simulations, num_trades + 1)
    cum_pnls = np.cumsum(sampled_pnls, axis=1)
    equity_paths = np.hstack([
        np.full((num_simulations, 1), initial_capital),
        initial_capital + cum_pnls
    ])

    final_equities = equity_paths[:, -1]
    final_returns_pct = ((final_equities - initial_capital) / initial_capital) * 100.0

    # Calculate Max Drawdown for each simulation path
    running_max = np.maximum.accumulate(equity_paths, axis=1)
    drawdowns = (running_max - equity_paths) / np.where(running_max > 0, running_max, 1.0)
    max_drawdowns_pct = np.max(drawdowns, axis=1) * 100.0

    # Risk metrics
    prob_profit = float(np.mean(final_returns_pct > 0) * 100.0)
    prob_loss = float(np.mean(final_returns_pct <= 0) * 100.0)
    prob_dd_15 = float(np.mean(max_drawdowns_pct >= 15.0) * 100.0)
    prob_dd_25 = float(np.mean(max_drawdowns_pct >= 25.0) * 100.0)
    risk_of_ruin = float(np.mean(max_drawdowns_pct >= 50.0) * 100.0)

    # Percentiles over trade sequence (for fan chart visualization)
    p5 = np.percentile(equity_paths, 5, axis=0)
    p25 = np.percentile(equity_paths, 25, axis=0)
    p50 = np.percentile(equity_paths, 50, axis=0)
    p75 = np.percentile(equity_paths, 75, axis=0)
    p95 = np.percentile(equity_paths, 95, axis=0)

    # Select up to 10 representative sample paths for charting
    step_indices = np.linspace(0, num_trades, min(num_trades + 1, 50), dtype=int)
    sample_indices = np.linspace(0, num_simulations - 1, min(num_simulations, 10), dtype=int)
    sample_paths = [
        [round(float(equity_paths[idx, step]), 2) for step in step_indices]
        for idx in sample_indices
    ]

    trade_steps = [int(s) for s in step_indices]

    return {
        "num_simulations": num_simulations,
        "num_trades_simulated": num_trades,
        "metrics": {
            "median_return_pct": round(float(np.median(final_returns_pct)), 2),
            "mean_return_pct": round(float(np.mean(final_returns_pct)), 2),
            "worst_return_5pct": round(float(np.percentile(final_returns_pct, 5)), 2),
            "best_return_95pct": round(float(np.percentile(final_returns_pct, 95)), 2),
            "median_final_equity": round(float(np.median(final_equities)), 2),
            "median_max_drawdown_pct": round(float(np.median(max_drawdowns_pct)), 2),
            "worst_max_drawdown_95pct": round(float(np.percentile(max_drawdowns_pct, 95)), 2),
            "prob_profit_pct": round(prob_profit, 2),
            "prob_loss_pct": round(prob_loss, 2),
            "prob_drawdown_15pct": round(prob_dd_15, 2),
            "prob_drawdown_25pct": round(prob_dd_25, 2),
            "risk_of_ruin_pct": round(risk_of_ruin, 2),
        },
        "percentile_curves": {
            "trade_steps": trade_steps,
            "p5": [round(float(p5[s]), 2) for s in step_indices],
            "p25": [round(float(p25[s]), 2) for s in step_indices],
            "p50": [round(float(p50[s]), 2) for s in step_indices],
            "p75": [round(float(p75[s]), 2) for s in step_indices],
            "p95": [round(float(p95[s]), 2) for s in step_indices],
        },
        "sample_paths": sample_paths,
    }
