// Sample datasets for RiskLab
import type { PortfolioAsset, DatasetInfo } from '../risk/types';
import { randomNormal } from '../risk/statistics';

/**
 * Generate sample dataset: Normal returns baseline
 * Now generates PRICES so log/simple returns can be calculated correctly
 */
export function generateNormalReturns(days: number = 500): {
  assets: PortfolioAsset[];
  info: DatasetInfo;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const dataPoints: { date: Date; price: number }[] = [];
  
  // Generate price series using GBM-like process
  // Typical equity: ~10% annual return, ~20% annual volatility
  const dailyMu = 0.0004; // ~10% / 252
  const dailySigma = 0.0126; // ~20% / sqrt(252)
  
  let price = 100; // Starting price
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    dataPoints.push({ date, price });
    
    // Generate next price using log-normal return
    const logReturn = randomNormal(dailyMu, dailySigma);
    price = price * Math.exp(logReturn);
  }
  
  return {
    assets: [{
      id: 'normal-asset',
      name: 'Normal Returns Asset',
      weight: 1,
      data: dataPoints,
    }],
    info: {
      id: 'normal-baseline',
      name: 'Normal Returns Baseline',
      description: 'Synthetic dataset with normally distributed log returns (μ≈10% ann., σ≈20% ann.)',
      type: 'normal',
      assetCount: 1,
      dateRange: {
        start: dataPoints[0].date,
        end: dataPoints[dataPoints.length - 1].date,
      },
      observations: days,
    },
  };
}

/**
 * Generate sample dataset: Heavy-tail (Student-t) returns
 * Now generates PRICES so log/simple returns can be calculated correctly
 */
export function generateHeavyTailReturns(days: number = 500): {
  assets: PortfolioAsset[];
  info: DatasetInfo;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const dataPoints: { date: Date; price: number }[] = [];
  
  // Generate price series with fat-tailed returns
  const dailyMu = 0.0003;
  const dailySigma = 0.015;
  
  let price = 100; // Starting price
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    dataPoints.push({ date, price });
    
    // Generate t-distributed sample using transformation
    // Simplified: generate using normal with occasional jumps
    let logReturn: number;
    const isJump = Math.random() < 0.05; // 5% chance of jump
    if (isJump) {
      logReturn = randomNormal(dailyMu, dailySigma * 3); // 3x volatility for jumps
    } else {
      logReturn = randomNormal(dailyMu, dailySigma);
    }
    
    price = price * Math.exp(logReturn);
  }
  
  return {
    assets: [{
      id: 'heavy-tail-asset',
      name: 'Heavy-Tail Asset',
      weight: 1,
      data: dataPoints,
    }],
    info: {
      id: 'heavy-tail',
      name: 'Heavy-Tail Returns',
      description: 'Synthetic dataset with fat-tailed distribution (5% jump probability, excess kurtosis)',
      type: 'heavy-tail',
      assetCount: 1,
      dateRange: {
        start: dataPoints[0].date,
        end: dataPoints[dataPoints.length - 1].date,
      },
      observations: days,
    },
  };
}

/**
 * Generate sample dataset: Multi-asset with correlation and regime shifts
 * Now generates PRICES so log/simple returns can be calculated correctly
 */
export function generateMultiAssetReturns(days: number = 500): {
  assets: PortfolioAsset[];
  info: DatasetInfo;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Define assets with different characteristics
  const assetParams = [
    { id: 'equity', name: 'Equity Fund', mu: 0.0005, sigma: 0.015, startPrice: 100 },
    { id: 'bonds', name: 'Bond Fund', mu: 0.0002, sigma: 0.005, startPrice: 50 },
    { id: 'commodity', name: 'Commodity Fund', mu: 0.0003, sigma: 0.02, startPrice: 75 },
  ];
  
  // Correlation matrix (normal regime)
  const normalCorr = [
    [1.0, 0.2, 0.3],
    [0.2, 1.0, 0.1],
    [0.3, 0.1, 1.0],
  ];
  
  // Correlation matrix (stress regime) - correlations increase
  const stressCorr = [
    [1.0, 0.6, 0.7],
    [0.6, 1.0, 0.5],
    [0.7, 0.5, 1.0],
  ];
  
  // Initialize assets with price series
  const assets: PortfolioAsset[] = assetParams.map(p => ({
    id: p.id,
    name: p.name,
    weight: 1 / assetParams.length,
    data: [],
  }));
  
  // Track current prices
  const prices = assetParams.map(p => p.startPrice);
  
  let currentRegime: 'normal' | 'stress' = 'normal';
  let regimeDuration = 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Record current prices
    for (let j = 0; j < assetParams.length; j++) {
      (assets[j].data as { date: Date; price: number }[]).push({ date, price: prices[j] });
    }
    
    // Regime switching logic
    regimeDuration++;
    if (regimeDuration > 20 && Math.random() < 0.02) {
      currentRegime = currentRegime === 'normal' ? 'stress' : 'normal';
      regimeDuration = 0;
    }
    
    const corr = currentRegime === 'normal' ? normalCorr : stressCorr;
    const volMultiplier = currentRegime === 'stress' ? 1.5 : 1.0;
    
    // Generate correlated normals
    const z = [randomNormal(), randomNormal(), randomNormal()];
    
    // Apply Cholesky decomposition (simplified for 3x3)
    const L = choleskySimple(corr);
    const correlatedZ = [
      L[0][0] * z[0],
      L[1][0] * z[0] + L[1][1] * z[1],
      L[2][0] * z[0] + L[2][1] * z[1] + L[2][2] * z[2],
    ];
    
    // Update prices using log returns
    for (let j = 0; j < assetParams.length; j++) {
      const logReturn = assetParams[j].mu + assetParams[j].sigma * volMultiplier * correlatedZ[j];
      prices[j] = prices[j] * Math.exp(logReturn);
    }
  }
  
  return {
    assets,
    info: {
      id: 'multi-asset-correlated',
      name: 'Multi-Asset Portfolio',
      description: 'Three correlated assets (Equity, Bonds, Commodities) with volatility regime shifts',
      type: 'multi-asset',
      assetCount: 3,
      dateRange: {
        start: (assets[0].data[0] as { date: Date }).date,
        end: (assets[0].data[assets[0].data.length - 1] as { date: Date }).date,
      },
      observations: days,
    },
  };
}

// Simple 3x3 Cholesky decomposition
function choleskySimple(matrix: number[][]): number[][] {
  const L: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  
  L[0][0] = Math.sqrt(matrix[0][0]);
  L[1][0] = matrix[1][0] / L[0][0];
  L[1][1] = Math.sqrt(matrix[1][1] - L[1][0] * L[1][0]);
  L[2][0] = matrix[2][0] / L[0][0];
  L[2][1] = (matrix[2][1] - L[2][0] * L[1][0]) / L[1][1];
  L[2][2] = Math.sqrt(matrix[2][2] - L[2][0] * L[2][0] - L[2][1] * L[2][1]);
  
  return L;
}

/**
 * Get all sample datasets
 */
export function getSampleDatasets(): Array<{
  id: string;
  generator: () => { assets: PortfolioAsset[]; info: DatasetInfo };
}> {
  return [
    { id: 'normal-baseline', generator: generateNormalReturns },
    { id: 'heavy-tail', generator: generateHeavyTailReturns },
    { id: 'multi-asset-correlated', generator: generateMultiAssetReturns },
  ];
}
