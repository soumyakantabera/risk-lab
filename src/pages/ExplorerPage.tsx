import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadProjectState, saveProjectState } from "@/lib/valuation/storage";
import { useValuation } from "@/context/ValuationContext";

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

interface ExplorerPeer {
  ticker: string;
  name: string;
  region: string;
  sector: string;
  currency: string;
  subsector?: string;
  style?: string;
  marketCapBucket?: string;
  metrics: MetricsSnapshotRecord | null;
}

const axisOptions = [
  { key: "revenue_ttm", label: "Revenue (TTM/FY)" },
  { key: "revenue_cagr_3y", label: "Revenue CAGR (3Y)" },
  { key: "ebitda_margin_ttm", label: "EBITDA Margin" },
  { key: "gross_margin", label: "Gross Margin" },
  { key: "net_debt_ebitda", label: "Net Debt/EBITDA" },
  { key: "ev_ebitda", label: "EV/EBITDA" },
  { key: "ev_revenue", label: "EV/Revenue" },
  { key: "pe", label: "P/E" },
];

const defaultExplorerState = {
  axisX: "revenue_ttm",
  axisY: "revenue_cagr_3y",
  bubble: "revenue_ttm",
  color: "ebitda_margin_ttm",
  logX: true,
  strictFiltering: false,
  search: "",
  region: "us",
  sector: "saas_software",
  universeId: "",
  removeOutliers: false,
  selectionMode: "lasso" as "lasso" | "select",
  weights: { x: 0.5, y: 0.5 },
};

export default function ExplorerPage() {
  const { projectId } = useValuation();
  const [explorerState, setExplorerState] = useState(defaultExplorerState);
  const [universes, setUniverses] = useState<UniverseMeta[]>([]);
  const [activeUniverse, setActiveUniverse] = useState<UniverseDetail | null>(null);
  const [metricsSnapshot, setMetricsSnapshot] = useState<Record<string, MetricsSnapshotRecord>>({});
  const [peers, setPeers] = useState<ExplorerPeer[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const [targetOverlay, setTargetOverlay] = useState(false);
  const [selectedAction, setSelectedAction] = useState("replace");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  useEffect(() => {
    setExplorerState(loadProjectState(projectId, "explorer-view:default", defaultExplorerState));
  }, [projectId]);

  useEffect(() => {
    setSearchInput(explorerState.search);
  }, [explorerState.search]);

  useEffect(() => {
    if (!explorerState.universeId) return;
    saveProjectState(projectId, `explorer-view:${explorerState.universeId}`, explorerState);
  }, [projectId, explorerState]);

  useEffect(() => {
    setExplorerState((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

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
    if (!explorerState.universeId && universes.length > 0) {
      setExplorerState((prev) => ({ ...prev, universeId: universes[0].universe_id }));
    }
  }, [explorerState.universeId, universes]);

  useEffect(() => {
    if (!explorerState.universeId) return;
    const savedView = loadProjectState(
      projectId,
      `explorer-view:${explorerState.universeId}`,
      null
    );
    if (savedView) {
      setExplorerState((prev) => ({ ...prev, ...savedView }));
    }
  }, [projectId, explorerState.universeId]);

  useEffect(() => {
    if (availableUniverses.length > 0 && !availableUniverses.find((u) => u.universe_id === explorerState.universeId)) {
      setExplorerState((prev) => ({ ...prev, universeId: availableUniverses[0].universe_id }));
    }
  }, [availableUniverses, explorerState.universeId]);

  const availableUniverses = useMemo(
    () =>
      universes.filter(
        (universe) =>
          (explorerState.region ? universe.region === explorerState.region : true) &&
          (explorerState.sector ? universe.sector === explorerState.sector : true)
      ),
    [universes, explorerState.region, explorerState.sector]
  );

  useEffect(() => {
    if (!explorerState.universeId) return;
    const savedSelection = loadProjectState<string[]>(
      projectId,
      `explorer-selection:${explorerState.universeId}`,
      []
    );
    setSelection(savedSelection);
  }, [projectId, explorerState.universeId]);

  useEffect(() => {
    if (!explorerState.universeId) return;
    saveProjectState(projectId, `explorer-selection:${explorerState.universeId}`, selection);
  }, [projectId, explorerState.universeId, selection]);

  useEffect(() => {
    if (!explorerState.universeId) return;
    const meta = universes.find((universe) => universe.universe_id === explorerState.universeId);
    if (!meta) return;
    fetch(meta.path)
      .then((response) => response.json())
      .then((data: UniverseDetail) => {
        setActiveUniverse(data);
        const mapped = data.tickers.map((ticker) => ({
          ticker: ticker.ticker,
          name: ticker.name,
          region: data.region,
          sector: data.sector,
          currency: ticker.currency,
          subsector: ticker.subsector,
          style: ticker.style,
          marketCapBucket: ticker.market_cap_bucket,
          metrics: metricsSnapshot[ticker.ticker] ?? null,
        }));
        setPeers(mapped);
        setSelection([]);
      });
  }, [explorerState.universeId, metricsSnapshot, universes]);

  const target = loadProjectState<{ ticker: string; name: string; metrics: MetricsSnapshotRecord } | null>(
    projectId,
    "target-company",
    null
  );

  const filteredPeers = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    const filtered = peers.filter((peer) => {
      const nameMatch = peer.name.toLowerCase().includes(search) || peer.ticker.toLowerCase().includes(search);
      if (!nameMatch) return false;
      if (explorerState.strictFiltering && !peer.metrics) return false;
      if (
        explorerState.strictFiltering &&
        (valueForAxis(peer, explorerState.axisX) === null || valueForAxis(peer, explorerState.axisY) === null)
      ) {
        return false;
      }
      return true;
    });
    return explorerState.removeOutliers
      ? removeOutliers(filtered, explorerState.axisX, explorerState.axisY)
      : filtered;
  }, [peers, explorerState.axisX, explorerState.axisY, explorerState.removeOutliers, debouncedSearch, explorerState.strictFiltering]);

  const selectedPeers = filteredPeers.filter((peer) => selection.includes(peer.ticker));

  const axisXValues = filteredPeers.map((peer) => valueForAxis(peer, explorerState.axisX));
  const axisYValues = filteredPeers.map((peer) => valueForAxis(peer, explorerState.axisY));
  const bubbleValues = filteredPeers.map((peer) => valueForAxis(peer, explorerState.bubble));
  const colorValues = filteredPeers.map((peer) => valueForAxis(peer, explorerState.color));
  const currencySummary = useMemo(() => {
    const currencies = Array.from(new Set(filteredPeers.map((peer) => peer.currency)));
    return currencies.length > 3 ? \"Mixed\" : currencies.join(\", \") || \"N/A\";
  }, [filteredPeers]);

  const plotData = [
    {
      x: axisXValues,
      y: axisYValues,
      text: filteredPeers.map((peer) => {
        const asOf = peer.metrics?.as_of_date ?? "N/A";
        return `${peer.ticker} • ${peer.name}<br>As of: ${asOf}`;
      }),
      customdata: filteredPeers.map((peer) => peer.ticker),
      mode: "markers",
      type: "scatter",
      marker: {
        size: bubbleValues.map((value) => (value ? Math.max(6, Math.min(24, value / 2000)) : 8)),
        color: colorValues,
        colorscale: "Viridis",
        showscale: true,
      },
      hovertemplate: "%{text}<br>X: %{x}<br>Y: %{y}<extra></extra>",
    },
  ];

  if (targetOverlay && target?.metrics) {
    plotData.push({
      x: [target.metrics[explorerState.axisX as keyof MetricsSnapshotRecord] ?? null],
      y: [target.metrics[explorerState.axisY as keyof MetricsSnapshotRecord] ?? null],
      text: [`Target: ${target.ticker}`],
      mode: "markers",
      type: "scatter",
      marker: { size: 14, color: "#f97316", symbol: "diamond" },
      hovertemplate: "Target: %{text}<extra></extra>",
    });
  }

  const stats = useMemo(() => {
    return {
      universe: statsForPeers(filteredPeers, explorerState.axisX, explorerState.axisY),
      selected: statsForPeers(selectedPeers, explorerState.axisX, explorerState.axisY),
      coverage: coverageForPeers(filteredPeers, explorerState.axisX, explorerState.axisY),
    };
  }, [filteredPeers, selectedPeers, explorerState.axisX, explorerState.axisY]);

  const applySelection = () => {
    if (selectedAction === "replace") {
      setSelection(pendingSelection);
    } else if (selectedAction === "add") {
      setSelection(Array.from(new Set([...selection, ...pendingSelection])));
    } else if (selectedAction === "remove") {
      setSelection(selection.filter((ticker) => !pendingSelection.includes(ticker)));
    }
  };

  const handleUseInComps = () => {
    const current = loadProjectState(projectId, "comps-screener", { selected: [] as string[] });
    const updated = { ...current, selected: selection };
    saveProjectState(projectId, "comps-screener", updated);
  };

  const exportSelection = (type: "json" | "csv") => {
    const rows = selectedPeers.map((peer) => ({
      ticker: peer.ticker,
      name: peer.name,
      revenue: peer.metrics?.revenue_ttm ?? null,
      growth: peer.metrics?.revenue_cagr_3y ?? null,
      margin: peer.metrics?.ebitda_margin_ttm ?? null,
    }));
    if (type === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      downloadBlob(blob, "selected-peers.json");
    } else {
      const csv = ["ticker,name,revenue,growth,margin", ...rows.map((row) => `${row.ticker},${row.name},${row.revenue ?? ""},${row.growth ?? ""},${row.margin ?? ""}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      downloadBlob(blob, "selected-peers.csv");
    }
  };

  const selectionId = useMemo(() => hashSelection(selection, explorerState), [selection, explorerState]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Peer Universe Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Visual screener for offline peer universes with lasso selection and Comps hand-off.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Universe controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={explorerState.region}
                onValueChange={(value) => setExplorerState({ ...explorerState, region: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(universes.map((u) => u.region))).map((region) => (
                    <SelectItem key={region} value={region}>
                      {region.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select
                value={explorerState.sector}
                onValueChange={(value) => setExplorerState({ ...explorerState, sector: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(universes.map((u) => u.sector))).map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Universe</Label>
              <Select
                value={explorerState.universeId}
                onValueChange={(value) => setExplorerState({ ...explorerState, universeId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableUniverses.map((universe) => (
                    <SelectItem key={universe.universe_id} value={universe.universe_id}>
                      {universe.universe_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeUniverse && (
                <div className="rounded border border-border/60 p-2 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{activeUniverse.notes}</p>
                  <p>As of {activeUniverse.as_of_date}</p>
                  <p>Peers: {activeUniverse.tickers.length}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Similarity weights</Label>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-10">X</span>
                  <Input
                    value={explorerState.weights.x}
                    onChange={(event) =>
                      setExplorerState({
                        ...explorerState,
                        weights: { ...explorerState.weights, x: Number(event.target.value) },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-10">Y</span>
                  <Input
                    value={explorerState.weights.y}
                    onChange={(event) =>
                      setExplorerState({
                        ...explorerState,
                        weights: { ...explorerState.weights, y: Number(event.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Target overlay</span>
              <Switch checked={targetOverlay} onCheckedChange={setTargetOverlay} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Strict filtering</span>
              <Switch
                checked={explorerState.strictFiltering}
                onCheckedChange={(value) => setExplorerState({ ...explorerState, strictFiltering: value })}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Remove outliers</span>
              <Switch
                checked={explorerState.removeOutliers}
                onCheckedChange={(value) => setExplorerState({ ...explorerState, removeOutliers: value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Axis X</Label>
              <Select
                value={explorerState.axisX}
                onValueChange={(value) => setExplorerState({ ...explorerState, axisX: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between text-xs">
                <span>Log scale</span>
                <Switch
                  checked={explorerState.logX}
                  onCheckedChange={(value) => setExplorerState({ ...explorerState, logX: value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Axis Y</Label>
              <Select
                value={explorerState.axisY}
                onValueChange={(value) => setExplorerState({ ...explorerState, axisY: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bubble size</Label>
              <Select
                value={explorerState.bubble}
                onValueChange={(value) => setExplorerState({ ...explorerState, bubble: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={explorerState.color}
                onValueChange={(value) => setExplorerState({ ...explorerState, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Selection mode</Label>
              <Select
                value={explorerState.selectionMode}
                onValueChange={(value) => setExplorerState({ ...explorerState, selectionMode: value as "lasso" | "select" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lasso">Lasso select</SelectItem>
                  <SelectItem value="select">Rectangle select</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader>
            <CardTitle>Universe scatterplot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <Badge variant="secondary">Selected basket: {selection.length}</Badge>
              <Badge variant="outline">Selection ID: {selectionId}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Region: {activeUniverse?.region ?? "N/A"}</Badge>
              <Badge variant="outline">Sector: {activeUniverse?.sector ?? "N/A"}</Badge>
              <Badge variant="outline">
                {axisLabel(explorerState.axisX)} band: {rangeLabel(axisXValues)}
              </Badge>
              <Badge variant="outline">
                {axisLabel(explorerState.axisY)} band: {rangeLabel(axisYValues)}
              </Badge>
              <Badge variant="outline">Currency: {currencySummary}</Badge>
              <Badge variant="outline">Strict: {explorerState.strictFiltering ? "On" : "Off"}</Badge>
              <Badge variant="outline">Outliers: {explorerState.removeOutliers ? "Removed" : "Included"}</Badge>
            </div>
            <Plot
              data={plotData as never}
              layout={{
                autosize: true,
                height: 420,
                margin: { l: 40, r: 20, t: 20, b: 40 },
                xaxis: { title: axisLabel(explorerState.axisX), type: explorerState.logX ? "log" : "linear" },
                yaxis: { title: axisLabel(explorerState.axisY) },
                dragmode: explorerState.selectionMode,
              }}
              onSelected={(event) => {
                if (!event?.points) return;
                setPendingSelection(event.points.map((point) => String(point.customdata)));
              }}
              onClick={(event) => {
                const ticker = event?.points?.[0]?.customdata;
                if (!ticker) return;
                setSelection((prev) =>
                  prev.includes(ticker) ? prev.filter((item) => item !== ticker) : [...prev, ticker]
                );
              }}
              style={{ width: "100%" }}
              config={{ responsive: true }}
            />
            <p className="text-[11px] text-muted-foreground">
              N/A indicates missing metrics in the offline snapshot. Enable strict filtering to exclude missing data.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">Replace selection</SelectItem>
                  <SelectItem value="add">Add to selection</SelectItem>
                  <SelectItem value="remove">Remove selection</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={applySelection}>Apply</Button>
              <Button variant="outline" size="sm" onClick={() => setSelection([])}>Clear</Button>
              <Button variant="outline" size="sm" onClick={() => exportSelection("json")}>Export JSON</Button>
              <Button variant="outline" size="sm" onClick={() => exportSelection("csv")}>Export CSV</Button>
              <Button variant="default" size="sm" onClick={handleUseInComps}>Use selected peers in Comps</Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Button variant="outline" size="sm" onClick={() => setSelection(nearestPeers(filteredPeers, target, explorerState, 10))}>
                Nearest 10 to target
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelection(quartilePeers(filteredPeers, "revenue_cagr_3y", 0.75))}>
                Growth peers
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelection(quartilePeers(filteredPeers, "ebitda_margin_ttm", 0.75))}>
                Profitability peers
              </Button>
            </div>
            <Tabs defaultValue="distribution">
              <TabsList>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="correlation">Correlation</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
              <TabsContent value="distribution" className="text-xs text-muted-foreground">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MiniHistogram title="X distribution" values={axisXValues} />
                  <MiniHistogram title="Y distribution" values={axisYValues} />
                </div>
              </TabsContent>
              <TabsContent value="correlation" className="text-xs text-muted-foreground">
                <CorrelationMatrix peers={selectedPeers.length ? selectedPeers : filteredPeers} />
              </TabsContent>
              <TabsContent value="table" className="text-xs text-muted-foreground">
                <div className="overflow-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-1 text-left">Ticker</th>
                        <th className="px-2 py-1 text-left">Name</th>
                        <th className="px-2 py-1 text-left">Revenue</th>
                        <th className="px-2 py-1 text-left">Growth</th>
                        <th className="px-2 py-1 text-left">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPeers.map((peer) => (
                        <tr key={peer.ticker} className="border-t border-border/50">
                          <td className="px-2 py-1">{peer.ticker}</td>
                          <td className="px-2 py-1">{peer.name}</td>
                          <td className="px-2 py-1">{peer.metrics?.revenue_ttm ?? "N/A (missing snapshot)"}</td>
                          <td className="px-2 py-1">{peer.metrics?.revenue_cagr_3y ?? "N/A (missing snapshot)"}</td>
                          <td className="px-2 py-1">{peer.metrics?.ebitda_margin_ttm ?? "N/A (missing snapshot)"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peer stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Universe</p>
              <StatsBlock stats={stats.universe} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Selected</p>
              <StatsBlock stats={stats.selected} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Coverage</p>
              <p>{axisLabel(explorerState.axisX)} coverage: {stats.coverage.coverageX}%</p>
              <p>{axisLabel(explorerState.axisY)} coverage: {stats.coverage.coverageY}%</p>
              <p>Universe tightness: {stats.universe.dispersion.toFixed(2)}</p>
            </div>
            {targetOverlay && (
              <div className="rounded-lg border border-border/60 p-3">
                <p className="font-semibold text-foreground">Target vs selected median</p>
                {target?.metrics ? (
                  <div className="grid gap-2 text-[11px]">
                    <div className="flex justify-between">
                      <span>{target.ticker} {axisLabel(explorerState.axisX)}</span>
                      <span>{target.metrics[explorerState.axisX as keyof MetricsSnapshotRecord] ?? "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Median {axisLabel(explorerState.axisX)}</span>
                      <span>{stats.selected.medianX.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p>No target company selected on Data page.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const valueForAxis = (peer: ExplorerPeer, axis: string) => {
  const metrics = peer.metrics;
  if (!metrics) return null;
  return metrics[axis as keyof MetricsSnapshotRecord] ?? null;
};

const axisLabel = (axis: string) => axisOptions.find((option) => option.key === axis)?.label ?? axis;

const rangeLabel = (values: Array<number | null>) => {
  const clean = values.filter((v): v is number => v !== null);
  if (clean.length === 0) return "N/A";
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  return `${min.toFixed(1)}–${max.toFixed(1)}`;
};

const statsForPeers = (peers: ExplorerPeer[], axisX: string, axisY: string) => {
  const xValues = peers.map((peer) => valueForAxis(peer, axisX)).filter((v): v is number => v !== null);
  const yValues = peers.map((peer) => valueForAxis(peer, axisY)).filter((v): v is number => v !== null);
  return {
    meanX: average(xValues),
    meanY: average(yValues),
    medianX: median(xValues),
    medianY: median(yValues),
    minX: Math.min(...xValues, 0),
    maxX: Math.max(...xValues, 0),
    minY: Math.min(...yValues, 0),
    maxY: Math.max(...yValues, 0),
    dispersion: std(xValues.concat(yValues)),
  };
};

const coverageForPeers = (peers: ExplorerPeer[], axisX: string, axisY: string) => {
  const coverageXCount = peers.filter((peer) => valueForAxis(peer, axisX) !== null).length;
  const coverageYCount = peers.filter((peer) => valueForAxis(peer, axisY) !== null).length;
  const coverageX = peers.length === 0 ? 0 : Math.round((coverageXCount / peers.length) * 100);
  const coverageY = peers.length === 0 ? 0 : Math.round((coverageYCount / peers.length) * 100);
  return { coverageX, coverageY };
};

const average = (values: number[]) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);
const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};
const std = (values: number[]) => {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
};

const removeOutliers = (peers: ExplorerPeer[], axisX: string, axisY: string) => {
  const valuesX = peers.map((peer) => valueForAxis(peer, axisX)).filter((v): v is number => v !== null);
  const valuesY = peers.map((peer) => valueForAxis(peer, axisY)).filter((v): v is number => v !== null);
  const [xLow, xHigh] = iqrBounds(valuesX);
  const [yLow, yHigh] = iqrBounds(valuesY);
  return peers.filter((peer) => {
    const x = valueForAxis(peer, axisX);
    const y = valueForAxis(peer, axisY);
    if (x === null || y === null) return false;
    return x >= xLow && x <= xHigh && y >= yLow && y <= yHigh;
  });
};

const iqrBounds = (values: number[]) => {
  if (values.length === 0) return [-Infinity, Infinity];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return [q1 - 1.5 * iqr, q3 + 1.5 * iqr];
};

const nearestPeers = (peers: ExplorerPeer[], target: { metrics: MetricsSnapshotRecord } | null, state: typeof defaultExplorerState, n: number) => {
  if (!target?.metrics) return [];
  const valuesX = peers.map((peer) => valueForAxis(peer, state.axisX)).filter((v): v is number => v !== null);
  const valuesY = peers.map((peer) => valueForAxis(peer, state.axisY)).filter((v): v is number => v !== null);
  const meanX = average(valuesX);
  const meanY = average(valuesY);
  const stdX = std(valuesX) || 1;
  const stdY = std(valuesY) || 1;
  const targetX = target.metrics[state.axisX as keyof MetricsSnapshotRecord] ?? meanX;
  const targetY = target.metrics[state.axisY as keyof MetricsSnapshotRecord] ?? meanY;
  const targetZx = (targetX - meanX) / stdX;
  const targetZy = (targetY - meanY) / stdY;
  return peers
    .map((peer) => {
      const x = valueForAxis(peer, state.axisX) ?? meanX;
      const y = valueForAxis(peer, state.axisY) ?? meanY;
      const zx = (x - meanX) / stdX;
      const zy = (y - meanY) / stdY;
      const distance = Math.sqrt(state.weights.x * (zx - targetZx) ** 2 + state.weights.y * (zy - targetZy) ** 2);
      return { ticker: peer.ticker, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
    .map((item) => item.ticker);
};

const quartilePeers = (peers: ExplorerPeer[], axis: string, quantile: number) => {
  const values = peers.map((peer) => valueForAxis(peer, axis)).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const threshold = values[Math.floor(values.length * quantile)] ?? 0;
  return peers.filter((peer) => (valueForAxis(peer, axis) ?? 0) >= threshold).map((peer) => peer.ticker);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const hashSelection = (tickers: string[], state: typeof defaultExplorerState) => {
  const payload = `${tickers.sort().join("|")}:${state.axisX}:${state.axisY}:${state.bubble}:${state.color}:${state.removeOutliers}:${state.strictFiltering}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `sel-${Math.abs(hash)}`;
};

const MiniHistogram = ({ title, values }: { title: string; values: Array<number | null> }) => {
  const clean = values.filter((v): v is number => v !== null);
  if (clean.length === 0) return <div className="rounded border border-border/60 p-3">No data for {title}</div>;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const bins = 6;
  const step = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, () => 0);
  clean.forEach((value) => {
    const idx = Math.min(bins - 1, Math.floor((value - min) / step));
    counts[idx] += 1;
  });
  const maxCount = Math.max(...counts, 1);
  return (
    <div className="rounded border border-border/60 p-3">
      <p className="font-semibold text-foreground">{title}</p>
      <div className="mt-2 space-y-1">
        {counts.map((count, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="h-2 rounded bg-primary" style={{ width: `${(count / maxCount) * 100}%` }} />
            <span className="text-[10px]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CorrelationMatrix = ({ peers }: { peers: ExplorerPeer[] }) => {
  const metrics = ["revenue_ttm", "revenue_cagr_3y", "ebitda_margin_ttm"];
  const values = metrics.map((metric) =>
    peers.map((peer) => valueForAxis(peer, metric)).filter((v): v is number => v !== null)
  );
  const correlation = metrics.map((_, i) =>
    metrics.map((__, j) =>
      values[i].length > 0 && values[j].length > 0 ? correlationCoeff(values[i], values[j]) : 0
    )
  );
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-2 text-xs">
        <span></span>
        {metrics.map((metric) => (
          <span key={metric}>{metric}</span>
        ))}
        {metrics.map((row, i) => (
          <div key={row} className="contents">
            <span>{row}</span>
            {metrics.map((col, j) => (
              <span key={col} className="rounded bg-muted/50 px-2 py-1 text-center">
                {correlation[i][j].toFixed(2)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const correlationCoeff = (xs: number[], ys: number[]) => {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  const meanX = average(xs.slice(0, n));
  const meanY = average(ys.slice(0, n));
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
};

const StatsBlock = ({ stats }: { stats: ReturnType<typeof statsForPeers> }) => (
  <div className="rounded border border-border/60 p-3">
    <p>Median X: {stats.medianX.toFixed(2)}</p>
    <p>Median Y: {stats.medianY.toFixed(2)}</p>
    <p>Min/Max X: {stats.minX.toFixed(2)} / {stats.maxX.toFixed(2)}</p>
    <p>Min/Max Y: {stats.minY.toFixed(2)} / {stats.maxY.toFixed(2)}</p>
  </div>
);

const useDebouncedValue = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
};
