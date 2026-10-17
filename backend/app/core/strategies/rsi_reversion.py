from typing import Dict, Any
import pandas as pd
import numpy as np
from .base import BaseStrategy


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)


class RSIReversionStrategy(BaseStrategy):
    name = "RSI Mean Reversion"
    description = "Buys when RSI dips into oversold territory, sells/shorts when reaching overbought threshold."
    default_params = {
        "rsi_period": 14,
        "oversold": 30.0,
        "overbought": 70.0,
    }

    def generate_signals(self, df: pd.DataFrame, params: Dict[str, Any]) -> pd.Series:
        period = int(params.get("rsi_period", self.default_params["rsi_period"]))
        oversold = float(params.get("oversold", self.default_params["oversold"]))
        overbought = float(params.get("overbought", self.default_params["overbought"]))

        rsi = compute_rsi(df["close"], period=period)

        # High-performance NumPy array state machine
        rsi_vals = rsi.values
        n = len(rsi_vals)
        sig_arr = np.zeros(n, dtype=np.int64)
        current_state = 0

        for i in range(n):
            val = rsi_vals[i]
            if np.isnan(val):
                sig_arr[i] = 0
                continue
            if val < oversold:
                current_state = 1
            elif val > overbought:
                current_state = -1
            sig_arr[i] = current_state

        return pd.Series(sig_arr, index=df.index, dtype=int)
