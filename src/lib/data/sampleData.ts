// Sample datasets for RiskLab
import type { PortfolioAsset, DatasetInfo } from '../risk/types';
import { randomNormal } from '../risk/statistics';

/**
 * Generate sample dataset: Normal returns baseline
 */
export function generateNormalReturns(days: number = 500): {
  assets: PortfolioAsset[];
  info: DatasetInfo;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const returns: number[] = [];
  const dataPoints: { date: Date; return: number }[] = [];
  
  // Generate normally distributed returns
  // Typical equity: ~10% annual return, ~20% annual volatility
  const dailyMu = 0.0004; // ~10% / 252
  const dailySigma = 0.0126; // ~20% / sqrt(252)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const ret = randomNormal(dailyMu, dailySigma);
    returns.push(ret);
    dataPoints.push({ date, return: ret });
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
      description: 'Synthetic dataset with normally distributed returns (μ≈10% ann., σ≈20% ann.)',
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
 */
export function generateHeavyTailReturns(days: number = 500): {
  assets: PortfolioAsset[];
  info: DatasetInfo;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const dataPoints: { date: Date; return: number }[] = [];
  
  // Generate t-distributed returns (heavier tails)
  const dailyMu = 0.0003;
  const dailySigma = 0.015;
  const df = 4; // Low df = heavy tails
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Generate t-distributed sample using transformation
    // Use ratio of uniforms method approximation
    let ret: number;
    
    // Simplified: generate using normal with occasional jumps
    const isJump = Math.random() < 0.05; // 5% chance of jump
    if (isJump) {
      ret = randomNormal(dailyMu, dailySigma * 3); // 3x volatility for jumps
    } else {
      ret = randomNormal(dailyMu, dailySigma);
    }
    
    dataPoints.push({ date, return: ret });
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
 */
export function generateMultiAssetReturns(days: number = 500): {
  assets: PortfolioAsset[];
  info: DatasetInfo;
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Define assets with different characteristics
  const assetParams = [
    { id: 'equity', name: 'Equity Fund', mu: 0.0005, sigma: 0.015 },
    { id: 'bonds', name: 'Bond Fund', mu: 0.0002, sigma: 0.005 },
    { id: 'commodity', name: 'Commodity Fund', mu: 0.0003, sigma: 0.02 },
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
  
  // Generate returns with regime switching
  const assets: PortfolioAsset[] = assetParams.map(p => ({
    id: p.id,
    name: p.name,
    weight: 1 / assetParams.length,
    data: [],
  }));
  
  let currentRegime: 'normal' | 'stress' = 'normal';
  let regimeDuration = 0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
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
    
    for (let j = 0; j < assetParams.length; j++) {
      const ret = assetParams[j].mu + assetParams[j].sigma * volMultiplier * correlatedZ[j];
      (assets[j].data as { date: Date; return: number }[]).push({ date, return: ret });
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
