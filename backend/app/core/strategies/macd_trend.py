from typing import Dict, Any
import pandas as pd
from .base import BaseStrategy


class MACDTrendStrategy(BaseStrategy):
    name = "MACD Trend Following"
    description = "Trades based on Moving Average Convergence Divergence line crossing the 9-period Signal line."
    default_params = {
        "fast_ema": 12,
        "slow_ema": 26,
        "signal_period": 9,
    }

    def generate_signals(self, df: pd.DataFrame, params: Dict[str, Any]) -> pd.Series:
        fast_p = int(params.get("fast_ema", self.default_params["fast_ema"]))
        slow_p = int(params.get("slow_ema", self.default_params["slow_ema"]))
        sig_p = int(params.get("signal_period", self.default_params["signal_period"]))

        close = df["close"]
        ema_fast = close.ewm(span=fast_p, adjust=False).mean()
        ema_slow = close.ewm(span=slow_p, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=sig_p, adjust=False).mean()

        signal = pd.Series(0, index=df.index, dtype=int)
        signal[macd_line > signal_line] = 1
        signal[macd_line < signal_line] = -1

        return signal
