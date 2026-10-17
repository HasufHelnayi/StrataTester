import requests
import json
from typing import Dict, Any, Optional
import pandas as pd


class BacktestResult:
    def __init__(self, raw_data: Dict[str, Any]):
        self.raw_data = raw_data
        self.symbol = raw_data.get("symbol", "")
        self.timeframe = raw_data.get("timeframe", "")
        self.strategy = raw_data.get("strategy", "")
        self.params = raw_data.get("params", {})
        self.metrics = raw_data.get("metrics", {})
        self.trades = raw_data.get("trades", [])
        self.equity_curve = raw_data.get("equity_curve", [])
        self.candles = raw_data.get("candles", [])

    def tearsheet(self) -> str:
        """
        Formats and returns a clean, institutional-grade quantitative tearsheet report.
        """
        m = self.metrics
        sep = "=" * 65
        subsep = "-" * 65

        lines = [
            sep,
            f" STRATATESTER QUANTITATIVE TEARSHEET: {self.symbol} ({self.timeframe})",
            f" Strategy: {self.strategy.upper()} | Initial Capital: ${m.get('initial_capital', 0):,.2f}",
            sep,
            f"  Net Profit ($)            : ${m.get('net_profit', 0):>12,.2f}  ({m.get('net_profit_pct', 0):+.2f}%)",
            f"  Benchmark Return (B&H)    : {m.get('benchmark_return_pct', 0):+12.2f}%",
            f"  CAGR                      : {m.get('cagr_pct', 0):>12.2f}%",
            f"  Annualized Volatility     : {m.get('annualized_volatility_pct', 0):>12.2f}%",
            subsep,
            f"  Sharpe Ratio              : {m.get('sharpe_ratio', 0):>12.2f}",
            f"  Sortino Ratio             : {m.get('sortino_ratio', 0):>12.2f}",
            f"  Calmar Ratio              : {m.get('calmar_ratio', 0):>12.2f}",
            f"  Max Drawdown              : {m.get('max_drawdown_pct', 0):>12.2f}%",
            f"  Max Drawdown Duration     : {m.get('max_drawdown_duration_bars', 0):>12d} bars",
            subsep,
            f"  Total Trades Executed     : {m.get('total_trades', 0):>12d}",
            f"  Winning Trades            : {m.get('winning_trades', 0):>12d}",
            f"  Losing Trades             : {m.get('losing_trades', 0):>12d}",
            f"  Win Rate                  : {m.get('win_rate_pct', 0):>12.2f}%",
            f"  Profit Factor             : {m.get('profit_factor', 0):>12.2f}",
            f"  Win / Loss Ratio          : {m.get('win_loss_ratio', 0):>12.2f}",
            f"  Average Trade PnL ($)     : ${m.get('avg_trade_pnl', 0):>12.2f}",
            f"  Expectancy ($ per trade)  : ${m.get('expectancy', 0):>12.2f}",
            f"  Total Fees / Commission   : ${m.get('total_fees_paid', 0):>12.2f}",
            sep,
        ]
        return "\n".join(lines)

    def equity_df(self) -> pd.DataFrame:
        """Returns equity curve as a pandas DataFrame."""
        if not self.equity_curve:
            return pd.DataFrame()
        df = pd.DataFrame(self.equity_curve)
        df["time"] = pd.to_datetime(df["time"])
        df.set_index("time", inplace=True)
        return df

    def trades_df(self) -> pd.DataFrame:
        """Returns trade log as a pandas DataFrame."""
        if not self.trades:
            return pd.DataFrame()
        return pd.DataFrame(self.trades)


class StrataClient:
    """
    Python Client SDK for interacting with StrataTester Quant API.
    """

    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url.rstrip("/")

    def ping(self) -> bool:
        """Verify API health and connectivity."""
        try:
            r = requests.get(f"{self.base_url}/api/health", timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    def get_symbols(self) -> Dict[str, Any]:
        """Fetch available crypto pairs and supported timeframes."""
        r = requests.get(f"{self.base_url}/api/data/symbols", timeout=10)
        r.raise_for_status()
        return r.json()

    def get_strategies(self) -> Dict[str, Any]:
        """Fetch available built-in strategies and default parameters."""
        r = requests.get(f"{self.base_url}/api/strategies", timeout=10)
        r.raise_for_status()
        return r.json()

    def run_backtest(
        self,
        symbol: str = "BTCUSDT",
        timeframe: str = "1h",
        lookback_days: int = 90,
        strategy: str = "sma_crossover",
        params: Optional[Dict[str, Any]] = None,
        initial_capital: float = 10000.0,
        commission_rate: float = 0.001,
        slippage_rate: float = 0.0005,
        position_size_pct: float = 1.0,
        allow_short: bool = False,
        stop_loss_pct: Optional[float] = None,
        take_profit_pct: Optional[float] = None,
    ) -> BacktestResult:
        """
        Runs a quantitative backtest against historical market data.
        """
        payload = {
            "symbol": symbol,
            "timeframe": timeframe,
            "lookback_days": lookback_days,
            "strategy": strategy,
            "params": params or {},
            "initial_capital": initial_capital,
            "commission_rate": commission_rate,
            "slippage_rate": slippage_rate,
            "position_size_pct": position_size_pct,
            "allow_short": allow_short,
            "stop_loss_pct": stop_loss_pct,
            "take_profit_pct": take_profit_pct,
        }

        r = requests.post(f"{self.base_url}/api/backtest/run", json=payload, timeout=60)
        if not r.ok:
            raise RuntimeError(f"Backtest API error ({r.status_code}): {r.text}")

        return BacktestResult(r.json())

    def run_custom_code(
        self,
        code: str,
        symbol: str = "BTCUSDT",
        timeframe: str = "1h",
        lookback_days: int = 90,
        initial_capital: float = 10000.0,
        commission_rate: float = 0.001,
        slippage_rate: float = 0.0005,
        position_size_pct: float = 1.0,
        allow_short: bool = False,
        stop_loss_pct: Optional[float] = None,
        take_profit_pct: Optional[float] = None,
    ) -> BacktestResult:
        """
        Runs a custom Python strategy script directly on the StrataTester engine.
        """
        payload = {
            "code": code,
            "symbol": symbol,
            "timeframe": timeframe,
            "lookback_days": lookback_days,
            "initial_capital": initial_capital,
            "commission_rate": commission_rate,
            "slippage_rate": slippage_rate,
            "position_size_pct": position_size_pct,
            "allow_short": allow_short,
            "stop_loss_pct": stop_loss_pct,
            "take_profit_pct": take_profit_pct,
        }

        r = requests.post(f"{self.base_url}/api/strategies/custom", json=payload, timeout=60)
        if not r.ok:
            raise RuntimeError(f"Custom Strategy API error ({r.status_code}): {r.text}")

        return BacktestResult(r.json())

    def run_monte_carlo(
        self,
        trades: list,
        initial_capital: float = 10000.0,
        num_simulations: int = 500,
    ) -> Dict[str, Any]:
        """
        Executes Monte Carlo trade reshuffling to calculate confidence intervals and drawdown risk.
        """
        payload = {
            "trades": trades,
            "initial_capital": initial_capital,
            "num_simulations": num_simulations,
        }
        r = requests.post(f"{self.base_url}/api/analytics/monte-carlo", json=payload, timeout=30)
        if not r.ok:
            raise RuntimeError(f"Monte Carlo API error ({r.status_code}): {r.text}")
        return r.json()

    def optimize_parameters(
        self,
        strategy: str,
        param_grid: Dict[str, list],
        symbol: str = "BTCUSDT",
        timeframe: str = "1h",
        lookback_days: int = 90,
        initial_capital: float = 10000.0,
        commission_rate: float = 0.001,
        slippage_rate: float = 0.0005,
        position_size_pct: float = 1.0,
        allow_short: bool = False,
        stop_loss_pct: Optional[float] = None,
        take_profit_pct: Optional[float] = None,
        sort_by: str = "sharpe_ratio",
        max_combinations: int = 36,
    ) -> Dict[str, Any]:
        """
        Performs grid search parameter sweep across combinations for a given strategy.
        """
        payload = {
            "strategy": strategy,
            "symbol": symbol,
            "timeframe": timeframe,
            "lookback_days": lookback_days,
            "param_grid": param_grid,
            "initial_capital": initial_capital,
            "commission_rate": commission_rate,
            "slippage_rate": slippage_rate,
            "position_size_pct": position_size_pct,
            "allow_short": allow_short,
            "stop_loss_pct": stop_loss_pct,
            "take_profit_pct": take_profit_pct,
            "sort_by": sort_by,
            "max_combinations": max_combinations,
        }
        r = requests.post(f"{self.base_url}/api/strategies/optimize", json=payload, timeout=120)
        if not r.ok:
            raise RuntimeError(f"Optimization API error ({r.status_code}): {r.text}")
        return r.json()

