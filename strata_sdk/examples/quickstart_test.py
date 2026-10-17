import sys
import os

# Add parent directory to path so strata_sdk can be imported directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from strata_sdk import StrataClient

def main():
    print("Connecting to StrataTester API at http://127.0.0.1:8000 ...")
    client = StrataClient("http://127.0.0.1:8000")

    if not client.ping():
        print("API server is not running! Start it with: python backend/main.py")
        return

    print("Running RSI Mean Reversion Backtest on BTCUSDT (1h timeframe, 90 days)...")
    result = client.run_backtest(
        symbol="BTCUSDT",
        timeframe="1h",
        lookback_days=90,
        strategy="rsi_reversion",
        params={
            "rsi_period": 14,
            "oversold": 30.0,
            "overbought": 70.0,
        },
        initial_capital=10000.0,
        commission_rate=0.001,  # 0.1% Binance spot fee
        slippage_rate=0.0005,   # 0.05% slippage
        allow_short=False,
    )

    print(result.tearsheet())

    trades_df = result.trades_df()
    if not trades_df.empty:
        print("\nLast 3 Trades:")
        print(trades_df[["trade_id", "entry_time", "entry_price", "exit_time", "exit_price", "pnl", "pnl_pct", "exit_reason"]].tail(3))

if __name__ == "__main__":
    main()
