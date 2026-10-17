import pandas as pd
import numpy as np
from typing import Dict, Any


def execute_custom_strategy(code_str: str, df: pd.DataFrame, params: Dict[str, Any] = None) -> pd.Series:
    """
    Executes a custom user Python code string in a controlled namespace.
    Expects the code to define `generate_signals(df)` or assign a Series to `signals`.
    """
    if params is None:
        params = {}

    local_namespace = {
        "df": df.copy(),
        "pd": pd,
        "np": np,
        "params": params,
    }

    # Safe builtins
    safe_builtins = {
        "range": range,
        "len": len,
        "min": min,
        "max": max,
        "sum": sum,
        "abs": abs,
        "round": round,
        "int": int,
        "float": float,
        "str": str,
        "bool": bool,
        "dict": dict,
        "list": list,
        "tuple": tuple,
        "enumerate": enumerate,
        "zip": zip,
        "print": print,
    }

    exec_globals = {
        "__builtins__": safe_builtins,
        "pd": pd,
        "np": np,
    }

    try:
        exec(code_str, exec_globals, local_namespace)
    except Exception as e:
        raise ValueError(f"Execution error in custom strategy code: {e}")

    if "generate_signals" in local_namespace and callable(local_namespace["generate_signals"]):
        signals = local_namespace["generate_signals"](df)
    elif "signals" in local_namespace:
        signals = local_namespace["signals"]
    else:
        raise ValueError("Custom script must either define `def generate_signals(df):` or produce a `signals` variable.")

    if not isinstance(signals, (pd.Series, np.ndarray, list)):
        raise ValueError(f"Expected signals to be pandas Series or array, got {type(signals)}")

    if isinstance(signals, (np.ndarray, list)):
        signals = pd.Series(signals, index=df.index)

    return signals.fillna(0).astype(int)
