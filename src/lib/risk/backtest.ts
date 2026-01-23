// Backtesting engine for VaR models
import { kupiecTest, normalQuantile, mean, stdDev, ewmaVolatility } from './statistics';
import type { BacktestResult, BacktestSummary, ConfidenceLevel, ModelType } from './types';

interface BacktestOptions {
  window: number; // Rolling window size (e.g., 250 days)
  confidence: ConfidenceLevel;
  model: ModelType;
  lambda?: number; // For EWMA models
}

/**
 * Run rolling backtest for VaR
 */
export function rollingBacktest(
  returns: number[],
  dates: Date[],
  options: BacktestOptions
): BacktestResult[] {
  const { window, confidence, model, lambda = 0.94 } = options;
  const results: BacktestResult[] = [];
  
  if (returns.length <= window) {
    return results;
  }
  
  for (let i = window; i < returns.length; i++) {
    const windowReturns = returns.slice(i - window, i);
    const actualReturn = returns[i];
    
    const { var: predictedVaR, es: predictedES } = calculateVaRES(
      windowReturns,
      confidence,
      model,
      lambda
    );
    
    // Exception occurs when actual loss exceeds VaR
    // Loss = -return, so exception when -actualReturn > predictedVaR
    const actualLoss = -actualReturn;
    const exception = actualLoss > predictedVaR;
    
    results.push({
      date: dates[i],
      actualReturn,
      predictedVaR,
      predictedES,
      exception,
    });
  }
  
  return results;
}

/**
 * Calculate VaR and ES for a single model
 */
function calculateVaRES(
  returns: number[],
  confidence: ConfidenceLevel,
  model: ModelType,
  lambda: number
): { var: number; es: number } {
  const alpha = 1 - confidence / 100;
  const losses = returns.map(r => -r);
  
  switch (model) {
    case 'historical': {
      const sortedLosses = [...losses].sort((a, b) => b - a);
      const varIndex = Math.floor(alpha * sortedLosses.length);
      const var_ = sortedLosses[varIndex] || sortedLosses[sortedLosses.length - 1];
      const tailLosses = sortedLosses.slice(0, varIndex + 1);
      const es = tailLosses.length > 0 ? mean(tailLosses) : var_;
      return { var: var_, es };
    }
    
    case 'gaussian': {
      const mu = mean(returns);
      const sigma = stdDev(returns);
      const z = normalQuantile(alpha);
      const var_ = -mu + sigma * (-z);
      const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
      const es = -mu + sigma * pdf / alpha;
      return { var: var_, es };
    }
    
    case 'ewma': {
      const mu = mean(returns);
      const vols = ewmaVolatility(returns, lambda);
      const sigma = vols[vols.length - 1] || stdDev(returns);
      const z = normalQuantile(alpha);
      const var_ = -mu + sigma * (-z);
      const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
      const es = -mu + sigma * pdf / alpha;
      return { var: var_, es };
    }
    
    default: {
      // Default to historical for other models
      const sortedLosses = [...losses].sort((a, b) => b - a);
      const varIndex = Math.floor(alpha * sortedLosses.length);
      const var_ = sortedLosses[varIndex] || sortedLosses[sortedLosses.length - 1];
      const tailLosses = sortedLosses.slice(0, varIndex + 1);
      const es = tailLosses.length > 0 ? mean(tailLosses) : var_;
      return { var: var_, es };
    }
  }
}

/**
 * Generate backtest summary with Kupiec test
 */
export function generateBacktestSummary(
  results: BacktestResult[],
  confidence: ConfidenceLevel,
  model: ModelType
): BacktestSummary {
  const totalDays = results.length;
  const exceptions = results.filter(r => r.exception).length;
  const exceptionRate = exceptions / totalDays;
  const expectedRate = 1 - confidence / 100;
  const expectedExceptions = totalDays * expectedRate;
  
  const kupiecPValue = kupiecTest(totalDays, exceptions, confidence);
  
  // Determine status based on Kupiec test and exception rate
  let status: 'ok' | 'warning' | 'fail';
  let statusReason: string;
  
  if (kupiecPValue < 0.01) {
    status = 'fail';
    statusReason = `Model rejected at 1% level. Exception rate ${(exceptionRate * 100).toFixed(2)}% vs expected ${(expectedRate * 100).toFixed(2)}%.`;
  } else if (kupiecPValue < 0.05) {
    status = 'warning';
    statusReason = `Model marginal at 5% level. Exception rate ${(exceptionRate * 100).toFixed(2)}% vs expected ${(expectedRate * 100).toFixed(2)}%.`;
  } else {
    status = 'ok';
    statusReason = `Model passes Kupiec test (p=${kupiecPValue.toFixed(3)}). Exception rate ${(exceptionRate * 100).toFixed(2)}% is consistent with ${confidence}% VaR.`;
  }
  
  return {
    model,
    confidence,
    totalDays,
    exceptions,
    exceptionRate,
    expectedExceptions,
    kupiecPValue,
    status,
    statusReason,
  };
}

/**
 * Calculate ES coverage (realized losses when VaR is breached)
 */
export function calculateESCoverage(results: BacktestResult[]): {
  avgLossGivenException: number;
  avgPredictedES: number;
  coverage: number;
} {
  const exceptions = results.filter(r => r.exception);
  
  if (exceptions.length === 0) {
    return {
      avgLossGivenException: 0,
      avgPredictedES: 0,
      coverage: 1,
    };
  }
  
  const avgLossGivenException = mean(exceptions.map(r => -r.actualReturn));
  const avgPredictedES = mean(exceptions.map(r => r.predictedES));
  const coverage = avgPredictedES >= avgLossGivenException ? 1 : avgPredictedES / avgLossGivenException;
  
  return {
    avgLossGivenException,
    avgPredictedES,
    coverage,
  };
}

/**
 * Generate secured position series (cumulative P&L with ES capital buffer)
 */
export function calculateSecuredPosition(
  results: BacktestResult[],
  initialCapital: number = 1000000
): {
  dates: Date[];
  cumulativePnL: number[];
  capitalBuffer: number[];
  securedPosition: number[];
} {
  const dates: Date[] = [];
  const cumulativePnL: number[] = [];
  const capitalBuffer: number[] = [];
  const securedPosition: number[] = [];
  
  let cumPnL = 0;
  
  for (const result of results) {
    const dailyPnL = result.actualReturn * initialCapital;
    cumPnL += dailyPnL;
    
    dates.push(result.date);
    cumulativePnL.push(cumPnL);
    capitalBuffer.push(result.predictedES * initialCapital);
    securedPosition.push(initialCapital + cumPnL - result.predictedES * initialCapital);
  }
  
  return { dates, cumulativePnL, capitalBuffer, securedPosition };
}
