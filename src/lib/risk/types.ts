// Core types for RiskLab

export interface DataPoint {
  date: Date;
  price?: number;
  return?: number;
}

export interface PortfolioAsset {
  id: string;
  name: string;
  weight: number;
  data: DataPoint[];
}

export interface Portfolio {
  id: string;
  name: string;
  assets: PortfolioAsset[];
  value: number; // Portfolio value in dollars
  returnType: 'log' | 'simple';
}

export type ConfidenceLevel = 90 | 95 | 97.5 | 99;
export type TimeHorizon = 1 | 10;

export interface VaRResult {
  confidence: ConfidenceLevel;
  horizon: TimeHorizon;
  var: number; // Value at Risk (positive = loss)
  es: number; // Expected Shortfall (positive = loss)
  varPercent: number;
  esPercent: number;
}

export interface ModelParameters {
  mu?: number;
  sigma?: number;
  df?: number; // Degrees of freedom for t-distribution
  lambda?: number; // EWMA decay factor
  covMatrix?: number[][]; // Covariance matrix for multi-asset
  // GARCH(1,1) parameters
  omega?: number;
  alpha?: number;
  beta?: number;
  persistence?: number;
}

export type ModelType = 
  | 'historical'
  | 'gaussian'
  | 'student-t'
  | 'ewma'
  | 'garch'
  | 'monte-carlo'
  | 'filtered-hs';

export interface ModelResult {
  model: ModelType;
  modelName: string;
  results: VaRResult[];
  parameters: ModelParameters;
  computeTime: number;
}

export interface BacktestResult {
  date: Date;
  actualReturn: number;
  predictedVaR: number;
  predictedES: number;
  exception: boolean; // True if actual loss exceeded VaR
}

export interface BacktestSummary {
  model: ModelType;
  confidence: ConfidenceLevel;
  totalDays: number;
  exceptions: number;
  exceptionRate: number;
  expectedExceptions: number;
  kupiecPValue: number;
  // Christoffersen tests
  independencePValue: number;
  conditionalCoveragePValue: number;
  christoffersenInterpretation: string;
  status: 'ok' | 'warning' | 'fail';
  statusReason: string;
}

export interface StressScenario {
  id: string;
  name: string;
  type: 'shock' | 'volatility' | 'correlation' | 'historical';
  parameters: {
    shockPercent?: number;
    volatilityMultiplier?: number;
    correlationTarget?: number;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface StressResult {
  scenario: StressScenario;
  baselineVaR: number;
  stressedVaR: number;
  deltaVaR: number;
  baselineES: number;
  stressedES: number;
  deltaES: number;
  worstLoss: number;
}

export interface RiskMetrics {
  volatility: number;
  annualizedVolatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  skewness: number;
  kurtosis: number;
  meanReturn: number;
}

export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  type: 'normal' | 'heavy-tail' | 'multi-asset' | 'custom';
  assetCount: number;
  dateRange: { start: Date; end: Date };
  observations: number;
}
