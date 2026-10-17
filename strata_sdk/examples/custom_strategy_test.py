import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from strata_sdk import StrataClient

CUSTOM_CODE = """
def generate_signals(df):
    # Custom Dual Exponential Moving Average Strategy
    # Fast 8 EMA crossing Slow 21 EMA
    ema8 = df['close'].ewm(span=8, adjust=False).mean()
    ema21 = df['close'].ewm(span=21, adjust=False).mean()
    
    signals = (ema8 > ema21).astype(int)
    return signals
"""

def main():
    client = StrataClient("http://127.0.0.1:8000")
    if not client.ping():
        print("API server is not running! Start it with: python backend/main.py")
        return

    print("Submitting Custom Python Strategy Code to StrataTester API...")
    result = client.run_custom_code(
        code=CUSTOM_CODE,
        symbol="ETHUSDT",
        timeframe="4h",
        lookback_days=180,
        initial_capital=25000.0,
        commission_rate=0.0008,
        slippage_rate=0.0004,
        allow_short=False,
    )

    print(result.tearsheet())

if __name__ == "__main__":
    main()
