import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Sliders } from "lucide-react";
import { useValuation } from "@/context/ValuationContext";
import { loadProjectState, saveProjectState } from "@/lib/valuation/storage";
import Papa from "papaparse";

interface PeerRecord {
  ticker: string;
  name: string;
  region?: string;
  sector?: string;
  currency?: string;
  revenue?: number;
  revenueGrowth1y?: number;
  revenueGrowth3y?: number;
  ebitdaMargin?: number;
  ebitMargin?: number;
  marketCap?: number;
  evToRevenue?: number;
  evToEbitda?: number;
}

interface UniverseMeta {
  universe_id: string;
  region: string;
  sector: string;
  path: string;
  as_of_date: string;
  description: string;
}

interface UniverseDetail {
  universe_id: string;
  region: string;
  sector: string;
  as_of_date: string;
  notes: string;
  tickers: Array<{
    ticker: string;
    name: string;
    currency: string;
    exchange: string;
    country: string;
    subsector?: string;
    style?: string;
    market_cap_bucket?: string;
  }>;
}

interface MetricsSnapshotRecord {
  ticker: string;
  revenue_ttm?: number;
  revenue_cagr_3y?: number;
  ebitda_margin_ttm?: number;
  gross_margin?: number;
  net_debt_ebitda?: number;
  ev_ebitda?: number;
  ev_revenue?: number;
  pe?: number;
  source: string;
  as_of_date: string;
}

const assumptions = [
  { label: "WACC", value: "8.9%" },
  { label: "Terminal growth", value: "2.5%" },
  { label: "Net debt", value: "$420M" },
  { label: "Tax rate", value: "24%" },
];

const exportButtons = (
  <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" className="gap-2">
      <Download className="h-3 w-3" /> Export JSON
    </Button>
    <Button variant="outline" size="sm" className="gap-2">
      <Download className="h-3 w-3" /> Export CSV
    </Button>
  </div>
);

const defaultScreenerState = {
  source: "sample",
  logScale: false,
  useTtm: true,
  strictFiltering: false,
  revenueRange: [100, 2000],
  growthRange: [-0.05, 0.4],
  marginRange: [0.05, 0.6],
  region: "All",
  sector: "All",
  currency: "All",
  marketCapRange: [200, 10000],
  weights: { size: 0.4, growth: 0.35, margin: 0.25 },
  selected: [] as string[],
  imported: "",
  sortKey: "similarity",
  sortDir: "asc",
  universeRegion: "us",
  universeSector: "saas_software",
  universeStyle: "All",
  universeMarketCap: "All",
  activeUniverseId: "",
};

const defaultBetaState = {
  method: "manual",
  region: "US",
  sector: "Software",
  manualBeta: 1.15,
  lockBeta: false,
  targetDebtToEquity: 0.4,
  taxRate: 0.25,
  unleveredBetas: {
    Software: 1.05,
    Payments: 1.2,
    Banking: 0.75,
    Insurance: 0.9,
    Industrials: 1.1,
    Energy: 1.25,
  },
  factorWeights: { market: 0.6, size: 0.15, value: 0.15, momentum: 0.1 },
};

const defaultDeductibilityState = {
  mode: "full",
  capStyle: "ebitda",
  capPercent: 0.3,
  fixedCap: 25,
  carryforward: true,
  countryPreset: "US",
  schedule: [
    { year: "Y1", interest: 42, ebitda: 180, ebit: 150 },
    { year: "Y2", interest: 46, ebitda: 195, ebit: 162 },
    { year: "Y3", interest: 52, ebitda: 210, ebit: 172 },
  ],
};

const factorExposures: Record<string, { size: number; value: number; momentum: number }> = {
  Software: { size: 0.2, value: -0.1, momentum: 0.15 },
  Payments: { size: 0.15, value: 0.05, momentum: 0.1 },
  Banking: { size: 0.1, value: 0.2, momentum: -0.05 },
  Insurance: { size: 0.08, value: 0.15, momentum: -0.03 },
  Industrials: { size: 0.12, value: 0.1, momentum: 0.05 },
  Energy: { size: 0.18, value: 0.25, momentum: 0.1 },
};

const capPresets: Record<string, { capPercent: number; capStyle: string }> = {
  US: { capPercent: 0.3, capStyle: "ebitda" },
  Italy: { capPercent: 0.3, capStyle: "ebitda" },
  Germany: { capPercent: 0.3, capStyle: "ebitda" },
  UK: { capPercent: 0.3, capStyle: "ebitda" },
  India: { capPercent: 0.3, capStyle: "ebitda" },
  Custom: { capPercent: 0.3, capStyle: "ebitda" },
};

export default function ValuationPage() {
  const { projectId } = useValuation();
  const [tab, setTab] = useState("dcf");
  const location = useLocation();
  const [peers, setPeers] = useState<PeerRecord[]>([]);
  const [universes, setUniverses] = useState<UniverseMeta[]>([]);
  const [activeUniverse, setActiveUniverse] = useState<UniverseDetail | null>(null);
  const [metricsSnapshot, setMetricsSnapshot] = useState<Record<string, MetricsSnapshotRecord>>({});
  const [customUniverses, setCustomUniverses] = useState<UniverseDetail[]>([]);
  const [customName, setCustomName] = useState("My Custom Universe");
  const [customUniverseImport, setCustomUniverseImport] = useState("");
  const [customEditTickers, setCustomEditTickers] = useState("");
  const [screener, setScreener] = useState(defaultScreenerState);
  const [betaLab, setBetaLab] = useState(defaultBetaState);
  const [deductibility, setDeductibility] = useState(defaultDeductibilityState);

  useEffect(() => {
    setScreener(loadProjectState(projectId, "comps-screener", defaultScreenerState));
    setBetaLab(loadProjectState(projectId, "beta-lab", defaultBetaState));
    setDeductibility(loadProjectState(projectId, "deductibility", defaultDeductibilityState));
    setCustomUniverses(loadProjectState(projectId, "custom-universes", []));
  }, [projectId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get("tab");
    if (requested) {
      setTab(requested);
    }
  }, [location.search]);

  useEffect(() => {
    saveProjectState(projectId, "comps-screener", screener);
  }, [projectId, screener]);

  useEffect(() => {
    saveProjectState(projectId, "beta-lab", betaLab);
  }, [projectId, betaLab]);

  useEffect(() => {
    saveProjectState(projectId, "deductibility", deductibility);
  }, [projectId, deductibility]);

  useEffect(() => {
    saveProjectState(projectId, "custom-universes", customUniverses);
  }, [projectId, customUniverses]);

  useEffect(() => {
    const loadData = async () => {
      const [indexResponse, metricsResponse] = await Promise.all([
        fetch("/data/peer_universes/index.json"),
        fetch("/data/peer_universes/metrics_snapshot.json"),
      ]);
      const indexData = await indexResponse.json();
      const metricsData: MetricsSnapshotRecord[] = await metricsResponse.json();
      setUniverses(indexData.universes ?? []);
      setMetricsSnapshot(
        metricsData.reduce<Record<string, MetricsSnapshotRecord>>((acc, record) => {
          acc[record.ticker] = record;
          return acc;
        }, {})
      );
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!screener.activeUniverseId && universes.length > 0) {
      setScreener((prev) => ({ ...prev, activeUniverseId: universes[0].universe_id }));
    }
  }, [screener.activeUniverseId, universes]);

  useEffect(() => {
    if (screener.source !== "sample") return;
    if (!screener.activeUniverseId) return;
    const meta = universes.find((item) => item.universe_id === screener.activeUniverseId);
    if (!meta) return;
    const loadUniverse = async () => {
      const response = await fetch(meta.path);
      const data: UniverseDetail = await response.json();
      setActiveUniverse(data);
      const mappedPeers = mapUniverseToPeers(data);
      setPeers(mappedPeers);
    };
    loadUniverse();
  }, [screener.source, screener.activeUniverseId, universes, metricsSnapshot]);

  const parsedImport = useMemo(() => {
    if (!screener.imported.trim()) return [] as PeerRecord[];
    try {
      const json = JSON.parse(screener.imported);
      if (Array.isArray(json)) return json as PeerRecord[];
      if (Array.isArray(json.peers)) return json.peers as PeerRecord[];
    } catch {
      const result = Papa.parse(screener.imported, { header: true });
      return (result.data as PeerRecord[]).filter((row) => row.ticker);
    }
    return [];
  }, [screener.imported]);

  const universe = screener.source === "import" ? parsedImport : peers;

  const filteredPeers = useMemo(() => {
    return universe.filter((peer) => {
      const revenue = peer.revenue ?? null;
      const growth = peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? null;
      const margin = peer.ebitdaMargin ?? peer.ebitMargin ?? null;
      const marketCap = peer.marketCap ?? null;

      const revenueOk = revenue === null
        ? !screener.strictFiltering
        : revenue >= screener.revenueRange[0] && revenue <= screener.revenueRange[1];
      const growthOk = growth === null
        ? !screener.strictFiltering
        : growth >= screener.growthRange[0] && growth <= screener.growthRange[1];
      const marginOk = margin === null
        ? !screener.strictFiltering
        : margin >= screener.marginRange[0] && margin <= screener.marginRange[1];
      const capOk = marketCap === null
        ? !screener.strictFiltering
        : marketCap >= screener.marketCapRange[0] && marketCap <= screener.marketCapRange[1];
      const regionOk = screener.region === "All" || peer.region === screener.region;
      const sectorOk = screener.sector === "All" || peer.sector === screener.sector;
      const currencyOk = screener.currency === "All" || peer.currency === screener.currency;

      return revenueOk && growthOk && marginOk && capOk && regionOk && sectorOk && currencyOk;
    });
  }, [universe, screener]);


  const similarityScores = useMemo(() => {
    const values = filteredPeers.map((peer) => ({
      size: peer.revenue ?? null,
      growth: peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? null,
      margin: peer.ebitdaMargin ?? peer.ebitMargin ?? null,
    }));

    const means = {
      size: average(values.map((v) => v.size).filter((v): v is number => v !== null)),
      growth: average(values.map((v) => v.growth).filter((v): v is number => v !== null)),
      margin: average(values.map((v) => v.margin).filter((v): v is number => v !== null)),
    };

    const stdevs = {
      size: std(values.map((v) => v.size).filter((v): v is number => v !== null)),
      growth: std(values.map((v) => v.growth).filter((v): v is number => v !== null)),
      margin: std(values.map((v) => v.margin).filter((v): v is number => v !== null)),
    };

    return filteredPeers.map((peer) => {
      const size = peer.revenue ?? null;
      const growth = peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? null;
      const margin = peer.ebitdaMargin ?? peer.ebitMargin ?? null;
      const sizeZ = size === null || stdevs.size === 0 ? 0 : (size - means.size) / stdevs.size;
      const growthZ = growth === null || stdevs.growth === 0 ? 0 : (growth - means.growth) / stdevs.growth;
      const marginZ = margin === null || stdevs.margin === 0 ? 0 : (margin - means.margin) / stdevs.margin;
      const distance = Math.sqrt(
        screener.weights.size * sizeZ ** 2 +
        screener.weights.growth * growthZ ** 2 +
        screener.weights.margin * marginZ ** 2
      );
      return {
        ticker: peer.ticker,
        distance,
      };
    });
  }, [filteredPeers, screener.weights]);

  const scoresByTicker = Object.fromEntries(similarityScores.map((score) => [score.ticker, score.distance]));

  const sortedPeers = useMemo(() => {
    const sorted = [...filteredPeers];
    const getValue = (peer: PeerRecord) => {
      switch (screener.sortKey) {
        case "revenue":
          return peer.revenue ?? 0;
        case "growth":
          return peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? 0;
        case "margin":
          return peer.ebitdaMargin ?? peer.ebitMargin ?? 0;
        case "similarity":
        default:
          return scoresByTicker[peer.ticker] ?? 0;
      }
    };
    sorted.sort((a, b) => {
      const delta = getValue(a) - getValue(b);
      return screener.sortDir === "asc" ? delta : -delta;
    });
    return sorted;
  }, [filteredPeers, screener.sortDir, screener.sortKey, scoresByTicker]);

  const coverage = useMemo(() => {
    const count = filteredPeers.length;
    const distances = similarityScores.map((score) => score.distance);
    const dispersion = std(distances);
    const withMetrics = filteredPeers.filter((peer) =>
      peer.revenue !== undefined && peer.ebitdaMargin !== undefined && peer.revenueGrowth3y !== undefined
    ).length;
    const coveragePct = count === 0 ? 0 : Math.round((withMetrics / count) * 100);
    const asOfDates = Object.values(metricsSnapshot).map((record) => new Date(record.as_of_date).getTime());
    const latest = asOfDates.length > 0 ? Math.max(...asOfDates) : Date.now();
    const stalenessDays = Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
    return { count, dispersion, coveragePct, stalenessDays };
  }, [filteredPeers, similarityScores, metricsSnapshot]);

  const selectedPeers = filteredPeers.filter((peer) => screener.selected.includes(peer.ticker));

  const compsSummary = useMemo(() => {
    const pool = selectedPeers.length > 0 ? selectedPeers : filteredPeers;
    return {
      evToRevenue: median(pool.map((peer) => peer.evToRevenue).filter((v): v is number => v !== undefined)),
      evToEbitda: median(pool.map((peer) => peer.evToEbitda).filter((v): v is number => v !== undefined)),
    };
  }, [selectedPeers, filteredPeers]);

  const sensitivities = useMemo(
    () => [
      { label: "WACC ± 100 bps", value: "Equity value range: $4.2B – $5.6B" },
      { label: "Terminal growth ± 1%", value: "EV range: $4.0B – $6.1B" },
      { label: "Exit multiple ± 1x", value: "EV range: $4.4B – $5.7B" },
    ],
    []
  );

  const leveredBeta = useMemo(() => {
    if (betaLab.method === "manual") return betaLab.manualBeta;
    if (betaLab.method === "bottom-up") {
      const unlevered = betaLab.unleveredBetas[betaLab.sector] ?? 1;
      return unlevered * (1 + (1 - betaLab.taxRate) * betaLab.targetDebtToEquity);
    }
    const exposure = factorExposures[betaLab.sector] ?? { size: 0.1, value: 0.1, momentum: 0.1 };
    const factor =
      betaLab.factorWeights.market * 1 +
      betaLab.factorWeights.size * exposure.size +
      betaLab.factorWeights.value * exposure.value +
      betaLab.factorWeights.momentum * exposure.momentum;
    return Number((1 + factor).toFixed(2));
  }, [betaLab]);

  const taxShieldTable = useMemo(() => {
    let carry = 0;
    return deductibility.schedule.map((row) => {
      if (deductibility.mode === "none") {
        return { ...row, cap: 0, deductible: 0, disallowed: row.interest, taxShield: 0 };
      }

      const baseCap = deductibility.capStyle === "ebitda"
        ? row.ebitda * deductibility.capPercent
        : deductibility.capStyle === "ebit"
          ? row.ebit * deductibility.capPercent
          : deductibility.fixedCap;

      const cap = deductibility.mode === "full" ? row.interest : baseCap;
      const deductible = Math.min(row.interest, cap + carry);
      const disallowed = Math.max(0, row.interest - deductible);
      if (deductibility.carryforward) {
        carry = carry + (cap - deductible);
      }
      return {
        ...row,
        cap,
        deductible,
        disallowed,
        taxShield: deductible * betaLab.taxRate,
      };
    });
  }, [deductibility, betaLab.taxRate]);

  const taxShieldWarning = taxShieldTable.some((row) => row.disallowed > 0);

  const filterUniverseTickers = (data: UniverseDetail) =>
    data.tickers.filter((ticker) => {
      const styleOk = screener.universeStyle === "All" || ticker.style === screener.universeStyle.toLowerCase();
      const capOk =
        screener.universeMarketCap === "All" ||
        ticker.market_cap_bucket === screener.universeMarketCap;
      return styleOk && capOk;
    });

  const mapUniverseToPeers = (data: UniverseDetail) =>
    filterUniverseTickers(data).map((ticker) => {
      const metrics = metricsSnapshot[ticker.ticker];
      return {
        ticker: ticker.ticker,
        name: ticker.name,
        region: data.region,
        sector: data.sector,
        currency: ticker.currency,
        revenue: metrics?.revenue_ttm,
        revenueGrowth3y: metrics?.revenue_cagr_3y,
        ebitdaMargin: metrics?.ebitda_margin_ttm,
        marketCap: ticker.market_cap_bucket === "Large" ? 12000 : ticker.market_cap_bucket === "Mid" ? 5000 : 1200,
        evToRevenue: metrics?.ev_revenue,
        evToEbitda: metrics?.ev_ebitda,
      } as PeerRecord;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Valuation Suite</h1>
          <p className="text-sm text-muted-foreground">
            Multi-stage DCF, dividend models, real options, SOTP, and implied valuation cross-checks.
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Sliders className="h-4 w-4" /> Assumptions Drawer
            </Button>
          </SheetTrigger>
          <SheetContent className="space-y-4">
            <SheetHeader>
              <SheetTitle>Sticky assumptions</SheetTitle>
            </SheetHeader>
            <div className="space-y-3">
              {assumptions.map((assumption) => (
                <div key={assumption.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{assumption.label}</span>
                  <span className="font-medium">{assumption.value}</span>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dcf">Multi-stage DCF</TabsTrigger>
          <TabsTrigger value="dividends">Dividend & Payout</TabsTrigger>
          <TabsTrigger value="comps">Comps</TabsTrigger>
          <TabsTrigger value="options">Real Options</TabsTrigger>
          <TabsTrigger value="sotp">SOTP</TabsTrigger>
          <TabsTrigger value="implied">Implied Valuation</TabsTrigger>
        </TabsList>

        <TabsContent value="dcf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-stage DCF Suite</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">FCFF (UFCF)</Badge>
                <Badge variant="secondary">FCFE</Badge>
                <Badge variant="secondary">2-stage / 3-stage</Badge>
                <Badge variant="secondary">H-Model</Badge>
                <Badge variant="secondary">APV</Badge>
                <Badge variant="secondary">Economic Profit / EVA</Badge>
                <Badge variant="secondary">Residual Income</Badge>
              </div>
              <p>
                Configure explicit growth, fade, and terminal blocks with a full sensitivity table for WACC, growth,
                and exit multiples. Toggle APV adjustments for tax shields and distress costs.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Outputs</h3>
                  <ul className="mt-2 space-y-1">
                    <li>Enterprise value: $5.1B</li>
                    <li>Equity value: $4.4B</li>
                    <li>PV of tax shield: $280M</li>
                    <li>Residual income value: $4.8B</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Sensitivities</h3>
                  <ul className="mt-2 space-y-1">
                    {sensitivities.map((item) => (
                      <li key={item.label}>
                        <span className="font-medium text-foreground">{item.label}:</span> {item.value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {exportButtons}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WACC / Cost of Equity — Beta Lab</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Beta method</Label>
                  <Select value={betaLab.method} onValueChange={(value) => setBetaLab({ ...betaLab, method: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual beta</SelectItem>
                      <SelectItem value="bottom-up">Bottom-up beta</SelectItem>
                      <SelectItem value="factor">Factor beta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={betaLab.region} onValueChange={(value) => setBetaLab({ ...betaLab, region: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "US",
                        "Europe",
                        "UK",
                        "India",
                        "Custom",
                      ].map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Select value={betaLab.sector} onValueChange={(value) => setBetaLab({ ...betaLab, sector: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(betaLab.unleveredBetas).map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {betaLab.method === "manual" && (
                <div className="space-y-2">
                  <Label>Manual beta</Label>
                  <Input
                    value={betaLab.manualBeta}
                    onChange={(event) => setBetaLab({ ...betaLab, manualBeta: Number(event.target.value) })}
                  />
                </div>
              )}

              {betaLab.method === "bottom-up" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Unlevered beta by sector</Label>
                    <div className="space-y-2">
                      {Object.entries(betaLab.unleveredBetas).map(([sector, value]) => (
                        <div key={sector} className="flex items-center justify-between gap-2 text-xs">
                          <span>{sector}</span>
                          <Input
                            value={value}
                            onChange={(event) =>
                              setBetaLab({
                                ...betaLab,
                                unleveredBetas: { ...betaLab.unleveredBetas, [sector]: Number(event.target.value) },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target D/E</Label>
                    <Input
                      value={betaLab.targetDebtToEquity}
                      onChange={(event) => setBetaLab({ ...betaLab, targetDebtToEquity: Number(event.target.value) })}
                    />
                    <Label>Tax rate</Label>
                    <Input
                      value={betaLab.taxRate}
                      onChange={(event) => setBetaLab({ ...betaLab, taxRate: Number(event.target.value) })}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="px-0 text-xs">Formula</Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        β<sub>L</sub> = β<sub>U</sub> × (1 + (1 − tax) × D/E)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              {betaLab.method === "factor" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Factor weights (Market, Size, Value, Momentum)</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(betaLab.factorWeights).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs capitalize">{key}</Label>
                          <Input
                            value={value}
                            onChange={(event) =>
                              setBetaLab({
                                ...betaLab,
                                factorWeights: { ...betaLab.factorWeights, [key]: Number(event.target.value) },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Factor beta (educational)</p>
                    <p>beta_equivalent = 1 + Σ(weight × exposure)</p>
                    <p>Sector exposures are preset and editable in future versions.</p>
                    <p className="mt-2">Not a full Barra model.</p>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="font-semibold text-foreground">Beta breakdown</p>
                  <p>Source: {betaLab.method === "manual" ? "Manual input" : betaLab.method === "bottom-up" ? "Bottom-up beta" : "Factor beta"}</p>
                  <p>Levered beta: {leveredBeta.toFixed(2)}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-0 text-xs">Formula</Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <p>Bottom-up: β<sub>L</sub> = β<sub>U</sub> × (1 + (1 − tax) × D/E).</p>
                      <p>Factor beta: beta_equivalent = 1 + Σ(weight × exposure).</p>
                      <p className="mt-2">Sources: sector beta table, D/E, tax rate, factor weights.</p>
                      <p>Missing inputs? <Link to="/data" className="underline">Edit mapping</Link></p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">Computed beta: {leveredBeta.toFixed(2)}</Badge>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={betaLab.lockBeta}
                      onCheckedChange={(value) => setBetaLab({ ...betaLab, lockBeta: value })}
                    />
                    Lock beta for scenarios
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interest Deductibility & Tax Shield</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={deductibility.mode}
                    onValueChange={(value) => setDeductibility({ ...deductibility, mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full deductibility</SelectItem>
                      <SelectItem value="cap">Capped deductibility</SelectItem>
                      <SelectItem value="none">No deductibility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country preset</Label>
                  <Select
                    value={deductibility.countryPreset}
                    onValueChange={(value) => {
                      const preset = capPresets[value] ?? capPresets.Custom;
                      setDeductibility({
                        ...deductibility,
                        countryPreset: value,
                        capPercent: preset.capPercent,
                        capStyle: preset.capStyle,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(capPresets).map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {preset}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={deductibility.carryforward}
                    onCheckedChange={(value) => setDeductibility({ ...deductibility, carryforward: value })}
                  />
                  Carryforward disallowed interest
                </div>
              </div>

              {deductibility.mode === "cap" && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Cap style</Label>
                    <Select
                      value={deductibility.capStyle}
                      onValueChange={(value) => setDeductibility({ ...deductibility, capStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ebitda">% of EBITDA</SelectItem>
                        <SelectItem value="ebit">% of EBIT</SelectItem>
                        <SelectItem value="fixed">Fixed cap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cap percentage</Label>
                    <Input
                      value={deductibility.capPercent}
                      onChange={(event) => setDeductibility({ ...deductibility, capPercent: Number(event.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fixed cap</Label>
                    <Input
                      value={deductibility.fixedCap}
                      onChange={(event) => setDeductibility({ ...deductibility, fixedCap: Number(event.target.value) })}
                    />
                  </div>
                </div>
              )}

              {taxShieldWarning && (
                <Badge variant="destructive">Tax shield constrained: cap binding</Badge>
              )}

              <div className="rounded-lg border border-border/60 p-3">
                <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground">
                  <span>Year</span>
                  <span>Interest</span>
                  <span>Cap</span>
                  <span>Deductible</span>
                  <span>Tax Shield</span>
                </div>
                {taxShieldTable.map((row) => (
                  <div key={row.year} className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
                    <span>{row.year}</span>
                    <span>{row.interest.toFixed(1)}</span>
                    <span>{row.cap.toFixed(1)}</span>
                    <span>{row.deductible.toFixed(1)}</span>
                    <span>{row.taxShield.toFixed(1)}</span>
                  </div>
                ))}
                <p className="mt-2 text-[11px]">
                  Formula: tax_shield = deductible_interest × tax_rate. Missing inputs? <Link to="/data" className="text-primary underline">Edit mapping</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dividends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dividend & Payout Models</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ul className="list-disc space-y-1 pl-5">
                <li>Gordon Growth and multi-stage DDM with payout schedules.</li>
                <li>Total payout model: dividends + buybacks.</li>
                <li>FCFE payout implied growth analysis with target ROE.</li>
              </ul>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Outputs</h3>
                  <p>Intrinsic equity value: $42.80 per share</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Sensitivities</h3>
                  <p>Dividend growth ± 50 bps impacts value by ±7%.</p>
                </div>
              </div>
              {exportButtons}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peer Screener</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-muted-foreground">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Peer universe source</Label>
                  <Select value={screener.source} onValueChange={(value) => setScreener({ ...screener, source: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sample">Bundled sample peers</SelectItem>
                      <SelectItem value="import">User import</SelectItem>
                      <SelectItem value="proxy">Live proxy (optional)</SelectItem>
                    </SelectContent>
                  </Select>
                  {screener.source === "proxy" && (
                    <p className="text-xs">Document proxy in deployment settings before enabling.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Universe picker</Label>
                  <div className="grid gap-2">
                    <Select
                      value={screener.universeRegion}
                      onValueChange={(value) => setScreener({ ...screener, universeRegion: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        {["us", "europe", "uk", "india", "global"].map((region) => (
                          <SelectItem key={region} value={region}>
                            {region.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={screener.universeSector}
                      onValueChange={(value) => setScreener({ ...screener, universeSector: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "saas_software",
                          "semiconductors",
                          "consumer_retail",
                          "industrials",
                          "banks",
                          "insurance",
                          "reit",
                          "utilities_energy",
                        ].map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={screener.universeStyle}
                      onValueChange={(value) => setScreener({ ...screener, universeStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent>
                        {["All", "Growth", "Value", "Blend"].map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={screener.universeMarketCap}
                      onValueChange={(value) => setScreener({ ...screener, universeMarketCap: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Market cap bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        {["All", "Small", "Mid", "Large"].map((bucket) => (
                          <SelectItem key={bucket} value={bucket}>
                            {bucket}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={screener.region} onValueChange={(value) => setScreener({ ...screener, region: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All", "US", "Europe", "UK", "India"].map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Select value={screener.sector} onValueChange={(value) => setScreener({ ...screener, sector: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All", "SaaS", "Payments", "FinTech", "Infrastructure"].map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={screener.currency} onValueChange={(value) => setScreener({ ...screener, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All", "USD", "EUR", "GBP", "INR"].map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Use TTM vs FY</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={screener.useTtm}
                      onCheckedChange={(value) => setScreener({ ...screener, useTtm: value })}
                    />
                    {screener.useTtm ? "TTM" : "FY"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Strict filtering</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={screener.strictFiltering}
                      onCheckedChange={(value) => setScreener({ ...screener, strictFiltering: value })}
                    />
                    {screener.strictFiltering ? "Exclude N/A metrics" : "Allow N/A metrics"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Revenue log scale</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={screener.logScale}
                      onCheckedChange={(value) => setScreener({ ...screener, logScale: value })}
                    />
                    {screener.logScale ? "Log" : "Linear"}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const universe = universes.find(
                      (item) =>
                        item.region === screener.universeRegion &&
                        item.sector === screener.universeSector
                    );
                    if (!universe) return;
                    setScreener({ ...screener, activeUniverseId: universe.universe_id, selected: [] });
                  }}
                >
                  Load universe
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const universe = universes.find(
                      (item) =>
                        item.region === screener.universeRegion &&
                        item.sector === screener.universeSector
                    );
                    if (!universe || universe.universe_id === screener.activeUniverseId) return;
                    fetch(universe.path)
                      .then((response) => response.json())
                      .then((data: UniverseDetail) => {
                        const mappedPeers = mapUniverseToPeers(data);
                        const merged = [...peers, ...mappedPeers].reduce<PeerRecord[]>((acc, peer) => {
                          if (!acc.find((item) => item.ticker === peer.ticker)) acc.push(peer);
                          return acc;
                        }, []);
                        setPeers(merged);
                        setActiveUniverse(data);
                      });
                  }}
                >
                  Add to current set
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({ ...screener, selected: [] })}
                >
                  Reset selection
                </Button>
              </div>

              {customUniverses.length > 0 && (
                <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Custom universes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customUniverses.map((universe) => (
                      <Button
                        key={universe.universe_id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveUniverse(universe);
                          setPeers(mapUniverseToPeers(universe));
                          setCustomEditTickers(universe.tickers.map((ticker) => ticker.ticker).join(", "));
                        }}
                      >
                        {universe.notes}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {activeUniverse && (
                <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{activeUniverse.universe_id}</p>
                  <p>{activeUniverse.notes}</p>
                  <p>As of {activeUniverse.as_of_date} • {activeUniverse.tickers.length} peers</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">Coverage {coverage.coveragePct}%</Badge>
                    <Badge variant={coverage.stalenessDays > 180 ? "destructive" : "outline"}>
                      Staleness {coverage.stalenessDays} days
                    </Badge>
                    <Badge variant="outline">Dispersion {coverage.dispersion.toFixed(2)}</Badge>
                  </div>
                  {coverage.stalenessDays > 180 && (
                    <p className="mt-2 text-[11px]">Metrics snapshot older than 180 days.</p>
                  )}
                  {coverage.coveragePct < 70 && (
                    <p className="mt-2 text-[11px]">Only {coverage.coveragePct}% of peers have EBITDA margin data.</p>
                  )}
                  {activeUniverse.region === "custom" && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs">Edit tickers (comma-separated)</Label>
                      <Input
                        value={customEditTickers}
                        onChange={(event) => setCustomEditTickers(event.target.value)}
                        placeholder={activeUniverse.tickers.map((ticker) => ticker.ticker).join(", ")}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const tickers = customEditTickers.split(",").map((t) => t.trim()).filter(Boolean);
                          const updatedUniverse = {
                            ...activeUniverse,
                            tickers: tickers.map((ticker) => ({
                              ticker,
                              name: ticker,
                              currency: "USD",
                              exchange: "Custom",
                              country: "Custom",
                            })),
                          };
                          setActiveUniverse(updatedUniverse);
                          setCustomUniverses(
                            customUniverses.map((universe) =>
                              universe.universe_id === updatedUniverse.universe_id ? updatedUniverse : universe
                            )
                          );
                          setPeers(mapUniverseToPeers(updatedUniverse));
                        }}
                      >
                        Update tickers
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {screener.source === "import" && (
                <div className="space-y-2">
                  <Label>Import CSV/JSON (tickers + metrics)</Label>
                  <Input
                    value={screener.imported}
                    onChange={(event) => setScreener({ ...screener, imported: event.target.value })}
                    placeholder='[{"ticker":"ABC","revenue":1200,...}]'
                  />
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Revenue size band</Label>
                  <Slider
                    value={screener.revenueRange}
                    onValueChange={(value) => setScreener({ ...screener, revenueRange: value })}
                    min={50}
                    max={5000}
                    step={50}
                  />
                  <p className="text-xs">{screener.revenueRange[0]} – {screener.revenueRange[1]}</p>
                </div>
                <div className="space-y-2">
                  <Label>Revenue growth (1Y/3Y)</Label>
                  <Slider
                    value={screener.growthRange}
                    onValueChange={(value) => setScreener({ ...screener, growthRange: value })}
                    min={-0.2}
                    max={0.6}
                    step={0.01}
                  />
                  <p className="text-xs">{(screener.growthRange[0] * 100).toFixed(0)}% – {(screener.growthRange[1] * 100).toFixed(0)}%</p>
                </div>
                <div className="space-y-2">
                  <Label>EBITDA / EBIT margin</Label>
                  <Slider
                    value={screener.marginRange}
                    onValueChange={(value) => setScreener({ ...screener, marginRange: value })}
                    min={0}
                    max={0.8}
                    step={0.01}
                  />
                  <p className="text-xs">{(screener.marginRange[0] * 100).toFixed(0)}% – {(screener.marginRange[1] * 100).toFixed(0)}%</p>
                </div>
                <div className="space-y-2">
                  <Label>Market cap band</Label>
                  <Slider
                    value={screener.marketCapRange}
                    onValueChange={(value) => setScreener({ ...screener, marketCapRange: value })}
                    min={50}
                    max={20000}
                    step={100}
                  />
                  <p className="text-xs">{screener.marketCapRange[0]} – {screener.marketCapRange[1]}</p>
                </div>
                <div className="space-y-2">
                  <Label>Similarity weights</Label>
                  <div className="grid gap-2">
                    {(["size", "growth", "margin"] as const).map((key) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="w-16 capitalize">{key}</span>
                        <Input
                          value={screener.weights[key]}
                          onChange={(event) =>
                            setScreener({
                              ...screener,
                              weights: { ...screener.weights, [key]: Number(event.target.value) },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-0 text-xs">Similarity formula</Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      distance = √(w_size·z_size² + w_growth·z_growth² + w_margin·z_margin²)
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({ ...screener, selected: filteredPeers.slice(0, 10).map((peer) => peer.ticker) })}
                >
                  Nearest 10
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({
                    ...screener,
                    selected: filteredPeers
                      .filter((peer) => (peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? 0) > 0.25)
                      .map((peer) => peer.ticker),
                  })}
                >
                  Growth peers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({
                    ...screener,
                    selected: filteredPeers
                      .filter((peer) => (peer.ebitdaMargin ?? peer.ebitMargin ?? 0) > 0.35)
                      .map((peer) => peer.ticker),
                  })}
                >
                  Margin peers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({
                    ...screener,
                    selected: filteredPeers
                      .slice()
                      .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
                      .slice(0, 15)
                      .map((peer) => peer.ticker),
                  })}
                >
                  Top 15 liquid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({
                    ...screener,
                    selected: filteredPeers
                      .filter((peer) => (peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? 0) > 0.2)
                      .map((peer) => peer.ticker),
                  })}
                >
                  Growth tilt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScreener({
                    ...screener,
                    selected: filteredPeers
                      .filter((peer) => (peer.ebitdaMargin ?? peer.ebitMargin ?? 0) > 0.3)
                      .map((peer) => peer.ticker),
                  })}
                >
                  Profitability tilt
                </Button>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span>Coverage meter</span>
                  <span>{coverage.count} peers • dispersion {coverage.dispersion.toFixed(2)}</span>
                </div>
                {coverage.count < 5 && (
                  <Badge variant="destructive" className="mt-2">Low coverage: fewer than 5 peers</Badge>
                )}
                {coverage.dispersion > 1.2 && (
                  <Badge variant="secondary" className="mt-2">Peers are dispersed — review filters</Badge>
                )}
              </div>

              <div className="overflow-auto rounded-lg border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Peer</th>
                      <th className="px-3 py-2 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-xs"
                          onClick={() => setScreener({ ...screener, sortKey: "revenue", sortDir: screener.sortDir === \"asc\" ? \"desc\" : \"asc\" })}
                        >
                          Revenue
                        </Button>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-xs"
                          onClick={() => setScreener({ ...screener, sortKey: "growth", sortDir: screener.sortDir === \"asc\" ? \"desc\" : \"asc\" })}
                        >
                          Growth
                        </Button>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-xs"
                          onClick={() => setScreener({ ...screener, sortKey: "margin", sortDir: screener.sortDir === \"asc\" ? \"desc\" : \"asc\" })}
                        >
                          Margin
                        </Button>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-xs"
                          onClick={() => setScreener({ ...screener, sortKey: "similarity", sortDir: screener.sortDir === \"asc\" ? \"desc\" : \"asc\" })}
                        >
                          Similarity
                        </Button>
                      </th>
                      <th className="px-3 py-2 text-left">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPeers.map((peer) => (
                      <tr key={peer.ticker} className="border-t border-border/50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{peer.ticker}</div>
                          <div className="text-[10px] text-muted-foreground">{peer.name}</div>
                        </td>
                        <td className="px-3 py-2">
                          {peer.revenue !== undefined ? peer.revenue.toFixed(0) : (
                            <span className="text-muted-foreground">N/A (missing revenue)</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {peer.revenueGrowth3y !== undefined || peer.revenueGrowth1y !== undefined ? (
                            `${((peer.revenueGrowth3y ?? peer.revenueGrowth1y ?? 0) * 100).toFixed(1)}%`
                          ) : (
                            <span className="text-muted-foreground">N/A (missing growth)</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {peer.ebitdaMargin !== undefined || peer.ebitMargin !== undefined ? (
                            `${((peer.ebitdaMargin ?? peer.ebitMargin ?? 0) * 100).toFixed(1)}%`
                          ) : (
                            <span className="text-muted-foreground">N/A (missing margin)</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {scoresByTicker[peer.ticker]?.toFixed(2) ?? "N/A"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Weighted z-score distance. Missing data defaults to 0. <Link to="/data" className="underline">Edit mapping</Link>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="px-3 py-2">
                          <Switch
                            checked={screener.selected.includes(peer.ticker)}
                            onCheckedChange={(value) =>
                              setScreener({
                                ...screener,
                                selected: value
                                  ? [...screener.selected, peer.ticker]
                                  : screener.selected.filter((ticker) => ticker !== peer.ticker),
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Selected peer set</h3>
                  <p>{screener.selected.join(", ") || "No peers selected"}</p>
                  <div className="mt-2 space-y-2">
                    <Label className="text-xs">Custom universe name</Label>
                    <Input value={customName} onChange={(event) => setCustomName(event.target.value)} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const universe: UniverseDetail = {
                            universe_id: `custom-${Date.now()}`,
                            region: "custom",
                            sector: "custom",
                            as_of_date: new Date().toISOString().slice(0, 10),
                            notes: customName,
                            tickers: selectedPeers.map((peer) => ({
                              ticker: peer.ticker,
                              name: peer.name,
                              currency: peer.currency ?? "USD",
                              exchange: "Custom",
                              country: peer.region ?? "Custom",
                            })),
                          };
                          setCustomUniverses([...customUniverses, universe]);
                        }}
                      >
                        Save custom universe
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!activeUniverse) return;
                          const clone: UniverseDetail = {
                            ...activeUniverse,
                            universe_id: `custom-${Date.now()}`,
                            notes: `${activeUniverse.universe_id} (clone)`,
                          };
                          setCustomUniverses([...customUniverses, clone]);
                        }}
                      >
                        Clone active universe
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const json = JSON.stringify(customUniverses, null, 2);
                          const blob = new Blob([json], { type: "application/json" });
                          const link = document.createElement("a");
                          link.href = URL.createObjectURL(blob);
                          link.download = "custom-universes.json";
                          link.click();
                        }}
                      >
                        Export universes
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Import universes JSON</Label>
                      <Input
                        value={customUniverseImport}
                        onChange={(event) => setCustomUniverseImport(event.target.value)}
                        placeholder="Paste universe JSON to merge"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(customUniverseImport) as UniverseDetail[];
                            if (Array.isArray(parsed)) {
                              setCustomUniverses([...customUniverses, ...parsed]);
                            }
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Import universes
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Comps valuation output</h3>
                  <p>EV/Revenue: {compsSummary.evToRevenue.toFixed(1)}x</p>
                  <p>EV/EBITDA: {compsSummary.evToEbitda.toFixed(1)}x</p>
                  <p className="text-[11px]">Auto-updated from screened peer set.</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-0 text-xs">Formula</Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <p>Median of selected peers (EV/Revenue, EV/EBITDA).</p>
                      <p className="mt-2">Sources: Enterprise Value, Revenue, EBITDA.</p>
                      <p>Missing inputs? <Link to="/data" className="underline">Edit mapping</Link></p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real Options & Project Valuation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ul className="list-disc space-y-1 pl-5">
                <li>Binomial lattice to expand/abandon with editable volatility and decision nodes.</li>
                <li>Scenario-weighted NPV with decision tree editor.</li>
              </ul>
              <div className="rounded-lg border border-border/60 p-3">
                <h3 className="text-sm font-medium text-foreground">Option Summary</h3>
                <p>Option value uplift: +$310M vs base NPV.</p>
              </div>
              {exportButtons}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sotp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SOTP / Conglomerate Valuation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Build business segments with revenue, EBITDA, or EBIT multiples — or attach a segment DCF. Apply
                corporate costs, net debt, minority interest, and pension deficit adjustments.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { name: "Core SaaS", multiple: "EV/ARR 7.2x", value: "$2.8B" },
                  { name: "Payments", multiple: "EV/EBITDA 10.5x", value: "$1.1B" },
                  { name: "Hardware", multiple: "DCF", value: "$620M" },
                ].map((segment) => (
                  <div key={segment.name} className="rounded-lg border border-border/60 p-3">
                    <h3 className="text-sm font-medium text-foreground">{segment.name}</h3>
                    <p>{segment.multiple}</p>
                    <p className="text-foreground font-medium">{segment.value}</p>
                  </div>
                ))}
              </div>
              {exportButtons}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="implied" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implied Valuation Cross-Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Implied WACC</h3>
                  <p>Market price implies WACC of 9.6%.</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Implied Terminal Growth</h3>
                  <p>Market price implies terminal growth of 3.1%.</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Implied Exit Multiple</h3>
                  <p>Market price implies 9.8x EBITDA exit multiple.</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <h3 className="text-sm font-medium text-foreground">Value Bridge</h3>
                  <ul className="mt-2 list-disc pl-5">
                    <li>Base DCF: $4.4B</li>
                    <li>Macro premium: +$320M</li>
                    <li>Execution risk: -$210M</li>
                  </ul>
                </div>
              </div>
              {exportButtons}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const std = (values: number[]) => {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};
