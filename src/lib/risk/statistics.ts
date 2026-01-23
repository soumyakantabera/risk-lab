// Statistical helper functions for risk calculations
import * as ss from 'simple-statistics';
import { jStat } from 'jstat';

/**
 * Calculate log returns from price series
 */
export function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return returns;
}

/**
 * Calculate simple returns from price series
 */
export function calculateSimpleReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

/**
 * Calculate percentile (quantile) of an array
 */
export function percentile(arr: number[], p: number): number {
  return ss.quantile(arr, p / 100);
}

/**
 * Calculate mean
 */
export function mean(arr: number[]): number {
  return ss.mean(arr);
}

/**
 * Calculate standard deviation
 */
export function stdDev(arr: number[]): number {
  return ss.standardDeviation(arr);
}

/**
 * Calculate variance
 */
export function variance(arr: number[]): number {
  return ss.variance(arr);
}

/**
 * Calculate skewness
 */
export function skewness(arr: number[]): number {
  return ss.sampleSkewness(arr);
}

/**
 * Calculate kurtosis (excess kurtosis)
 */
export function kurtosis(arr: number[]): number {
  const n = arr.length;
  if (n < 4) return 0;
  
  const m = mean(arr);
  const s = stdDev(arr);
  if (s === 0) return 0;
  
  let sum = 0;
  for (const x of arr) {
    sum += Math.pow((x - m) / s, 4);
  }
  
  const k = (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum;
  const adjustment = 3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3));
  
  return k - adjustment; // Excess kurtosis
}

/**
 * Calculate maximum drawdown
 */
export function maxDrawdown(returns: number[]): number {
  let peak = 1;
  let maxDD = 0;
  let cumulative = 1;
  
  for (const r of returns) {
    cumulative *= (1 + r);
    if (cumulative > peak) {
      peak = cumulative;
    }
    const dd = (peak - cumulative) / peak;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }
  
  return maxDD;
}

/**
 * Calculate drawdown series
 */
export function drawdownSeries(returns: number[]): number[] {
  const dd: number[] = [];
  let peak = 1;
  let cumulative = 1;
  
  for (const r of returns) {
    cumulative *= (1 + r);
    if (cumulative > peak) {
      peak = cumulative;
    }
    dd.push((peak - cumulative) / peak);
  }
  
  return dd;
}

/**
 * Calculate correlation matrix
 */
export function correlationMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j > i) {
        const corr = ss.sampleCorrelation(returnSeries[i], returnSeries[j]);
        matrix[i][j] = corr;
        matrix[j][i] = corr;
      }
    }
  }
  
  return matrix;
}

/**
 * Calculate covariance matrix
 */
export function covarianceMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = variance(returnSeries[i]);
      } else if (j > i) {
        const cov = ss.sampleCovariance(returnSeries[i], returnSeries[j]);
        matrix[i][j] = cov;
        matrix[j][i] = cov;
      }
    }
  }
  
  return matrix;
}

/**
 * Cholesky decomposition for correlated simulation
 */
export function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  
  return L;
}

/**
 * Gaussian inverse CDF (quantile function)
 */
export function normalQuantile(p: number): number {
  return jStat.normal.inv(p, 0, 1);
}

/**
 * Student-t inverse CDF
 */
export function tQuantile(p: number, df: number): number {
  return jStat.studentt.inv(p, df);
}

/**
 * Estimate degrees of freedom for t-distribution using MLE
 */
export function estimateStudentTDF(returns: number[]): number {
  // Simple method: use kurtosis to estimate df
  // For t-distribution: kurtosis = 6 / (df - 4) for df > 4
  const k = kurtosis(returns);
  
  if (k <= 0) return 30; // Nearly normal, use high df
  
  // Solve: k = 6 / (df - 4) => df = 6/k + 4
  const estimatedDF = 6 / k + 4;
  
  // Clamp to reasonable range
  return Math.max(3, Math.min(30, estimatedDF));
}

/**
 * EWMA volatility estimation
 */
export function ewmaVolatility(returns: number[], lambda: number = 0.94): number[] {
  const n = returns.length;
  if (n === 0) return [];
  
  const vol: number[] = [];
  let variance = returns[0] * returns[0];
  vol.push(Math.sqrt(variance));
  
  for (let i = 1; i < n; i++) {
    variance = lambda * variance + (1 - lambda) * returns[i - 1] * returns[i - 1];
    vol.push(Math.sqrt(variance));
  }
  
  return vol;
}

/**
 * Generate random normal samples using Box-Muller transform
 */
export function randomNormal(mean: number = 0, std: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * std + mean;
}

/**
 * Generate random normal array
 */
export function randomNormalArray(n: number, mean: number = 0, std: number = 1): number[] {
  return Array(n).fill(0).map(() => randomNormal(mean, std));
}

/**
 * Generate correlated random normals using Cholesky decomposition
 */
export function correlatedNormals(n: number, covMatrix: number[][]): number[][] {
  const L = cholesky(covMatrix);
  const dim = covMatrix.length;
  const samples: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const z = randomNormalArray(dim);
    const correlated: number[] = Array(dim).fill(0);
    
    for (let j = 0; j < dim; j++) {
      for (let k = 0; k <= j; k++) {
        correlated[j] += L[j][k] * z[k];
      }
    }
    
    samples.push(correlated);
  }
  
  return samples;
}

/**
 * Kupiec's POF test for VaR backtesting
 * Returns p-value
 */
export function kupiecTest(
  totalDays: number,
  exceptions: number,
  confidenceLevel: number
): number {
  const p = 1 - confidenceLevel / 100; // Expected exception rate
  const n = totalDays;
  const x = exceptions;
  
  if (x === 0) {
    // Log-likelihood ratio test statistic when x = 0
    const LR = -2 * n * Math.log(1 - p);
    return 1 - jStat.chisquare.cdf(LR, 1);
  }
  
  const pHat = x / n;
  
  // Likelihood ratio
  const LR = -2 * (
    x * Math.log(p / pHat) +
    (n - x) * Math.log((1 - p) / (1 - pHat))
  );
  
  // Chi-square test with 1 degree of freedom
  return 1 - jStat.chisquare.cdf(LR, 1);
}

/**
 * Christoffersen's Independence Test for VaR backtesting
 * Tests whether exceptions are serially independent (not clustered)
 * Returns p-value from LR test with 1 degree of freedom
 */
export function christoffersenIndependenceTest(exceptions: boolean[]): number {
  // Count transitions between exception states
  let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
  
  for (let i = 1; i < exceptions.length; i++) {
    const prev = exceptions[i - 1];
    const curr = exceptions[i];
    if (!prev && !curr) n00++;
    else if (!prev && curr) n01++;
    else if (prev && !curr) n10++;
    else n11++;
  }
  
  const n0 = n00 + n01; // Days following no exception
  const n1 = n10 + n11; // Days following exception
  
  if (n0 === 0 || n1 === 0) {
    // Not enough transitions to test
    return 1;
  }
  
  // Transition probabilities under alternative (first-order Markov)
  const pi01 = n01 / n0; // P(exception | no exception yesterday)
  const pi11 = n11 / n1; // P(exception | exception yesterday)
  
  // Under null: unconditional probability
  const pi = (n01 + n11) / (n0 + n1);
  
  if (pi === 0 || pi === 1) {
    return 1; // No exceptions or all exceptions
  }
  
  // Log-likelihood under null (independence)
  const L0 = (n00 + n10) * Math.log(1 - pi) + (n01 + n11) * Math.log(pi);
  
  // Log-likelihood under alternative (first-order Markov)
  let L1 = 0;
  if (n00 > 0) L1 += n00 * Math.log(1 - pi01);
  if (n01 > 0) L1 += n01 * Math.log(pi01);
  if (n10 > 0) L1 += n10 * Math.log(1 - pi11);
  if (n11 > 0) L1 += n11 * Math.log(pi11);
  
  const LR = -2 * (L0 - L1);
  
  // Chi-square test with 1 degree of freedom
  return 1 - jStat.chisquare.cdf(Math.max(0, LR), 1);
}

/**
 * Christoffersen's Conditional Coverage Test
 * Combines Kupiec (unconditional) + Independence tests
 * Returns p-value from LR test with 2 degrees of freedom
 */
export function christoffersenConditionalCoverageTest(
  exceptions: boolean[],
  confidenceLevel: number
): {
  pValue: number;
  kupiecPValue: number;
  independencePValue: number;
  interpretation: string;
} {
  const n = exceptions.length;
  const x = exceptions.filter(e => e).length;
  const expectedRate = 1 - confidenceLevel / 100;
  
  // Kupiec (unconditional coverage) test
  const kupiecPValue = kupiecTest(n, x, confidenceLevel);
  
  // Independence test
  const independencePValue = christoffersenIndependenceTest(exceptions);
  
  // Combined conditional coverage test
  // LR_cc = LR_uc + LR_ind (approximately chi-square with 2 df)
  
  // Count transitions
  let n00 = 0, n01 = 0, n10 = 0, n11 = 0;
  for (let i = 1; i < exceptions.length; i++) {
    const prev = exceptions[i - 1];
    const curr = exceptions[i];
    if (!prev && !curr) n00++;
    else if (!prev && curr) n01++;
    else if (prev && !curr) n10++;
    else n11++;
  }
  
  const n0 = n00 + n01;
  const n1 = n10 + n11;
  
  let combinedPValue = 1;
  
  if (n0 > 0 && n1 > 0) {
    const pi01 = n01 / n0;
    const pi11 = n11 / n1;
    const p = expectedRate;
    
    // Log-likelihood under null (correct coverage + independence)
    const L0 = (n00 + n10) * Math.log(1 - p) + (n01 + n11) * Math.log(p);
    
    // Log-likelihood under alternative (first-order Markov)
    let L1 = 0;
    if (n00 > 0 && pi01 < 1) L1 += n00 * Math.log(1 - pi01);
    if (n01 > 0 && pi01 > 0) L1 += n01 * Math.log(pi01);
    if (n10 > 0 && pi11 < 1) L1 += n10 * Math.log(1 - pi11);
    if (n11 > 0 && pi11 > 0) L1 += n11 * Math.log(pi11);
    
    const LR_cc = -2 * (L0 - L1);
    combinedPValue = 1 - jStat.chisquare.cdf(Math.max(0, LR_cc), 2);
  }
  
  // Generate interpretation
  let interpretation: string;
  if (combinedPValue >= 0.05 && kupiecPValue >= 0.05 && independencePValue >= 0.05) {
    interpretation = 'Model passes: correct coverage and independent exceptions';
  } else if (kupiecPValue < 0.05 && independencePValue >= 0.05) {
    interpretation = 'Model fails: wrong exception rate, but exceptions are independent';
  } else if (kupiecPValue >= 0.05 && independencePValue < 0.05) {
    interpretation = 'Model fails: correct rate, but exceptions are clustered (volatility clustering not captured)';
  } else {
    interpretation = 'Model fails: both wrong rate and clustered exceptions';
  }
  
  return {
    pValue: combinedPValue,
    kupiecPValue,
    independencePValue,
    interpretation,
  };
}

/**
 * Scale VaR/ES for different time horizons using square root of time
 */
export function scaleToHorizon(value: number, fromHorizon: number, toHorizon: number): number {
  return value * Math.sqrt(toHorizon / fromHorizon);
}
