// VaR and Expected Shortfall models
import {
  mean,
  stdDev,
  percentile,
  normalQuantile,
  tQuantile,
  estimateStudentTDF,
  ewmaVolatility,
  garch11Volatility,
  estimateGARCH11,
  randomNormal,
  correlatedNormals,
  covarianceMatrix,
  scaleToHorizon,
} from './statistics';
import type {
  VaRResult,
  ModelResult,
  ConfidenceLevel,
  TimeHorizon,
  ModelParameters,
} from './types';

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [90, 95, 97.5, 99];
const TIME_HORIZONS: TimeHorizon[] = [1, 10];

/**
 * Historical Simulation VaR/ES
 */
export function historicalSimulation(
  returns: number[],
  portfolioValue: number = 1
): ModelResult {
  const startTime = performance.now();
  const losses = returns.map(r => -r); // Convert to losses
  const sortedLosses = [...losses].sort((a, b) => b - a); // Descending
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const varIndex = Math.floor(alpha * sortedLosses.length);
    const var1D = sortedLosses[varIndex] || sortedLosses[sortedLosses.length - 1];
    
    // ES is average of losses beyond VaR
    const tailLosses = sortedLosses.slice(0, varIndex + 1);
    const es1D = tailLosses.length > 0 ? mean(tailLosses) : var1D;
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'historical',
    modelName: 'Historical Simulation',
    results,
    parameters: {
      mu: mean(returns),
      sigma: stdDev(returns),
    },
    computeTime: performance.now() - startTime,
  };
}

/**
 * Parametric Gaussian VaR/ES
 */
export function gaussianVaR(
  returns: number[],
  portfolioValue: number = 1
): ModelResult {
  const startTime = performance.now();
  const mu = mean(returns);
  const sigma = stdDev(returns);
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const z = normalQuantile(alpha);
    
    // VaR = -mu + sigma * z (for losses)
    const var1D = -mu + sigma * (-z); // -z because we want left tail
    
    // ES for normal = mu + sigma * phi(z) / alpha
    // where phi is the PDF of standard normal
    const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const es1D = -mu + sigma * pdf / alpha;
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'gaussian',
    modelName: 'Parametric (Gaussian)',
    results,
    parameters: { mu, sigma },
    computeTime: performance.now() - startTime,
  };
}

/**
 * Parametric Student-t VaR/ES
 */
export function studentTVaR(
  returns: number[],
  portfolioValue: number = 1,
  fixedDF?: number
): ModelResult {
  const startTime = performance.now();
  const mu = mean(returns);
  const sigma = stdDev(returns);
  const df = fixedDF ?? estimateStudentTDF(returns);
  
  // Scale factor for t-distribution variance
  const scaleFactor = df > 2 ? Math.sqrt((df - 2) / df) : 1;
  const scaledSigma = sigma * scaleFactor;
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const t = tQuantile(alpha, df);
    
    const var1D = -mu + scaledSigma * (-t);
    
    // ES for t-distribution
    // ES = mu + sigma * (df + t^2) / (df - 1) * pdf(t) / alpha
    // Simplified approximation:
    const tPdf = Math.exp(-0.5 * (df + 1) * Math.log(1 + t * t / df)) / 
                 (Math.sqrt(df) * Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(Math.PI)));
    const es1D = -mu + scaledSigma * (df + t * t) / (df - 1) * tPdf / alpha;
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'student-t',
    modelName: 'Parametric (Student-t)',
    results,
    parameters: { mu, sigma, df },
    computeTime: performance.now() - startTime,
  };
}

// Helper function for log-gamma
function lgamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * EWMA VaR/ES
 */
export function ewmaVaR(
  returns: number[],
  portfolioValue: number = 1,
  lambda: number = 0.94
): ModelResult {
  const startTime = performance.now();
  const mu = mean(returns);
  const vols = ewmaVolatility(returns, lambda);
  const currentVol = vols[vols.length - 1] || stdDev(returns);
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const z = normalQuantile(alpha);
    
    const var1D = -mu + currentVol * (-z);
    const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const es1D = -mu + currentVol * pdf / alpha;
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'ewma',
    modelName: 'EWMA',
    results,
    parameters: { mu, sigma: currentVol, lambda },
    computeTime: performance.now() - startTime,
  };
}

/**
 * Monte Carlo VaR/ES (single asset - GBM)
 */
export function monteCarloVaR(
  returns: number[],
  portfolioValue: number = 1,
  simulations: number = 10000
): ModelResult {
  const startTime = performance.now();
  const mu = mean(returns);
  const sigma = stdDev(returns);
  
  // Generate simulated returns
  const simulatedReturns: number[] = [];
  for (let i = 0; i < simulations; i++) {
    simulatedReturns.push(randomNormal(mu, sigma));
  }
  
  const losses = simulatedReturns.map(r => -r).sort((a, b) => b - a);
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const varIndex = Math.floor(alpha * simulations);
    const var1D = losses[varIndex];
    
    const tailLosses = losses.slice(0, varIndex + 1);
    const es1D = mean(tailLosses);
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'monte-carlo',
    modelName: 'Monte Carlo (GBM)',
    results,
    parameters: { mu, sigma },
    computeTime: performance.now() - startTime,
  };
}

/**
 * Monte Carlo for multi-asset portfolio
 */
export function monteCarloMultiAsset(
  assetReturns: number[][],
  weights: number[],
  portfolioValue: number = 1,
  simulations: number = 10000
): ModelResult {
  const startTime = performance.now();
  
  const means = assetReturns.map(r => mean(r));
  const covMatrix = covarianceMatrix(assetReturns);
  
  // Generate correlated samples
  const correlatedSamples = correlatedNormals(simulations, covMatrix);
  
  // Calculate portfolio returns
  const portfolioReturns: number[] = [];
  for (const sample of correlatedSamples) {
    let portReturn = 0;
    for (let i = 0; i < weights.length; i++) {
      portReturn += weights[i] * (means[i] + sample[i]);
    }
    portfolioReturns.push(portReturn);
  }
  
  const losses = portfolioReturns.map(r => -r).sort((a, b) => b - a);
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const varIndex = Math.floor(alpha * simulations);
    const var1D = losses[varIndex];
    
    const tailLosses = losses.slice(0, varIndex + 1);
    const es1D = mean(tailLosses);
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'monte-carlo',
    modelName: 'Monte Carlo (Multi-Asset)',
    results,
    parameters: { 
      mu: mean(portfolioReturns),
      sigma: stdDev(portfolioReturns),
      covMatrix 
    },
    computeTime: performance.now() - startTime,
  };
}

/**
 * Filtered Historical Simulation
 */
export function filteredHistoricalSimulation(
  returns: number[],
  portfolioValue: number = 1,
  lambda: number = 0.94,
  simulations: number = 5000
): ModelResult {
  const startTime = performance.now();
  
  // Step 1: Estimate conditional volatility using EWMA
  const vols = ewmaVolatility(returns, lambda);
  
  // Step 2: Standardize residuals
  const standardizedResiduals = returns.map((r, i) => {
    const vol = vols[i] || vols[0];
    return vol > 0 ? r / vol : r;
  });
  
  // Step 3: Bootstrap residuals and rescale
  const currentVol = vols[vols.length - 1];
  const simulatedReturns: number[] = [];
  
  for (let i = 0; i < simulations; i++) {
    const randomIndex = Math.floor(Math.random() * standardizedResiduals.length);
    const sampledResidual = standardizedResiduals[randomIndex];
    simulatedReturns.push(sampledResidual * currentVol);
  }
  
  // Step 4: Compute VaR/ES from simulated returns
  const losses = simulatedReturns.map(r => -r).sort((a, b) => b - a);
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const varIndex = Math.floor(alpha * simulations);
    const var1D = losses[varIndex];
    
    const tailLosses = losses.slice(0, varIndex + 1);
    const es1D = mean(tailLosses);
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'filtered-hs',
    modelName: 'Filtered Historical Simulation',
    results,
    parameters: { 
      mu: mean(returns),
      sigma: currentVol,
      lambda 
    },
    computeTime: performance.now() - startTime,
  };
}

/**
 * GARCH(1,1) VaR/ES
 * Uses GARCH volatility forecasting for more accurate risk estimates
 */
export function garchVaR(
  returns: number[],
  portfolioValue: number = 1
): ModelResult {
  const startTime = performance.now();
  const mu = mean(returns);
  
  // Estimate GARCH parameters
  const garchParams = estimateGARCH11(returns);
  const vols = garch11Volatility(returns, garchParams);
  const currentVol = vols[vols.length - 1] || stdDev(returns);
  
  const results: VaRResult[] = [];
  
  for (const confidence of CONFIDENCE_LEVELS) {
    const alpha = 1 - confidence / 100;
    const z = normalQuantile(alpha);
    
    const var1D = -mu + currentVol * (-z);
    const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const es1D = -mu + currentVol * pdf / alpha;
    
    for (const horizon of TIME_HORIZONS) {
      const varH = scaleToHorizon(var1D, 1, horizon);
      const esH = scaleToHorizon(es1D, 1, horizon);
      
      results.push({
        confidence,
        horizon,
        var: varH * portfolioValue,
        es: esH * portfolioValue,
        varPercent: varH * 100,
        esPercent: esH * 100,
      });
    }
  }
  
  return {
    model: 'garch',
    modelName: 'GARCH(1,1)',
    results,
    parameters: { 
      mu, 
      sigma: currentVol,
      omega: garchParams.omega,
      alpha: garchParams.alpha,
      beta: garchParams.beta,
      persistence: garchParams.persistence,
    },
    computeTime: performance.now() - startTime,
  };
}

/**
 * Run all models and return results
 */
export function runAllModels(
  returns: number[],
  portfolioValue: number = 1,
  lambda: number = 0.94
): ModelResult[] {
  return [
    historicalSimulation(returns, portfolioValue),
    gaussianVaR(returns, portfolioValue),
    studentTVaR(returns, portfolioValue),
    ewmaVaR(returns, portfolioValue, lambda),
    garchVaR(returns, portfolioValue),
    monteCarloVaR(returns, portfolioValue, 10000),
    filteredHistoricalSimulation(returns, portfolioValue, lambda),
  ];
}
