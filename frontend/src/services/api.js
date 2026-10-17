const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchSymbols() {
  const res = await fetch(`${API_BASE}/data/symbols`);
  return res.json();
}

export async function fetchStrategies() {
  const res = await fetch(`${API_BASE}/strategies`);
  return res.json();
}

export async function runBacktest(payload) {
  const res = await fetch(`${API_BASE}/backtest/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Backtest failed");
  }
  return res.json();
}

export async function runCustomStrategy(payload) {
  const res = await fetch(`${API_BASE}/strategies/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Custom strategy execution failed");
  }
  return res.json();
}

export async function fetchPythonTemplate() {
  const res = await fetch(`${API_BASE}/python-template`);
  return res.json();
}
