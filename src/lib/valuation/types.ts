export type SectorMode =
  | "tech"
  | "banks"
  | "insurance"
  | "reit"
  | "energy"
  | "consumer"
  | "industrials";

export interface CountrySettings {
  id: string;
  name: string;
  currency: string;
  riskFreeRate: number;
  riskFreeCurve: "short" | "long";
  equityRiskPremium: number;
  inflation: number;
  taxRate: number;
  countryRiskPremium: number;
  sovereignSpread: number;
  defaultSpreads: { rating: string; spread: number }[];
}

export interface MetricDefinition {
  key: string;
  name: string;
  description: string;
  formula: string;
  source: string[];
}

export interface Scenario {
  name: string;
  weight: number;
  equityValue: number;
}

export interface NormalizedEbitdaAdjustment {
  label: string;
  value: number;
}
