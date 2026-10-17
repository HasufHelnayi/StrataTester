from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    symbol: str = Field(default="BTCUSDT", description="Trading pair symbol (e.g. BTCUSDT, ETHUSDT)")
    timeframe: str = Field(default="1h", description="Candle interval (15m, 1h, 4h, 1d)")
    lookback_days: int = Field(default=90, ge=1, le=730, description="Historical days to test")
    strategy: str = Field(default="sma_crossover", description="Strategy identifier")
    params: Dict[str, Any] = Field(default_factory=dict, description="Strategy parameters")
    initial_capital: float = Field(default=10000.0, gt=0, description="Starting cash")
    commission_rate: float = Field(default=0.001, ge=0, description="Fee rate per trade (0.001 = 0.1% taker fee)")
    slippage_rate: float = Field(default=0.0005, ge=0, description="Assumed execution slippage (0.0005 = 0.05%)")
    position_size_pct: float = Field(default=1.0, gt=0, le=1.0, description="Fraction of available capital per trade")
    allow_short: bool = Field(default=False, description="Allow short selling")
    stop_loss_pct: Optional[float] = Field(default=None, description="Stop loss percentage (e.g. 0.03 for 3%)")
    take_profit_pct: Optional[float] = Field(default=None, description="Take profit percentage (e.g. 0.06 for 6%)")


class CustomStrategyRequest(BaseModel):
    symbol: str = Field(default="BTCUSDT")
    timeframe: str = Field(default="1h")
    lookback_days: int = Field(default=90, ge=1, le=730)
    code: str = Field(..., description="Python strategy script implementing generate_signals(df)")
    initial_capital: float = Field(default=10000.0, gt=0)
    commission_rate: float = Field(default=0.001, ge=0)
    slippage_rate: float = Field(default=0.0005, ge=0)
    position_size_pct: float = Field(default=1.0, gt=0, le=1.0, description="Fraction of available capital per trade")
    allow_short: bool = Field(default=False)
    stop_loss_pct: Optional[float] = Field(default=None, description="Stop loss percentage (e.g. 0.03 for 3%)")
    take_profit_pct: Optional[float] = Field(default=None, description="Take profit percentage (e.g. 0.06 for 6%)")


class TradeRecord(BaseModel):
    trade_id: int
    entry_time: str
    entry_price: float
    exit_time: str
    exit_price: float
    type: str  # "LONG" or "SHORT"
    size: float
    pnl: float
    pnl_pct: float
    commission_paid: float
    duration_periods: int
    exit_reason: str  # "signal", "stop_loss", "take_profit", "end_of_data"


class TearsheetMetrics(BaseModel):
    initial_capital: float
    final_equity: float
    net_profit: float
    net_profit_pct: float
    benchmark_return_pct: float  # Buy and hold return
    cagr_pct: float
    annualized_volatility_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_drawdown_pct: float
    max_drawdown_duration_bars: int
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    avg_trade_pnl: float
    avg_trade_pnl_pct: float
    avg_win_pnl: float
    avg_loss_pnl: float
    win_loss_ratio: float
    expectancy: float
    total_fees_paid: float


class CandleData(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class BacktestResponse(BaseModel):
    status: str = "success"
    symbol: str
    timeframe: str
    strategy: str
    params: Dict[str, Any]
    metrics: TearsheetMetrics
    candles: List[CandleData]
    equity_curve: List[Dict[str, Any]]  # [{"time": str, "equity": float, "benchmark": float, "drawdown": float}]
    trades: List[TradeRecord]
    signals: List[Dict[str, Any]]  # [{"time": str, "signal": int, "price": float}]


class MonteCarloRequest(BaseModel):
    trades: List[Dict[str, Any]]
    initial_capital: float = Field(default=10000.0, gt=0)
    num_simulations: int = Field(default=500, ge=50, le=2000)


class MonteCarloResponse(BaseModel):
    status: str = "success"
    num_simulations: int
    num_trades_simulated: int
    metrics: Dict[str, Any]
    percentile_curves: Dict[str, Any]
    sample_paths: List[List[float]]


class OptimizationRequest(BaseModel):
    strategy: str = Field(default="sma_crossover")
    symbol: str = Field(default="BTCUSDT")
    timeframe: str = Field(default="1h")
    lookback_days: int = Field(default=90, ge=1, le=730)
    param_grid: Dict[str, List[Any]] = Field(default_factory=dict)
    initial_capital: float = Field(default=10000.0, gt=0)
    commission_rate: float = Field(default=0.001, ge=0.0)
    slippage_rate: float = Field(default=0.0005, ge=0.0)
    position_size_pct: float = Field(default=1.0, ge=0.01, le=1.0)
    allow_short: bool = Field(default=False)
    stop_loss_pct: Optional[float] = Field(default=None)
    take_profit_pct: Optional[float] = Field(default=None)
    sort_by: str = Field(default="sharpe_ratio")
    max_combinations: int = Field(default=36, ge=1, le=100)


class OptimizationResponse(BaseModel):
    status: str = "success"
    strategy: str
    symbol: str
    timeframe: str
    lookback_days: int
    total_combinations_tested: int
    sorted_by: str
    best_result: Optional[Dict[str, Any]]
    leaderboard: List[Dict[str, Any]]

