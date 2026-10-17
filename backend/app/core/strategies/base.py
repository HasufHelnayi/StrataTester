from abc import ABC, abstractmethod
from typing import Dict, Any
import pandas as pd


class BaseStrategy(ABC):
    """
    Abstract Base Class for quantitative trading strategies.
    Every strategy produces a 'signal' Series:
       1  => Long
      -1  => Short
       0  => Flat/Neutral (Cash)
    """

    name: str = "Base Strategy"
    description: str = ""
    default_params: Dict[str, Any] = {}

    @abstractmethod
    def generate_signals(self, df: pd.DataFrame, params: Dict[str, Any]) -> pd.Series:
        """
        Takes OHLCV dataframe and returns a Series of signals indexed by timestamp.
        """
        pass
