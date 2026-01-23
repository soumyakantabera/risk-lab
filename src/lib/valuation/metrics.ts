import type { MetricDefinition } from "@/lib/valuation/types";

export const metricDictionary: MetricDefinition[] = [
  {
    key: "roic",
    name: "ROIC",
    description: "Return on invested capital, measuring after-tax operating profit against capital employed.",
    formula: "NOPAT / Invested Capital",
    source: ["NOPAT", "Invested Capital"],
  },
  {
    key: "rule-of-40",
    name: "Rule of 40",
    description: "SaaS health metric combining growth and profitability.",
    formula: "Revenue Growth % + EBITDA Margin %",
    source: ["Revenue Growth", "EBITDA Margin"],
  },
  {
    key: "cet1",
    name: "CET1 Ratio",
    description: "Common Equity Tier 1 capital as a percentage of risk-weighted assets.",
    formula: "CET1 Capital / RWA",
    source: ["CET1 Capital", "Risk-Weighted Assets"],
  },
  {
    key: "cap-rate",
    name: "Cap Rate",
    description: "Net operating income divided by property value.",
    formula: "NOI / Property Value",
    source: ["NOI", "Property Value"],
  },
  {
    key: "ffo",
    name: "FFO",
    description: "Funds from operations, a proxy for REIT operating cash flow.",
    formula: "Net Income + D&A - Gains on Sales",
    source: ["Net Income", "D&A", "Gains/Losses"],
  },
  {
    key: "arr",
    name: "ARR",
    description: "Annual recurring revenue from subscriptions.",
    formula: "Monthly recurring revenue × 12",
    source: ["MRR"],
  },
];
