import React from 'react';
import { Sliders, Settings2, DollarSign, Percent, ShieldCheck } from 'lucide-react';

export default function StrategyControls({
  config,
  setConfig,
  symbols,
  timeframes,
  lookbacks,
  strategies,
}) {
  const currentStrategy = strategies?.find((s) => s.id === config.strategy) || strategies?.[0];

  const handleParamChange = (paramKey, value) => {
    setConfig((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        [paramKey]: Number(value),
      },
    }));
  };

  return (
    <aside className="control-sidebar">
      {/* Asset & Interval Settings */}
      <div className="panel-header">
        <h3><Settings2 size={15} /> Market & Data</h3>
      </div>

      <div className="form-group">
        <label className="form-label">Crypto Asset</label>
        <select
          className="form-select"
          value={config.symbol}
          onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
          id="select-symbol"
        >
          {symbols?.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} ({s.name})
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Timeframe</label>
          <select
            className="form-select"
            value={config.timeframe}
            onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
            id="select-timeframe"
          >
            {timeframes?.map((tf) => (
              <option key={tf.id} value={tf.id}>
                {tf.id} ({tf.label})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Lookback</label>
          <select
            className="form-select"
            value={config.lookback_days}
            onChange={(e) => setConfig({ ...config, lookback_days: Number(e.target.value) })}
            id="select-lookback"
          >
            {lookbacks?.map((lb) => (
              <option key={lb.days} value={lb.days}>
                {lb.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Strategy Selection & Parameters */}
      <div className="panel-header" style={{ marginTop: '0.5rem' }}>
        <h3><Sliders size={15} /> Strategy Model</h3>
      </div>

      <div className="form-group">
        <label className="form-label">Algorithm</label>
        <select
          className="form-select"
          value={config.strategy}
          onChange={(e) => {
            const nextStrat = strategies?.find((s) => s.id === e.target.value);
            setConfig({
              ...config,
              strategy: e.target.value,
              params: nextStrat ? { ...nextStrat.default_params } : {},
            });
          }}
          id="select-strategy"
        >
          {strategies?.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
      </div>

      {currentStrategy && (
        <div className="strategy-params-box">
          <div className="strategy-desc">{currentStrategy.description}</div>

          {Object.entries(currentStrategy.default_params || {}).map(([key, defaultVal]) => {
            const val = config.params?.[key] !== undefined ? config.params[key] : defaultVal;
            return (
              <div key={key} className="form-group">
                <div className="form-label">
                  <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                  <span style={{ color: '#0ea5e9', fontFamily: 'JetBrains Mono' }}>{val}</span>
                </div>
                <input
                  type="number"
                  step={Number.isInteger(defaultVal) ? "1" : "0.5"}
                  className="form-input"
                  value={val}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Execution & Risk Management */}
      <div className="panel-header" style={{ marginTop: '0.5rem' }}>
        <h3><ShieldCheck size={15} /> Execution & Capital</h3>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Capital ($)</label>
          <input
            type="number"
            className="form-input"
            value={config.initial_capital}
            onChange={(e) => setConfig({ ...config, initial_capital: Number(e.target.value) })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Fee Rate (%)</label>
          <input
            type="number"
            step="0.0005"
            className="form-input"
            value={config.commission_rate}
            onChange={(e) => setConfig({ ...config, commission_rate: Number(e.target.value) })}
            title="0.001 is 0.1% Binance spot fee"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Slippage (%)</label>
          <input
            type="number"
            step="0.0001"
            className="form-input"
            value={config.slippage_rate}
            onChange={(e) => setConfig({ ...config, slippage_rate: Number(e.target.value) })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Stop-Loss (%)</label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 0.05"
            className="form-input"
            value={config.stop_loss_pct || ''}
            onChange={(e) => setConfig({ ...config, stop_loss_pct: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Take-Profit (%)</label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 0.06"
            className="form-input"
            value={config.take_profit_pct || ''}
            onChange={(e) => setConfig({ ...config, take_profit_pct: e.target.value ? Number(e.target.value) : null })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Position Size</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="1"
            placeholder="1.0 = 100%"
            className="form-input"
            value={config.position_size_pct ?? 1.0}
            onChange={(e) => setConfig({ ...config, position_size_pct: Number(e.target.value) })}
            title="Fraction of capital per trade (0.5 = 50%)"
          />
        </div>
      </div>

      {/* Short selling toggle */}
      <div className="toggle-row">
        <span className="toggle-label">Allow Short Selling</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={config.allow_short}
            onChange={(e) => setConfig({ ...config, allow_short: e.target.checked })}
          />
          <span className="slider-round"></span>
        </label>
      </div>
    </aside>
  );
}
