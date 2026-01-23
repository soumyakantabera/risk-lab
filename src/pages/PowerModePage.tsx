import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useValuation } from "@/context/ValuationContext";
import { runMonteCarlo } from "@/lib/valuation/monteCarlo";
import { iterativeWacc } from "@/lib/valuation/wacc";
import { defaultCountries } from "@/lib/valuation/country";

export default function PowerModePage() {
  const { powerMode, togglePowerMode } = useValuation();
  const [seed, setSeed] = useState(42);
  const [iterations, setIterations] = useState(5000);
  const [mean, setMean] = useState(0.08);
  const [volatility, setVolatility] = useState(0.12);

  const monteCarloResults = useMemo(
    () => runMonteCarlo({ seed, iterations, mean, volatility }),
    [seed, iterations, mean, volatility]
  );

  const percentile = (pct: number) => {
    const sorted = [...monteCarloResults].sort((a, b) => a - b);
    const index = Math.floor((pct / 100) * (sorted.length - 1));
    return sorted[index];
  };

  const solver = iterativeWacc({
    startingLeverage: 0.45,
    targetIterations: 8,
    baseEquity: 2500,
    baseDebt: 1500,
    country: defaultCountries[0],
    beta: 1.2,
    spread: 0.035,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Power Mode</h1>
          <p className="text-sm text-muted-foreground">
            Advanced controls for Monte Carlo, scenario blending, sensitivity heatmaps, and normalization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={powerMode ? "default" : "secondary"}>{powerMode ? "Enabled" : "Disabled"}</Badge>
          <div className="flex items-center gap-2">
            <Switch checked={powerMode} onCheckedChange={togglePowerMode} />
            <span className="text-sm">Power Mode</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monte Carlo distributions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Seed (deterministic)</Label>
                <Input value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Iterations</Label>
                <Input value={iterations} onChange={(event) => setIterations(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Mean</Label>
                <Input value={mean} onChange={(event) => setMean(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Volatility</Label>
                <Input value={volatility} onChange={(event) => setVolatility(Number(event.target.value))} />
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
              <p>VaR band (5th / 95th): {percentile(5).toFixed(3)} / {percentile(95).toFixed(3)}</p>
              <p>Median valuation factor: {percentile(50).toFixed(3)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Base Case — 60%</p>
              <p>Equity value: $4.4B</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Upside — 25%</p>
              <p>Equity value: $5.6B</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Downside — 15%</p>
              <p>Equity value: $3.2B</p>
            </div>
            <Button variant="outline" size="sm">Blend scenarios</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensitivity grid builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Choose any two drivers (WACC, terminal growth, margin) to generate a heatmap table.</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="rounded-md border border-border/60 p-2 text-center">
                  {(4.2 + idx * 0.1).toFixed(1)}x
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm">Configure drivers</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Normalized EBITDA editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 p-3">
              <p>Reported EBITDA: $320M</p>
              <p>Add-backs: +$28M</p>
              <p>One-offs: -$12M</p>
              <p className="font-semibold text-foreground">Normalized EBITDA: $336M</p>
            </div>
            <Button variant="outline" size="sm">Edit add-backs</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Circularity solver (WACC ↔ leverage)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Iterative solver output with controlled iterations and stop criteria.</p>
            <div className="rounded-lg border border-border/60 p-3">
              <p>Implied WACC: {(solver.wacc * 100).toFixed(2)}%</p>
              <p>Ending leverage: {(solver.leverage * 100).toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
