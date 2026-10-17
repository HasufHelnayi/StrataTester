import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StrategyControls from './components/StrategyControls';
import TearsheetStats from './components/TearsheetStats';
import CandlestickChart from './components/CandlestickChart';
import EquityCurveChart from './components/EquityCurveChart';
import DrawdownChart from './components/DrawdownChart';
import TradeLogTable from './components/TradeLogTable';
import PythonSdkModal from './components/PythonSdkModal';
import CustomStrategyEditor from './components/CustomStrategyEditor';
import MonteCarloModal from './components/MonteCarloModal';
import OptimizerModal from './components/OptimizerModal';
import { generateInstitutionalReport } from './utils/exportReport';
import {
  fetchHealth,
  fetchSymbols,
  fetchStrategies,
  runBacktest,
  runCustomStrategy,
} from './services/api';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Metadata
  const [symbols, setSymbols] = useState([]);
  const [timeframes, setTimeframes] = useState([]);
  const [lookbacks, setLookbacks] = useState([]);
  const [strategies, setStrategies] = useState([]);

  // Config
  const [config, setConfig] = useState({
    symbol: 'BTCUSDT',
    timeframe: '1h',
    lookback_days: 90,
    strategy: 'rsi_reversion',
    params: {
      rsi_period: 14,
      oversold: 30,
      overbought: 70,
    },
    initial_capital: 10000,
    commission_rate: 0.001,
    slippage_rate: 0.0005,
    position_size_pct: 1.0,
    allow_short: false,
    stop_loss_pct: null,
    take_profit_pct: null,
  });

  // Backtest Results
  const [result, setResult] = useState(null);

  // Modals
  const [showPythonModal, setShowPythonModal] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [showMonteCarloModal, setShowMonteCarloModal] = useState(false);
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);

  const executeBacktest = useCallback(async (customConf = null) => {
    setLoading(true);
    setError(null);
    try {
      const activeConf = customConf || config;
      const res = await runBacktest(activeConf);
      setResult(res);
      setApiOnline(true);
    } catch (err) {
      setError(err.message || 'Backtest execution failed');
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Check health and bootstrap symbols & strategies
  useEffect(() => {
    async function init() {
      try {
        const health = await fetchHealth();
        if (health.status === 'healthy') {
          setApiOnline(true);
        }

        const symData = await fetchSymbols();
        setSymbols(symData.symbols || []);
        setTimeframes(symData.timeframes || []);
        setLookbacks(symData.lookbacks || []);

        const stratData = await fetchStrategies();
        const strats = stratData.strategies || [];
        setStrategies(strats);

        const defaultStrat = strats.find((s) => s.id === 'rsi_reversion') || strats[0];
        let initialConf = config;
        if (defaultStrat) {
          initialConf = {
            ...config,
            strategy: defaultStrat.id,
            params: { ...defaultStrat.default_params },
          };
          setConfig(initialConf);
        }

        // Trigger initial backtest with the concrete configuration
        executeBacktest(initialConf);
      } catch (err) {
        console.warn('Backend not responding yet:', err);
        setApiOnline(false);
      }
    }
    init();
  }, []);

  const handleRunCustomStrategy = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        code,
        symbol: config.symbol,
        timeframe: config.timeframe,
        lookback_days: config.lookback_days,
        initial_capital: config.initial_capital,
        commission_rate: config.commission_rate,
        slippage_rate: config.slippage_rate,
        position_size_pct: config.position_size_pct,
        allow_short: config.allow_short,
        stop_loss_pct: config.stop_loss_pct,
        take_profit_pct: config.take_profit_pct,
      };
      const res = await runCustomStrategy(payload);
      setResult(res);
      setApiOnline(true);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOptimizedParams = (newParams) => {
    const updated = {
      ...config,
      params: { ...config.params, ...newParams },
    };
    setConfig(updated);
    executeBacktest(updated);
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        apiOnline={apiOnline}
        onOpenOptimizer={() => setShowOptimizerModal(true)}
        onOpenMonteCarlo={() => setShowMonteCarloModal(true)}
        onExportReport={() => generateInstitutionalReport(result, config)}
        onOpenPythonModal={() => setShowPythonModal(true)}
        onOpenCustomEditor={() => setShowCustomEditor(true)}
        onRunBacktest={() => executeBacktest()}
        loading={loading}
      />

      <div className="dashboard-grid">
        {/* Left Strategy & Parameters Sidebar */}
        <StrategyControls
          config={config}
          setConfig={setConfig}
          symbols={symbols}
          timeframes={timeframes}
          lookbacks={lookbacks}
          strategies={strategies}
        />

        {/* Main Content Workspace */}
        <main className="content-area">
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              color: '#fb7185',
              fontSize: '0.84rem'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Quantitative Tearsheet Stat Cards */}
          {result?.metrics && (
            <TearsheetStats metrics={result.metrics} />
          )}

          {/* Interactive Candlestick Chart with Buy/Sell Execution Overlay */}
          <CandlestickChart
            candles={result?.candles || []}
            signals={result?.signals || []}
            trades={result?.trades || []}
            symbol={config.symbol}
            timeframe={config.timeframe}
          />

          {/* Portfolio Equity Curve vs Benchmark */}
          <EquityCurveChart
            equityCurve={result?.equity_curve || []}
            initialCapital={config.initial_capital}
          />

          {/* Underwater Drawdown Chart */}
          <DrawdownChart
            equityCurve={result?.equity_curve || []}
            maxDrawdownPct={result?.metrics?.max_drawdown_pct}
          />

          {/* Detailed Executed Trade Log */}
          <TradeLogTable trades={result?.trades || []} />
        </main>
      </div>

      {/* Python SDK Modal */}
      <PythonSdkModal
        isOpen={showPythonModal}
        onClose={() => setShowPythonModal(false)}
        currentConfig={config}
      />

      {/* Custom Python Strategy Editor */}
      <CustomStrategyEditor
        isOpen={showCustomEditor}
        onClose={() => setShowCustomEditor(false)}
        onRunCustom={handleRunCustomStrategy}
        loading={loading}
      />

      {/* Monte Carlo Risk & Ruin Modal */}
      <MonteCarloModal
        isOpen={showMonteCarloModal}
        onClose={() => setShowMonteCarloModal(false)}
        trades={result?.trades || []}
        initialCapital={config.initial_capital}
      />

      {/* Parameter Optimizer Grid Search Modal */}
      <OptimizerModal
        isOpen={showOptimizerModal}
        onClose={() => setShowOptimizerModal(false)}
        config={config}
        onApplyParams={handleApplyOptimizedParams}
      />
    </div>
  );
}
