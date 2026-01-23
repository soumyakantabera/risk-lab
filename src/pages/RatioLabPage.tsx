import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const ratioPanels = [
  {
    title: "Profitability",
    items: [
      { name: "Gross Margin", value: "68%", formula: "(Revenue - COGS) / Revenue", source: ["Revenue", "COGS"] },
      { name: "EBITDA Margin", value: "32%", formula: "EBITDA / Revenue", source: ["EBITDA", "Revenue"] },
      { name: "ROIC", value: "14%", formula: "NOPAT / Invested Capital", source: ["NOPAT", "Invested Capital"] },
      { name: "DuPont ROE", value: "18%", formula: "Margin × Turnover × Leverage", source: ["Net Income", "Revenue", "Assets", "Equity"] },
    ],
  },
  {
    title: "Efficiency / Activity",
    items: [
      { name: "Asset Turnover", value: "0.9x", formula: "Revenue / Average Assets", source: ["Revenue", "Assets"] },
      { name: "Inventory Days", value: "42", formula: "(Inventory / COGS) × 365", source: ["Inventory", "COGS"] },
      { name: "Cash Conversion Cycle", value: "18", formula: "Inventory Days + AR Days - AP Days", source: ["Inventory", "AR", "AP"] },
      { name: "Capex Intensity", value: "7%", formula: "Capex / Revenue", source: ["Capex", "Revenue"] },
    ],
  },
  {
    title: "Liquidity",
    items: [
      { name: "Current Ratio", value: "1.6x", formula: "Current Assets / Current Liabilities", source: ["Current Assets", "Current Liabilities"] },
      { name: "Quick Ratio", value: "1.1x", formula: "(Current Assets - Inventory) / Current Liabilities", source: ["Current Assets", "Inventory", "Current Liabilities"] },
      { name: "Cash Ratio", value: "0.5x", formula: "Cash / Current Liabilities", source: ["Cash", "Current Liabilities"] },
      { name: "Working Capital Ratio", value: "0.22", formula: "(CA - CL) / Revenue", source: ["Current Assets", "Current Liabilities", "Revenue"] },
    ],
  },
  {
    title: "Leverage / Solvency",
    items: [
      { name: "Net Debt / EBITDA", value: "2.3x", formula: "Net Debt / EBITDA", source: ["Net Debt", "EBITDA"] },
      { name: "Debt / Equity", value: "1.4x", formula: "Total Debt / Equity", source: ["Debt", "Equity"] },
      { name: "Interest Coverage", value: "6.8x", formula: "EBIT / Interest Expense", source: ["EBIT", "Interest Expense"] },
      { name: "Debt Maturity Ladder", value: "2026-2029", formula: "Schedule", source: ["Debt Schedule"] },
    ],
  },
  {
    title: "Market / Valuation",
    items: [
      { name: "P/E", value: "24.1x", formula: "Price / EPS", source: ["Price", "EPS"] },
      { name: "EV/EBITDA", value: "12.7x", formula: "Enterprise Value / EBITDA", source: ["EV", "EBITDA"] },
      { name: "PEG", value: "1.3x", formula: "P/E / Growth", source: ["P/E", "Growth"] },
      { name: "Implied multiples", value: "DCF-derived", formula: "EV / Forward EBITDA", source: ["DCF", "EBITDA"] },
    ],
  },
  {
    title: "Cash Flow Quality",
    items: [
      { name: "CFO Proxy", value: "0.92x", formula: "Net Income + Non-cash adj.", source: ["Net Income", "D&A"] },
      { name: "FCF Margin", value: "18%", formula: "(CFO - Capex) / Revenue", source: ["CFO", "Capex", "Revenue"] },
      { name: "ΔNWC Decomposition", value: "+$24M", formula: "ΔAR + ΔInv - ΔAP", source: ["AR", "Inventory", "AP"] },
      { name: "Earnings Quality Proxy", value: "0.88x", formula: "CFO Proxy / Net Income", source: ["CFO Proxy", "Net Income"] },
    ],
  },
];

export default function RatioLabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ratio Lab</h1>
        <p className="text-sm text-muted-foreground">
          Deep ratio analysis with formula transparency, multi-year trends, and red-flag markers.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary">TTM view</Badge>
        <Badge variant="outline">5-year trend</Badge>
        <Badge variant="outline">Benchmarks: Sector preset</Badge>
        <Button variant="outline" size="sm">Add custom benchmark</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {ratioPanels.map((panel) => (
          <Card key={panel.title}>
            <CardHeader>
              <CardTitle className="text-base">{panel.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {panel.items.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <span className="text-xs">fx</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          <p className="font-semibold">Formula</p>
                          <p>{item.formula}</p>
                          <p className="mt-2 font-semibold">Source line-items</p>
                          <ul className="list-disc pl-4">
                            {item.source.map((source) => (
                              <li key={source}>{source}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Source mapping editable. <Link to="/data" className="text-primary underline">Edit mapping</Link>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    <Button variant="link" size="sm" className="px-0 text-xs">Edit mapping</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
