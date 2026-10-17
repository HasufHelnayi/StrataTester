from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from ..schemas import BacktestRequest, CustomStrategyRequest, BacktestResponse
from ..core.strategies import get_available_strategies, STRATEGY_REGISTRY
from ..core.data_fetcher import AVAILABLE_SYMBOLS
from ..core.backtest_engine import run_backtest_simulation

router = APIRouter(prefix="/api")


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "StrataTester Quant API",
        "version": "1.0.0",
        "supported_strategies": list(STRATEGY_REGISTRY.keys()),
    }


@router.get("/data/symbols")
def get_symbols():
    return {
        "symbols": AVAILABLE_SYMBOLS,
        "timeframes": [
            {"id": "15m", "label": "15 Minutes"},
            {"id": "1h", "label": "1 Hour"},
            {"id": "4h", "label": "4 Hours"},
            {"id": "1d", "label": "1 Day"},
        ],
        "lookbacks": [
            {"days": 30, "label": "1 Month (30D)"},
            {"days": 90, "label": "3 Months (90D)"},
            {"days": 180, "label": "6 Months (180D)"},
            {"days": 365, "label": "1 Year (365D)"},
        ],
    }


@router.get("/strategies")
def list_strategies():
    return {"strategies": get_available_strategies()}


@router.post("/backtest/run", response_model=BacktestResponse)
def run_backtest(req: BacktestRequest):
    try:
        result = run_backtest_simulation(
            symbol=req.symbol,
            timeframe=req.timeframe,
            lookback_days=req.lookback_days,
            strategy=req.strategy,
            params=req.params,
            initial_capital=req.initial_capital,
            commission_rate=req.commission_rate,
            slippage_rate=req.slippage_rate,
            position_size_pct=req.position_size_pct,
            allow_short=req.allow_short,
            stop_loss_pct=req.stop_loss_pct,
            take_profit_pct=req.take_profit_pct,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/strategies/custom", response_model=BacktestResponse)
def run_custom_strategy(req: CustomStrategyRequest):
    try:
        result = run_backtest_simulation(
            symbol=req.symbol,
            timeframe=req.timeframe,
            lookback_days=req.lookback_days,
            strategy="custom",
            custom_code=req.code,
            initial_capital=req.initial_capital,
            commission_rate=req.commission_rate,
            slippage_rate=req.slippage_rate,
            position_size_pct=req.position_size_pct,
            allow_short=req.allow_short,
            stop_loss_pct=req.stop_loss_pct,
            take_profit_pct=req.take_profit_pct,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Custom strategy error: {str(e)}")


@router.get("/python-template")
def get_python_template():
    template = '''"""
StrataTester Quant Strategy Example
Run this standalone with: python test_strategy.py
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def run_quant_test():
    payload = {
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "lookback_days": 90,
        "strategy": "rsi_reversion",
        "params": {
            "rsi_period": 14,
            "oversold": 30.0,
            "overbought": 70.0
        },
        "initial_capital": 10000.0,
        "commission_rate": 0.001,
        "slippage_rate": 0.0005,
        "allow_short": False
    }

    response = requests.post(f"{BASE_URL}/backtest/run", json=payload)
    data = response.json()

    print("=== QUANTITATIVE TEARSHEET ===")
    metrics = data["metrics"]
    for k, v in metrics.items():
        print(f"  {k:30s}: {v}")

    print(f"\\nTotal Trades Executed: {len(data['trades'])}")
    if data['trades']:
        print("Last trade:", data['trades'][-1])

if __name__ == "__main__":
    run_quant_test()
'''
    return {"template": template}
