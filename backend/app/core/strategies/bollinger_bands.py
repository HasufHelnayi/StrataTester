from typing import Dict, Any
import pandas as pd
from .base import BaseStrategy


class BollingerBandsStrategy(BaseStrategy):
    name = "Bollinger Bands Breakout"
    description = "Enters long when close penetrates the upper band, or short when price breaks below lower band."
    default_params = {
        "period": 20,
        "num_std": 2.0,
    }

    def generate_signals(self, df: pd.DataFrame, params: Dict[str, Any]) -> pd.Series:
        period = int(params.get("period", self.default_params["period"]))
        num_std = float(params.get("num_std", self.default_params["num_std"]))

        close = df["close"]
        sma = close.rolling(window=period).mean()
        rstd = close.rolling(window=period).std()
        upper_band = sma + (num_std * rstd)
        lower_band = sma - (num_std * rstd)

        signal = pd.Series(0, index=df.index, dtype=int)
        signal[close > upper_band] = 1
        signal[close < lower_band] = -1

        return signal
