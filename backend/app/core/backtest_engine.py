import pandas as pd
import numpy as np
from typing import Dict, Any, List
from .metrics import calculate_tearsheet_metrics
from .data_fetcher import fetch_crypto_candles
from .strategies import STRATEGY_REGISTRY
from .strategies.custom_runner import execute_custom_strategy


def run_backtest_simulation(
    symbol: str = "BTCUSDT",
    timeframe: str = "1h",
    lookback_days: int = 90,
    strategy: str = "sma_crossover",
    params: Dict[str, Any] = None,
    custom_code: str = None,
    initial_capital: float = 10000.0,
    commission_rate: float = 0.001,
    slippage_rate: float = 0.0005,
    position_size_pct: float = 1.0,
    allow_short: bool = False,
    stop_loss_pct: float = None,
    take_profit_pct: float = None,
) -> Dict[str, Any]:
    if params is None:
        params = {}

    # 1. Fetch data
    df = fetch_crypto_candles(symbol=symbol, interval=timeframe, lookback_days=lookback_days)
    if df.empty or len(df) < 5:
        raise ValueError(f"Insufficient historical data retrieved for {symbol} ({timeframe})")

    # 2. Generate Signals
    if custom_code:
        signals = execute_custom_strategy(custom_code, df, params)
    else:
        if strategy not in STRATEGY_REGISTRY:
            raise ValueError(f"Unknown strategy '{strategy}'. Available: {list(STRATEGY_REGISTRY.keys())}")
        strat_instance = STRATEGY_REGISTRY[strategy]
        signals = strat_instance.generate_signals(df, params)

    # Clean signals: ensure only {-1, 0, 1}
    signals = signals.reindex(df.index).fillna(0).astype(int)
    if not allow_short:
        signals = signals.apply(lambda s: 1 if s == 1 else 0)

    # 3. Bar-by-bar Trade Simulation
    # Avoid lookahead bias: signal at bar i dictates desired position for bar i+1
    cash = float(initial_capital)
    position = 0.0  # units of asset held (positive for Long, negative for Short)
    position_type = 0  # 1 = Long, -1 = Short, 0 = Flat
    entry_price = 0.0
    entry_time = None
    entry_bar_idx = 0

    trades: List[Dict[str, Any]] = []
    trade_id_counter = 1

    equity_points: List[Dict[str, Any]] = []
    equity_series = []
    benchmark_series = []
    trade_signals: List[Dict[str, Any]] = []

    first_close = float(df["close"].iloc[0])
    benchmark_units = initial_capital / first_close if first_close > 0 else 1.0

    n_bars = len(df)
    times = df.index
    opens = df["open"].values
    highs = df["high"].values
    lows = df["low"].values
    closes = df["close"].values
    sig_vals = signals.values

    for i in range(n_bars):
        current_time = times[i].isoformat()
        bar_open = float(opens[i])
        bar_high = float(highs[i])
        bar_low = float(lows[i])
        bar_close = float(closes[i])

        # A. Check Stop-Loss / Take-Profit for existing open position before new signals
        if position_type != 0:
            exit_triggered = False
            exit_price_fill = 0.0
            exit_reason = ""

            if position_type == 1:  # LONG
                if stop_loss_pct and bar_low <= entry_price * (1.0 - stop_loss_pct):
                    exit_triggered = True
                    exit_price_fill = entry_price * (1.0 - stop_loss_pct)
                    exit_reason = "stop_loss"
                elif take_profit_pct and bar_high >= entry_price * (1.0 + take_profit_pct):
                    exit_triggered = True
                    exit_price_fill = entry_price * (1.0 + take_profit_pct)
                    exit_reason = "take_profit"
            elif position_type == -1:  # SHORT
                if stop_loss_pct and bar_high >= entry_price * (1.0 + stop_loss_pct):
                    exit_triggered = True
                    exit_price_fill = entry_price * (1.0 + stop_loss_pct)
                    exit_reason = "stop_loss"
                elif take_profit_pct and bar_low <= entry_price * (1.0 - take_profit_pct):
                    exit_triggered = True
                    exit_price_fill = entry_price * (1.0 - take_profit_pct)
                    exit_reason = "take_profit"

            if exit_triggered:
                # Close position
                slippage_adj = (1.0 - slippage_rate) if position_type == 1 else (1.0 + slippage_rate)
                real_exit_price = exit_price_fill * slippage_adj
                fee = abs(position * real_exit_price) * commission_rate

                if position_type == 1:
                    cash += (position * real_exit_price) - fee
                    pnl = (real_exit_price - entry_price) * position - fee
                else:
                    cash = cash + ((entry_price - real_exit_price) * abs(position)) - fee
                    pnl = (entry_price - real_exit_price) * abs(position) - fee

                pnl_pct = (pnl / (abs(position) * entry_price)) * 100.0 if (abs(position) * entry_price) > 0 else 0.0

                trades.append({
                    "trade_id": trade_id_counter,
                    "entry_time": entry_time,
                    "entry_price": round(entry_price, 4),
                    "exit_time": current_time,
                    "exit_price": round(real_exit_price, 4),
                    "type": "LONG" if position_type == 1 else "SHORT",
                    "size": round(abs(position), 4),
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "commission_paid": round(fee, 2),
                    "duration_periods": i - entry_bar_idx,
                    "exit_reason": exit_reason,
                })
                trade_id_counter += 1
                position = 0.0
                position_type = 0

        # B. Signal execution: evaluate desired target from previous bar (or current bar open)
        # Using signal from bar i-1 to enter at bar i open prevents lookahead bias
        target_signal = sig_vals[i - 1] if i > 0 else 0

        # If signal changes position
        if target_signal != position_type:
            exec_price_raw = bar_open

            # Step 1: Close existing position if any
            if position_type != 0:
                slippage_mult = (1.0 - slippage_rate) if position_type == 1 else (1.0 + slippage_rate)
                exit_p = exec_price_raw * slippage_mult
                fee = abs(position * exit_p) * commission_rate

                if position_type == 1:
                    cash += (position * exit_p) - fee
                    pnl = (exit_p - entry_price) * position - fee
                else:
                    cash = cash + ((entry_price - exit_p) * abs(position)) - fee
                    pnl = (entry_price - exit_p) * abs(position) - fee

                pnl_pct = (pnl / (abs(position) * entry_price)) * 100.0 if (abs(position) * entry_price) > 0 else 0.0

                trades.append({
                    "trade_id": trade_id_counter,
                    "entry_time": entry_time,
                    "entry_price": round(entry_price, 4),
                    "exit_time": current_time,
                    "exit_price": round(exit_p, 4),
                    "type": "LONG" if position_type == 1 else "SHORT",
                    "size": round(abs(position), 4),
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "commission_paid": round(fee, 2),
                    "duration_periods": i - entry_bar_idx,
                    "exit_reason": "signal",
                })
                trade_id_counter += 1
                position = 0.0
                position_type = 0

            # Step 2: Open new position if target_signal != 0
            if target_signal == 1:  # Open LONG
                slippage_mult = 1.0 + slippage_rate
                enter_p = exec_price_raw * slippage_mult
                capital_to_use = cash * position_size_pct
                if capital_to_use > 10.0:
                    fee_est = capital_to_use * commission_rate
                    alloc_cash = capital_to_use - fee_est
                    qty = alloc_cash / enter_p
                    actual_fee = qty * enter_p * commission_rate
                    cash -= (qty * enter_p + actual_fee)
                    position = qty
                    position_type = 1
                    entry_price = enter_p
                    entry_time = current_time
                    entry_bar_idx = i

                    trade_signals.append({
                        "time": current_time,
                        "type": "BUY",
                        "price": round(enter_p, 4),
                    })

            elif target_signal == -1 and allow_short:  # Open SHORT
                slippage_mult = 1.0 - slippage_rate
                enter_p = exec_price_raw * slippage_mult
                capital_to_use = cash * position_size_pct
                if capital_to_use > 10.0:
                    fee_est = capital_to_use * commission_rate
                    alloc_cash = capital_to_use - fee_est
                    qty = alloc_cash / enter_p
                    actual_fee = qty * enter_p * commission_rate
                    cash -= actual_fee
                    position = -qty
                    position_type = -1
                    entry_price = enter_p
                    entry_time = current_time
                    entry_bar_idx = i

                    trade_signals.append({
                        "time": current_time,
                        "type": "SELL",
                        "price": round(enter_p, 4),
                    })

        # C. Mark-to-market Equity at bar Close
        if position_type == 1:
            current_equity = cash + (position * bar_close)
        elif position_type == -1:
            current_equity = cash + ((entry_price - bar_close) * abs(position))
        else:
            current_equity = cash

        benchmark_equity = benchmark_units * bar_close

        equity_series.append(current_equity)
        benchmark_series.append(benchmark_equity)

        equity_points.append({
            "time": current_time,
            "equity": round(current_equity, 2),
            "benchmark": round(benchmark_equity, 2),
        })

    # Close any open position on the final bar
    if position_type != 0 and len(df) > 0:
        final_close_raw = float(closes[-1])
        final_time = times[-1].isoformat()

        # Apply slippage on the final exit
        if position_type == 1:
            slippage_mult = 1.0 - slippage_rate
        else:
            slippage_mult = 1.0 + slippage_rate
        final_exit_price = final_close_raw * slippage_mult

        fee = abs(position * final_exit_price) * commission_rate

        if position_type == 1:
            pnl = (final_exit_price - entry_price) * position - fee
        else:
            pnl = (entry_price - final_exit_price) * abs(position) - fee

        pnl_pct = (pnl / (abs(position) * entry_price)) * 100.0 if (abs(position) * entry_price) > 0 else 0.0

        trades.append({
            "trade_id": trade_id_counter,
            "entry_time": entry_time,
            "entry_price": round(entry_price, 4),
            "exit_time": final_time,
            "exit_price": round(final_exit_price, 4),
            "type": "LONG" if position_type == 1 else "SHORT",
            "size": round(abs(position), 4),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "commission_paid": round(fee, 2),
            "duration_periods": n_bars - 1 - entry_bar_idx,
            "exit_reason": "end_of_data",
        })

    # 4. Compute Quant Tearsheet Metrics
    eq_ser = pd.Series(equity_series, index=df.index)
    bm_ser = pd.Series(benchmark_series, index=df.index)
    metrics = calculate_tearsheet_metrics(
        equity_series=eq_ser,
        benchmark_series=bm_ser,
        trades=trades,
        timeframe=timeframe,
        initial_capital=initial_capital,
    )

    # Calculate Drawdown curve for charts
    cummax = eq_ser.cummax()
    dd_curve = ((eq_ser - cummax) / cummax) * 100.0

    for i, pt in enumerate(equity_points):
        pt["drawdown"] = round(float(dd_curve.iloc[i]), 2)

    # 5. Format Candles for lightweight/candlestick chart
    candles = [
        {
            "timestamp": t.isoformat(),
            "open": round(float(o), 4),
            "high": round(float(h), 4),
            "low": round(float(l), 4),
            "close": round(float(c), 4),
            "volume": round(float(v), 2),
        }
        for t, o, h, l, c, v in zip(times, opens, highs, lows, closes, df["volume"].values)
    ]

    return {
        "status": "success",
        "symbol": symbol,
        "timeframe": timeframe,
        "strategy": strategy,
        "params": params,
        "metrics": metrics,
        "candles": candles,
        "equity_curve": equity_points,
        "trades": trades,
        "signals": trade_signals,
    }
