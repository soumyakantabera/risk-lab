import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

const tranches = [
  { name: "Term Loan A", rate: "SOFR + 275", amort: "5%", sweep: "Yes" },
  { name: "Term Loan B", rate: "SOFR + 350", amort: "1%", sweep: "Yes" },
  { name: "Second Lien", rate: "Fixed 10.5%", amort: "0%", sweep: "No" },
  { name: "PIK Notes", rate: "PIK 12%", amort: "0%", sweep: "No" },
];

export default function DealSuitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">M&A + LBO Suite</h1>
        <p className="text-sm text-muted-foreground">
          Enhanced deal modeling with separate forecast drivers, synergies, and multi-tranche debt structures.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>M&A Deal Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Buyer vs Target drivers</Badge>
              <Badge variant="secondary">Cash/Debt/Stock mix</Badge>
              <Badge variant="secondary">Earn-out optional</Badge>
              <Badge variant="secondary">Synergy ramp</Badge>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              <li>Financing fees + integration costs toggle.</li>
              <li>Deferred tax/amortization switch (lite).</li>
              <li>Outputs: accretion/dilution, leverage path, ownership, breakeven synergy.</li>
            </ul>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Accretion / Dilution</p>
              <p>+4.2% EPS accretion in Year 2</p>
            </div>
            <Button variant="outline" size="sm">Export M&A report</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LBO Engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Multiple tranches</Badge>
              <Badge variant="secondary">Cash sweep + min cash</Badge>
              <Badge variant="secondary">PIK toggle</Badge>
              <Badge variant="secondary">Exit multiple</Badge>
            </div>
            <div className="space-y-3">
              {tranches.map((tranche) => (
                <div key={tranche.name} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium text-foreground">{tranche.name}</p>
                  <p>Rate: {tranche.rate}</p>
                  <p>Amort: {tranche.amort}</p>
                  <p>Cash sweep: {tranche.sweep}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Returns</p>
              <p>IRR: 22%</p>
              <p>MoM: 2.4x</p>
              <p>PME proxy: 1.35x</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Interest deductibility</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="px-0 text-xs">Formula</Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    tax_shield = deductible_interest × tax_rate.
                    <p className="mt-2">Sources: Interest Expense, EBITDA/EBIT, Tax Rate.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p>Deductible interest capped at 30% of EBITDA. Tax shield constrained in Year 3.</p>
              <Link to="/valuations" className="text-primary underline">Review deductibility table</Link>
            </div>
            <Button variant="outline" size="sm">Export LBO model</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
