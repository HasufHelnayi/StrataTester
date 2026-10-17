from typing import Dict, Any
import pandas as pd
from .base import BaseStrategy


class SMACrossoverStrategy(BaseStrategy):
    name = "SMA Crossover"
    description = "Golden Cross / Death Cross trend-following strategy using fast and slow Simple Moving Averages."
    default_params = {
        "fast_period": 10,
        "slow_period": 30,
    }

    def generate_signals(self, df: pd.DataFrame, params: Dict[str, Any]) -> pd.Series:
        fast_p = int(params.get("fast_period", self.default_params["fast_period"]))
        slow_p = int(params.get("slow_period", self.default_params["slow_period"]))

        close = df["close"]
        sma_fast = close.rolling(window=fast_p).mean()
        sma_slow = close.rolling(window=slow_p).mean()

        signal = pd.Series(0, index=df.index, dtype=int)
        signal[sma_fast > sma_slow] = 1
        signal[sma_fast < sma_slow] = -1

        return signal
