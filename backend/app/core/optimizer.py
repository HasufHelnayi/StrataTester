import itertools
from typing import Dict, Any, List
from .backtest_engine import run_backtest_simulation


def optimize_strategy_parameters(
    strategy: str,
    symbol: str = "BTCUSDT",
    timeframe: str = "1h",
    lookback_days: int = 90,
    param_grid: Dict[str, List[Any]] = None,
    initial_capital: float = 10000.0,
    commission_rate: float = 0.001,
    slippage_rate: float = 0.0005,
    position_size_pct: float = 1.0,
    allow_short: bool = False,
    stop_loss_pct: float = None,
    take_profit_pct: float = None,
    sort_by: str = "sharpe_ratio",
    max_combinations: int = 36,
) -> Dict[str, Any]:
    """
    Performs grid search parameter sweep across combinations for a given strategy.
    Returns ranked leaderboard with Sharpe, Profit, Drawdown, and Win Rate.
    """
    if not param_grid:
        param_grid = {}

    keys = list(param_grid.keys())
    values_product = list(itertools.product(*[param_grid[k] for k in keys]))

    # Filter invalid combinations if applicable (e.g. fast >= slow)
    valid_combos = []
    for val_tuple in values_product:
        combo = dict(zip(keys, val_tuple))
        if "fast_period" in combo and "slow_period" in combo:
            if combo["fast_period"] >= combo["slow_period"]:
                continue
        if "oversold" in combo and "overbought" in combo:
            if combo["oversold"] >= combo["overbought"]:
                continue
        valid_combos.append(combo)

    # Cap combinations to avoid long execution times
    combos_to_test = valid_combos[:max_combinations]

    results: List[Dict[str, Any]] = []

    for combo in combos_to_test:
        try:
            bt = run_backtest_simulation(
                symbol=symbol,
                timeframe=timeframe,
                lookback_days=lookback_days,
                strategy=strategy,
                params=combo,
                initial_capital=initial_capital,
                commission_rate=commission_rate,
                slippage_rate=slippage_rate,
                position_size_pct=position_size_pct,
                allow_short=allow_short,
                stop_loss_pct=stop_loss_pct,
                take_profit_pct=take_profit_pct,
            )
            metrics = bt.get("metrics", {})
            results.append({
                "params": combo,
                "sharpe_ratio": metrics.get("sharpe_ratio", 0.0),
                "net_profit_pct": metrics.get("net_profit_pct", 0.0),
                "cagr_pct": metrics.get("cagr_pct", 0.0),
                "max_drawdown_pct": metrics.get("max_drawdown_pct", 0.0),
                "win_rate_pct": metrics.get("win_rate_pct", 0.0),
                "profit_factor": metrics.get("profit_factor", 0.0),
                "total_trades": metrics.get("total_trades", 0),
            })
        except Exception as e:
            # Skip failed combinations gracefully
            continue

    # Sort results
    reverse = True
    if sort_by == "max_drawdown_pct":
        reverse = False  # lower drawdown is better
    results.sort(key=lambda x: x.get(sort_by, 0.0), reverse=reverse)

    # Assign ranks
    for idx, item in enumerate(results):
        item["rank"] = idx + 1

    best_result = results[0] if results else None

    return {
        "strategy": strategy,
        "symbol": symbol,
        "timeframe": timeframe,
        "lookback_days": lookback_days,
        "total_combinations_tested": len(results),
        "sorted_by": sort_by,
        "best_result": best_result,
        "leaderboard": results,
    }
