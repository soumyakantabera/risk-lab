import type { SectorMode } from "@/lib/valuation/types";

export interface SectorPlaybook {
  key: SectorMode;
  name: string;
  whatMatters: string[];
  defaultDrivers: string[];
  outputKpis: string[];
  terminalMethod: string;
  recommendedMultiples: string[];
  warnings: string[];
}

export const sectorPlaybooks: SectorPlaybook[] = [
  {
    key: "tech",
    name: "Tech / SaaS",
    whatMatters: [
      "Net revenue retention and durability of ARR",
      "CAC payback, LTV/CAC, and Rule of 40 balance",
      "Gross margin expansion with scale",
    ],
    defaultDrivers: ["ARR growth", "NRR", "Gross margin", "CAC payback"],
    outputKpis: ["EV/ARR", "EV/Revenue growth-adjusted", "Rule of 40"],
    terminalMethod: "Exit multiple on ARR or stable-growth DCF",
    recommendedMultiples: ["EV/ARR", "EV/Revenue", "EV/EBITDA"],
    warnings: ["Avoid aggressive terminal margins without NRR support."]
  },
  {
    key: "banks",
    name: "Banks / Financials",
    whatMatters: [
      "Capital adequacy (CET1, leverage)",
      "Net interest margin stability",
      "Asset quality (NPL, coverage)",
    ],
    defaultDrivers: ["Loan growth", "NIM", "Credit losses", "Cost-to-income"],
    outputKpis: ["Residual income value", "DDM value", "P/B"],
    terminalMethod: "Residual income or DDM steady-state",
    recommendedMultiples: ["P/B", "P/E"],
    warnings: ["Prefer Residual Income / DDM over FCFF by default."]
  },
  {
    key: "insurance",
    name: "Insurance",
    whatMatters: [
      "Combined ratio and underwriting margin",
      "Reserve strength and loss development",
      "Investment portfolio yield",
    ],
    defaultDrivers: ["Premium growth", "Loss ratio", "Expense ratio"],
    outputKpis: ["Embedded value", "Appraisal value"],
    terminalMethod: "Embedded value / appraisal value",
    recommendedMultiples: ["P/B", "P/Embedded Value"],
    warnings: ["Separate underwriting vs investment income drivers."]
  },
  {
    key: "reit",
    name: "Real Estate (REIT)",
    whatMatters: [
      "FFO/AFFO coverage",
      "Cap rates and NAV",
      "Debt maturity ladder and coverage",
    ],
    defaultDrivers: ["NOI growth", "Cap rate", "AFFO payout"],
    outputKpis: ["NAV per share", "Cap rate value"],
    terminalMethod: "Cap rate / NAV",
    recommendedMultiples: ["P/FFO", "EV/EBITDA"],
    warnings: ["Use AFFO for payout sustainability."]
  },
  {
    key: "energy",
    name: "Energy / Utilities",
    whatMatters: [
      "Commodity price sensitivity",
      "Production volumes and decline curves",
      "Capex-heavy regulated terminal",
    ],
    defaultDrivers: ["Commodity price", "Production volume", "Capex"],
    outputKpis: ["PV-10", "Regulated base return"],
    terminalMethod: "Regulated stable growth",
    recommendedMultiples: ["EV/EBITDA", "EV/Reserves"],
    warnings: ["Stress test commodity assumptions."]
  },
  {
    key: "consumer",
    name: "Consumer / Retail",
    whatMatters: [
      "SSS growth and store roll-out",
      "Gross margin and inventory turns",
      "Unit economics (AOV, conversion)",
    ],
    defaultDrivers: ["Store growth", "SSS growth", "Gross margin"],
    outputKpis: ["Sales per store", "Inventory turns"],
    terminalMethod: "Exit multiple with margin normalization",
    recommendedMultiples: ["EV/EBITDA", "P/E", "EV/Revenue"],
    warnings: ["Watch margin >80% flags outside SaaS."],
  },
  {
    key: "industrials",
    name: "Industrials",
    whatMatters: [
      "Order backlog and cycle sensitivity",
      "Working capital intensity",
      "Operating leverage",
    ],
    defaultDrivers: ["Backlog growth", "Cycle sensitivity", "Working capital"],
    outputKpis: ["ROIC", "Backlog coverage"],
    terminalMethod: "Mid-cycle margin normalized",
    recommendedMultiples: ["EV/EBITDA", "EV/EBIT"],
    warnings: ["Normalize margins across cycles."],
  },
];
