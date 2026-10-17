import datetime
import logging
import requests
import numpy as np
import pandas as pd
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# In-memory cache for downloaded historical data: key -> pd.DataFrame
_DATA_CACHE: Dict[str, pd.DataFrame] = {}

AVAILABLE_SYMBOLS = [
    {"symbol": "BTCUSDT", "name": "Bitcoin / Tether", "base": "BTC", "quote": "USDT"},
    {"symbol": "ETHUSDT", "name": "Ethereum / Tether", "base": "ETH", "quote": "USDT"},
    {"symbol": "SOLUSDT", "name": "Solana / Tether", "base": "SOL", "quote": "USDT"},
    {"symbol": "BNBUSDT", "name": "BNB / Tether", "base": "BNB", "quote": "USDT"},
    {"symbol": "XRPUSDT", "name": "Ripple / Tether", "base": "XRP", "quote": "USDT"},
    {"symbol": "DOGEUSDT", "name": "Dogecoin / Tether", "base": "DOGE", "quote": "USDT"},
    {"symbol": "ADAUSDT", "name": "Cardano / Tether", "base": "ADA", "quote": "USDT"},
    {"symbol": "AVAXUSDT", "name": "Avalanche / Tether", "base": "AVAX", "quote": "USDT"},
    {"symbol": "LINKUSDT", "name": "Chainlink / Tether", "base": "LINK", "quote": "USDT"},
]


def fetch_crypto_candles(
    symbol: str = "BTCUSDT",
    interval: str = "1h",
    lookback_days: int = 90,
    force_refresh: bool = False,
) -> pd.DataFrame:
    """
    Fetches OHLCV candlestick data from Binance Public API.
    Gracefully falls back to realistic synthetic data if network/API is unavailable.
    """
    symbol = symbol.upper().replace("/", "")
    cache_key = f"{symbol}_{interval}_{lookback_days}"

    if not force_refresh and cache_key in _DATA_CACHE:
        return _DATA_CACHE[cache_key].copy()

    try:
        df = _fetch_from_binance(symbol, interval, lookback_days)
        if df is not None and not df.empty and len(df) >= 30:
            _DATA_CACHE[cache_key] = df
            return df.copy()
    except Exception as e:
        logger.warning(f"Failed to fetch Binance data for {symbol}: {e}. Falling back to realistic simulation.")

    # Fallback to realistic synthetic crypto market data
    df = _generate_synthetic_crypto(symbol, interval, lookback_days)
    _DATA_CACHE[cache_key] = df
    return df.copy()


def _fetch_from_binance(symbol: str, interval: str, lookback_days: int) -> Optional[pd.DataFrame]:
    # Binance valid intervals: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
    valid_intervals = {"1m", "5m", "15m", "30m", "1h", "2h", "4h", "1d"}
    if interval not in valid_intervals:
        interval = "1h"

    # Max limit per request is 1000
    now = datetime.datetime.now(datetime.timezone.utc)
    start_time = now - datetime.timedelta(days=lookback_days)
    start_ts = int(start_time.timestamp() * 1000)

    url = "https://api.binance.com/api/v3/klines"
    params = {
        "symbol": symbol,
        "interval": interval,
        "startTime": start_ts,
        "limit": 1000,
    }

    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    raw_data = resp.json()

    if not isinstance(raw_data, list) or len(raw_data) == 0:
        return None

    records = []
    for item in raw_data:
        # [open_time, open, high, low, close, volume, close_time, quote_volume, count, ...]
        records.append({
            "timestamp": pd.to_datetime(item[0], unit="ms", utc=True),
            "open": float(item[1]),
            "high": float(item[2]),
            "low": float(item[3]),
            "close": float(item[4]),
            "volume": float(item[5]),
        })

    df = pd.DataFrame(records)
    df.set_index("timestamp", inplace=True)
    df.sort_index(inplace=True)
    return df


def _generate_synthetic_crypto(symbol: str, interval: str, lookback_days: int) -> pd.DataFrame:
    """
    Generates realistic geometric Brownian motion with volatility jumps and intraday noise.
    """
    base_prices = {
        "BTCUSDT": 65000.0,
        "ETHUSDT": 3500.0,
        "SOLUSDT": 150.0,
        "BNBUSDT": 580.0,
        "XRPUSDT": 0.60,
        "DOGEUSDT": 0.12,
        "ADAUSDT": 0.45,
        "AVAXUSDT": 28.0,
        "LINKUSDT": 14.0,
    }
    start_price = base_prices.get(symbol, 100.0)

    tf_hours = {
        "15m": 0.25,
        "1h": 1.0,
        "4h": 4.0,
        "1d": 24.0,
    }.get(interval, 1.0)

    total_bars = int((lookback_days * 24) / tf_hours)
    total_bars = max(total_bars, 100)

    # Hourly volatility ~ 60% annualized
    vol_annual = 0.65
    dt = tf_hours / (365.25 * 24)
    vol = vol_annual * np.sqrt(dt)
    drift = 0.15 * dt

    np.random.seed(hash(symbol) % (2**31))  # Per-symbol deterministic seed
    shocks = np.random.normal(drift, vol, total_bars)
    # Jumps occasionally
    jumps = (np.random.rand(total_bars) < 0.02) * np.random.normal(0, vol * 3.5, total_bars)
    returns = shocks + jumps

    price_path = start_price * np.exp(np.cumsum(returns))

    now = datetime.datetime.now(datetime.timezone.utc)
    freq = f"{int(tf_hours * 60)}min" if tf_hours < 24 else "1D"
    date_range = pd.date_range(end=now, periods=total_bars, freq=freq, tz="UTC")

    records = []
    for dt_val, p in zip(date_range, price_path):
        noise = p * (vol * 0.4)
        c = p
        o = p + np.random.normal(0, noise * 0.5)
        h = max(o, c) + abs(np.random.normal(0, noise))
        l = min(o, c) - abs(np.random.normal(0, noise))
        v = float(np.random.uniform(100, 5000) * (start_price / p))
        records.append({
            "timestamp": dt_val,
            "open": round(float(o), 4),
            "high": round(float(h), 4),
            "low": round(float(l), 4),
            "close": round(float(c), 4),
            "volume": round(float(v), 2),
        })

    df = pd.DataFrame(records)
    df.set_index("timestamp", inplace=True)
    return df
