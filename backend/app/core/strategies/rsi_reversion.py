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

        # State machine signal generation: enter long when RSI < oversold, exit when RSI > 50 or overbought
        signal = pd.Series(0, index=df.index, dtype=int)
        current_state = 0

        for i in range(len(df)):
            val = rsi.iloc[i]
            if val < oversold:
                current_state = 1
            elif val > overbought:
                current_state = -1
            signal.iloc[i] = current_state

        return signal
