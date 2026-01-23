// FX Invoice Risk Types for RiskLab Pro

export interface Invoice {
  id: string;
  type: 'payable' | 'receivable';
  counterparty: string;
  currency: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  expectedPayDate?: Date;
  category?: string;
  notes?: string;
}

export interface FXRate {
  date: Date;
  pair: string;
  rate: number;
}

export interface Hedge {
  id: string;
  pair: string;
  notional: number;
  startDate: Date;
  endDate: Date;
  type: 'forward_proxy' | 'option_proxy';
  costBps: number;
}

export interface PolicyLimit {
  metric: string;
  limitEur: number;
}

export type RegimeState = 'calm' | 'normal' | 'stress';

export interface TimeBucket {
  label: string;
  days: number;
  startDay: number;
  endDay: number;
}

export const TIME_BUCKETS: TimeBucket[] = [
  { label: '7D', days: 7, startDay: 0, endDay: 7 },
  { label: '30D', days: 30, startDay: 0, endDay: 30 },
  { label: '60D', days: 60, startDay: 0, endDay: 60 },
  { label: '90D', days: 90, startDay: 0, endDay: 90 },
];

export interface ExposureSummary {
  currency: string;
  receivable: number;
  payable: number;
  net: number;
  hedged: number;
  unhedged: number;
}

export interface RiskResult {
  model: string;
  horizon: string;
  confidence: number;
  var: number;
  es: number;
  cfarP95: number;
}

export interface ComponentES {
  id: string;
  type: 'invoice' | 'currency' | 'counterparty';
  name: string;
  es: number;
  percentOfTotal: number;
}

export interface MarginalES {
  currency: string;
  bucket: string;
  mesPerThousand: number;
  esReduction: number;
}

export interface HedgeAction {
  id: string;
  currency: string;
  bucket: string;
  notional: number;
  hedgePercent: number;
  estimatedCostEur: number;
  esReduction: number;
  rationale: string;
}

export interface HedgePlan {
  actions: HedgeAction[];
  totalCost: number;
  esBefore: number;
  esAfter: number;
  limitMet: boolean;
}

export interface BacktestResult {
  date: Date;
  predictedVar: number;
  predictedEs: number;
  actualLoss: number;
  isException: boolean;
}

export interface RegimeWeights {
  historical: number;
  ewma: number;
  studentT: number;
  fhs: number;
  monteCarlo: number;
}

export const REGIME_WEIGHTS: Record<RegimeState, RegimeWeights> = {
  calm: { historical: 0.35, ewma: 0.20, studentT: 0.15, fhs: 0.15, monteCarlo: 0.15 },
  normal: { historical: 0.25, ewma: 0.25, studentT: 0.20, fhs: 0.15, monteCarlo: 0.15 },
  stress: { historical: 0.10, ewma: 0.30, studentT: 0.25, fhs: 0.20, monteCarlo: 0.15 },
};

export interface FXState {
  invoices: Invoice[];
  fxRates: Map<string, FXRate[]>;
  hedges: Hedge[];
  limits: PolicyLimit[];
  baseCurrency: string;
  regime: RegimeState;
  regimeAuto: boolean;
  modelWeights: RegimeWeights;
  esLimit: number;
}
