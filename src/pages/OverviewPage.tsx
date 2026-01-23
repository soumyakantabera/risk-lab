import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Cpu, Database, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Multi-stage valuation suite",
    description: "FCFF/FCFE DCF, H-Model, APV, EVA, residual income, and implied valuation tools.",
  },
  {
    title: "Sector playbooks",
    description: "SaaS, banks, insurance, REITs, energy, consumer, and industrials with default KPI guidance.",
  },
  {
    title: "Power-user modeling",
    description: "Monte Carlo, scenario weights, tornado grids, and normalized EBITDA workflows.",
  },
  {
    title: "Offline data hub",
    description: "Bundled sample statements, mapping heuristics, and local-only import workflow.",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit">Production-ready • Offline-first</Badge>
          <h1 className="text-3xl font-semibold text-foreground">Valuation Lab Pro</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Build defensible valuations with institutional-grade tooling — multi-stage DCFs, sector playbooks, ratio
            diagnostics, and board-ready reports. Designed to deploy on GitHub Pages with full offline capability.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/valuations" className="gap-2">
                Launch Valuation Suite <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/data" className="gap-2">
                Open Data Hub <Database className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <Card className="lg:w-[360px]">
          <CardHeader>
            <CardTitle className="text-sm">Lab Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium">Offline + GitHub Pages</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sample datasets</span>
              <span className="font-medium">3 bundles</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Automation</span>
              <span className="font-medium">Report Builder + Audit</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {highlights.map((item) => (
          <Card key={item.title} className="bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.description}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Model inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Expanded DCF, dividends, real options, SOTP, implied valuation, and upgraded LBO/M&A workflows.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/valuations">Explore models</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Power Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Activate Monte Carlo distributions, scenario blending, and solver-driven WACC leverage loops.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/power">Configure power mode</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Reporting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Assemble investor-ready reports with exportable HTML, CSV tables, and JSON project snapshots.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/reports">Open report builder</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
