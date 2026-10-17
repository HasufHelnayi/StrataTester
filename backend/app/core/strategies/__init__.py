from typing import Dict, Any, Type
from .base import BaseStrategy
from .sma_cross import SMACrossoverStrategy
from .rsi_reversion import RSIReversionStrategy
from .macd_trend import MACDTrendStrategy
from .bollinger_bands import BollingerBandsStrategy

STRATEGY_REGISTRY: Dict[str, BaseStrategy] = {
    "sma_crossover": SMACrossoverStrategy(),
    "rsi_reversion": RSIReversionStrategy(),
    "macd_trend": MACDTrendStrategy(),
    "bollinger_bands": BollingerBandsStrategy(),
}


def get_available_strategies():
    return [
        {
            "id": strat_id,
            "name": strat.name,
            "description": strat.description,
            "default_params": strat.default_params,
        }
        for strat_id, strat in STRATEGY_REGISTRY.items()
    ]
