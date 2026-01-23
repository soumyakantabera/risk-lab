import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { useValuation } from "@/context/ValuationContext";
import { loadProjectState, saveProjectState } from "@/lib/valuation/storage";

interface ScoreMetric {
  key: string;
  label: string;
  weight: number;
  direction: "higher" | "lower";
  value: number;
  formula: string;
  sources: string[];
}

interface RatingBucket {
  name: string;
  cutoff: number;
}

const defaultScorecard = {
  buckets: [
    { name: "AAA", cutoff: 90 },
    { name: "AA", cutoff: 80 },
    { name: "A", cutoff: 70 },
    { name: "BBB", cutoff: 60 },
    { name: "BB", cutoff: 50 },
    { name: "B", cutoff: 40 },
    { name: "CCC", cutoff: 0 },
  ] as RatingBucket[],
  metrics: [
    {
      key: "netDebtEbitda",
      label: "Net Debt / EBITDA",
      weight: 0.25,
      direction: "lower",
      value: 2.6,
      formula: "Net Debt / EBITDA",
      sources: ["Net Debt", "EBITDA"],
    },
    {
      key: "interestCoverage",
      label: "EBITDA / Interest",
      weight: 0.25,
      direction: "higher",
      value: 6.2,
      formula: "EBITDA / Interest Expense",
      sources: ["EBITDA", "Interest Expense"],
    },
    {
      key: "fcfMargin",
      label: "FCF Margin",
      weight: 0.2,
      direction: "higher",
      value: 0.18,
      formula: "(CFO - Capex) / Revenue",
      sources: ["CFO", "Capex", "Revenue"],
    },
    {
      key: "currentRatio",
      label: "Current Ratio",
      weight: 0.15,
      direction: "higher",
      value: 1.5,
      formula: "Current Assets / Current Liabilities",
      sources: ["Current Assets", "Current Liabilities"],
    },
    {
      key: "roic",
      label: "ROIC",
      weight: 0.15,
      direction: "higher",
      value: 0.14,
      formula: "NOPAT / Invested Capital",
      sources: ["NOPAT", "Invested Capital"],
    },
  ] as ScoreMetric[],
};

export default function CreditScorecardPage() {
  const { projectId } = useValuation();
  const [scorecard, setScorecard] = useState(defaultScorecard);
  const [importJson, setImportJson] = useState("");

  useEffect(() => {
    setScorecard(loadProjectState(projectId, "credit-scorecard", defaultScorecard));
  }, [projectId]);

  useEffect(() => {
    saveProjectState(projectId, "credit-scorecard", scorecard);
  }, [projectId, scorecard]);

  const totalScore = useMemo(() => {
    return scorecard.metrics.reduce((sum, metric) => {
      const normalized = metric.direction === "higher" ? metric.value : 1 / Math.max(metric.value, 0.1);
      return sum + normalized * metric.weight * 100;
    }, 0);
  }, [scorecard.metrics]);

  const rating = useMemo(() => {
    const sorted = [...scorecard.buckets].sort((a, b) => b.cutoff - a.cutoff);
    return sorted.find((bucket) => totalScore >= bucket.cutoff) ?? sorted[sorted.length - 1];
  }, [scorecard.buckets, totalScore]);

  const drivers = useMemo(() => {
    return [...scorecard.metrics]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((metric) => metric.label);
  }, [scorecard.metrics]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scorecard, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "credit-scorecard.json";
    link.click();
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (parsed?.metrics && parsed?.buckets) {
        setScorecard(parsed);
      }
    } catch {
      // ignore invalid JSON
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credit Scorecard</h1>
        <p className="text-sm text-muted-foreground">
          Build internal rating buckets with weighted metrics, covenant headroom, and audit-friendly outputs.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Scorecard builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rating buckets</Label>
              <div className="grid gap-2">
                {scorecard.buckets.map((bucket, index) => (
                  <div key={bucket.name} className="grid grid-cols-[1fr_1fr] gap-2">
                    <Input
                      value={bucket.name}
                      onChange={(event) => {
                        const updated = [...scorecard.buckets];
                        updated[index] = { ...bucket, name: event.target.value };
                        setScorecard({ ...scorecard, buckets: updated });
                      }}
                    />
                    <Input
                      value={bucket.cutoff}
                      onChange={(event) => {
                        const updated = [...scorecard.buckets];
                        updated[index] = { ...bucket, cutoff: Number(event.target.value) };
                        setScorecard({ ...scorecard, buckets: updated });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Metrics & weights</Label>
              <div className="space-y-3">
                {scorecard.metrics.map((metric, index) => (
                  <div key={metric.key} className="rounded-lg border border-border/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={metric.label}
                        onChange={(event) => {
                          const updated = [...scorecard.metrics];
                          updated[index] = { ...metric, label: event.target.value };
                          setScorecard({ ...scorecard, metrics: updated });
                        }}
                      />
                      <Input
                        value={metric.weight}
                        onChange={(event) => {
                          const updated = [...scorecard.metrics];
                          updated[index] = { ...metric, weight: Number(event.target.value) };
                          setScorecard({ ...scorecard, metrics: updated });
                        }}
                      />
                      <Select
                        value={metric.direction}
                        onValueChange={(value) => {
                          const updated = [...scorecard.metrics];
                          updated[index] = { ...metric, direction: value as "higher" | "lower" };
                          setScorecard({ ...scorecard, metrics: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="higher">Higher is better</SelectItem>
                          <SelectItem value="lower">Lower is better</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        value={metric.value}
                        onChange={(event) => {
                          const updated = [...scorecard.metrics];
                          updated[index] = { ...metric, value: Number(event.target.value) };
                          setScorecard({ ...scorecard, metrics: updated });
                        }}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="px-0 text-xs">Formula</Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          <p>{metric.formula}</p>
                          <p className="mt-2 font-semibold">Source line-items</p>
                          <ul className="list-disc pl-4">
                            {metric.sources.map((source) => (
                              <li key={source}>{source}</li>
                            ))}
                          </ul>
                          <p className="mt-2">Missing inputs? <Link to="/data" className="underline">Edit mapping</Link></p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportJson}>Export scorecard JSON</Button>
              <Button variant="outline" size="sm" onClick={handleImport}>Import JSON</Button>
            </div>
            <Input
              value={importJson}
              onChange={(event) => setImportJson(event.target.value)}
              placeholder="Paste scorecard JSON to import"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs">Score</p>
                <p className="text-2xl font-semibold text-foreground">{totalScore.toFixed(1)}</p>
              </div>
              <Badge variant="secondary">{rating?.name}</Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min(100, totalScore)}%` }}
              />
            </div>
            <div>
              <p className="font-semibold text-foreground">Drivers</p>
              <ul className="list-disc pl-5">
                {drivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-semibold text-foreground">Covenant headroom</p>
              <p>Net Debt/EBITDA headroom: 0.6x</p>
              <p>Interest coverage buffer: 1.8x</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-semibold text-foreground">Integration suggestions</p>
              <p>Recommended spread tier: {rating?.name}</p>
              <p>Soft debt capacity guidance: 3.5x EBITDA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
