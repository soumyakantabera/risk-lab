import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { suggestMapping } from "@/lib/valuation/mapping";
import { useValuation } from "@/context/ValuationContext";
import { loadProjectState, saveProjectState } from "@/lib/valuation/storage";
import { DataStatusBanner } from "@/components/data/DataStatusBanner";
import { DiagnosticsDrawer } from "@/components/data/DiagnosticsDrawer";
import { useDataStatus } from "@/data/DataContext";
import {
  getAllowDirect,
  getDiagnosticsEnabled,
  getFinancials,
  getProxyBaseUrl,
  importFinancials,
  loadMetricsSnapshot,
  setAllowDirect,
  setDiagnosticsEnabled,
  setProxyBaseUrl,
} from "@/data/dataService";
import type { DataError } from "@/data/errors";
import type { DataMode, MetricsSnapshot } from "@/data/types";

const sampleDatasets = [
  {
    name: "Sample AAPL Statements",
    description: "Offline Apple statements (income + balance).",
    path: "/data/sample/aapl.json",
    ticker: "AAPL",
  },
  {
    name: "Sample MSFT Statements",
    description: "Offline Microsoft statements (income + balance).",
    path: "/data/sample/msft.json",
    ticker: "MSFT",
  },
  {
    name: "Sample TSLA Statements",
    description: "Offline Tesla statements (income + balance).",
    path: "/data/sample/tsla.json",
    ticker: "TSLA",
  },
];

const DATA_MODES: { value: DataMode; label: string; description: string }[] = [
  { value: "offline", label: "Offline (default)", description: "Use bundled sample JSON shipped with the app." },
  { value: "proxy", label: "Live via proxy", description: "Fetch Yahoo data through your proxy." },
  { value: "direct", label: "Direct (dev)", description: "Direct Yahoo calls (blocked in prod unless toggled)." },
  { value: "import", label: "Imported", description: "Use your uploaded CSV/JSON." },
];

export default function DataHubPage() {
  const { projectId, setProjectId } = useValuation();
  const { setDataStatus, dataStatus } = useDataStatus();
  const [rawInput, setRawInput] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [companyKey, setCompanyKey] = useState("TechCo");
  const [targetTicker, setTargetTicker] = useState("");
  const [metricsSnapshot, setMetricsSnapshot] = useState<Record<string, MetricsSnapshot>>({});
  const [ticker, setTicker] = useState("AAPL");
  const [mode, setMode] = useState<DataMode>("offline");
  const [currency, setCurrency] = useState("USD");
  const [statementType, setStatementType] = useState<"incomeStatement" | "balanceSheet">("incomeStatement");
  const [period, setPeriod] = useState<"yearly" | "quarterly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<DataError | null>(null);
  const [proxyBase, setProxyBase] = useState(getProxyBaseUrl() ?? "");
  const [allowDirect, setAllowDirectState] = useState(getAllowDirect());
  const [diagnosticsEnabled, setDiagnosticsEnabledState] = useState(getDiagnosticsEnabled());

  const parsed = useMemo(() => {
    if (!rawInput.trim()) return [] as Record<string, string>[];

    if (rawInput.trim().startsWith("{")) {
      try {
        const json = JSON.parse(rawInput);
        if (Array.isArray(json)) return json;
        if (Array.isArray(json.data)) return json.data;
      } catch {
        return [];
      }
    }

    const result = Papa.parse(rawInput.trim(), { header: true });
    return (result.data as Record<string, string>[]).filter((row) => Object.values(row).some(Boolean));
  }, [rawInput]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await loadMetricsSnapshot();
        setMetricsSnapshot(
          data.reduce((acc, record) => {
            acc[record.ticker] = record;
            return acc;
          }, {} as Record<string, MetricsSnapshot>)
        );
      } catch {
        setMetricsSnapshot({});
      }
    };
    loadMetrics();
  }, []);

  useEffect(() => {
    const target = loadProjectState(projectId, "target-company", null);
    if (target?.ticker) setTargetTicker(target.ticker);
  }, [projectId]);

  const handleAnalyze = () => {
    const nextColumns = parsed[0] ? Object.keys(parsed[0]) : [];
    const nextMapping = suggestMapping(nextColumns);
    setColumns(nextColumns);
    setMapping(nextMapping);
    if (nextColumns.length > 0) {
      localStorage.setItem(`mapping:${companyKey}`, JSON.stringify(nextMapping));
    }
  };

  const handleFetch = async (nextMode = mode) => {
    setIsLoading(true);
    setDataError(null);
    try {
      const response = await getFinancials(ticker.trim().toUpperCase(), nextMode, {
        allowDirect,
      });
      setDataStatus(response.status);
      setDataError(response.error ?? response.warning ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    const upperTicker = ticker.trim().toUpperCase();
    try {
      importFinancials({
        ticker: upperTicker,
        rows: parsed,
        mapping,
        currency,
        statementType,
        period,
      });
      setMode("import");
      void handleFetch("import");
    } catch (error) {
      setDataError(error as DataError);
    }
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setRawInput(text);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Data Hub & Importer</h1>
        <p className="text-sm text-muted-foreground">
          Offline-first ingestion with reliable Yahoo proxy support, structured errors, and import tooling.
        </p>
      </div>

      <DataStatusBanner
        status={dataStatus}
        error={dataError}
        actions={{
          onUseSample: () => {
            setMode("offline");
            void handleFetch("offline");
          },
          onUseCached: () => void handleFetch(mode),
          onImport: () => setMode("import"),
          onCheckProxy: () => setMode("proxy"),
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Project workspace</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project ID (for saved filters & templates)</Label>
            <Input value={projectId} onChange={(event) => setProjectId(event.target.value)} />
            <p className="text-xs text-muted-foreground">
              Each project keeps its own screener filters, beta settings, deductibility rules, and scorecards.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
            <p>Persistence uses localStorage only — no data leaves this device.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target company (Explorer overlay)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label>Target ticker</Label>
            <Input value={targetTicker} onChange={(event) => setTargetTicker(event.target.value.toUpperCase())} />
            <p className="text-xs text-muted-foreground">
              Used to plot a target overlay and compute nearest peers in Explorer.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const metrics = metricsSnapshot[targetTicker];
              saveProjectState(projectId, "target-company", metrics ? { ticker: targetTicker, name: targetTicker, metrics } : null);
            }}
          >
            Save target
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Ticker</Label>
              <Input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as DataMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Data Mode</SelectLabel>
                    {DATA_MODES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {DATA_MODES.find((option) => option.value === mode)?.description}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
              <p>
                Yahoo endpoints are unofficial and unstable. The app defaults to bundled sample data and only fetches live
                data through a proxy (or in developer mode).
              </p>
            </div>
            <Button onClick={() => void handleFetch()} disabled={isLoading}>
              {isLoading ? "Loading…" : "Load financials"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bundled sample datasets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {sampleDatasets.map((dataset) => (
            <div key={dataset.name} className="rounded-lg border border-border/60 p-3">
              <h3 className="text-sm font-semibold text-foreground">{dataset.name}</h3>
              <p className="text-xs text-muted-foreground">{dataset.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <a className="text-xs text-primary underline" href={dataset.path}>
                  Open {dataset.path}
                </a>
                <Button size="sm" variant="ghost" onClick={() => {
                  setTicker(dataset.ticker);
                  setMode("offline");
                  void handleFetch("offline");
                }}>
                  Load
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              <Label>Paste CSV or JSON</Label>
              <Textarea
                rows={10}
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
                placeholder="Paste CSV/JSON data here"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={handleAnalyze}>
                  Analyze & map
                </Button>
                <Badge variant="secondary">Schema: Income + Balance Sheet minimum</Badge>
                <label className="text-xs text-muted-foreground">
                  <input
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleFileUpload(file);
                    }}
                  />
                  <span className="cursor-pointer underline">Upload file</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company key</Label>
              <Input value={companyKey} onChange={(event) => setCompanyKey(event.target.value)} />
              <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                <p>Mapping overrides are stored locally per company key.</p>
                <p>Suggested mapping is generated from column heuristics.</p>
              </div>
              <div className="grid gap-2">
                <Label>Statement type</Label>
                <Select value={statementType} onValueChange={(value) => setStatementType(value as typeof statementType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Statement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incomeStatement">Income statement</SelectItem>
                    <SelectItem value="balanceSheet">Balance sheet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          {columns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Suggested mapping</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(mapping).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-muted-foreground">{key}</span>
                    <Input value={value} onChange={(event) => setMapping((prev) => ({ ...prev, [key]: event.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => localStorage.setItem(`mapping:${companyKey}`, JSON.stringify(mapping))}>
                  Save mapping overrides
                </Button>
                <Button size="sm" onClick={handleImport}>
                  Import data
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Developer settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Label>Proxy base URL</Label>
            <Input
              placeholder="https://your-proxy.example.com"
              value={proxyBase}
              onChange={(event) => {
                setProxyBase(event.target.value);
                setProxyBaseUrl(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">Configured proxy endpoints must return JSON and set CORS headers.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Allow direct Yahoo calls</p>
              <p className="text-xs text-muted-foreground">Developer toggle only (may fail on GitHub Pages).</p>
            </div>
            <Switch
              checked={allowDirect}
              onCheckedChange={(checked) => {
                setAllowDirectState(checked);
                setAllowDirect(checked);
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Enable diagnostics drawer</p>
              <p className="text-xs text-muted-foreground">Shows request logs and cache stats (no secrets).</p>
            </div>
            <Switch
              checked={diagnosticsEnabled}
              onCheckedChange={(checked) => {
                setDiagnosticsEnabledState(checked);
                setDiagnosticsEnabled(checked);
              }}
            />
          </div>
          {diagnosticsEnabled ? <DiagnosticsDrawer /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yahoo data disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Yahoo Finance endpoints are unofficial and may be delayed or incomplete. This app is intended for educational
            use and should not be relied on for investment decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
