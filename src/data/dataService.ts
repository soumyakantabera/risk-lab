import {
  DataError,
  NetworkError,
  NotFoundError,
  PartialDataWarning,
  ProxyMisconfiguredError,
  ValidationError,
} from "@/data/errors";
import { getCache, getCacheStats, recordCacheHit, recordCacheMiss, setCache } from "@/data/cache";
import { normalizeImportedRows, normalizeYahooFinancials } from "@/data/normalizer";
import { fetchYahooDirectStatements, fetchYahooProxyStatements } from "@/data/yahooClient";
import { assertValidNormalizedFinancials, SCHEMA_VERSION } from "@/data/validator";
import type { DataMode, DataRequestLog, DataStatus, NormalizedFinancials, YahooProxyResponse } from "@/data/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_LOG_KEY = "data:request-logs";
const IMPORT_STORAGE_KEY = "data:imported";
const PROXY_BASE_KEY = "data:proxy-base";
const ALLOW_DIRECT_KEY = "data:allow-direct";
const DEV_DIAGNOSTICS_KEY = "data:diagnostics-enabled";

const buildCacheKey = (ticker: string, mode: DataMode) => `${ticker.toUpperCase()}:${mode}:${SCHEMA_VERSION}`;

const storeRequestLog = (log: DataRequestLog) => {
  if (typeof localStorage === "undefined") return;
  const stored = localStorage.getItem(REQUEST_LOG_KEY);
  const list = stored ? (JSON.parse(stored) as DataRequestLog[]) : [];
  const next = [log, ...list].slice(0, 20);
  localStorage.setItem(REQUEST_LOG_KEY, JSON.stringify(next));
};

export const getRequestLogs = () => {
  if (typeof localStorage === "undefined") return [] as DataRequestLog[];
  const stored = localStorage.getItem(REQUEST_LOG_KEY);
  if (!stored) return [] as DataRequestLog[];
  try {
    return JSON.parse(stored) as DataRequestLog[];
  } catch {
    return [] as DataRequestLog[];
  }
};

export const clearRequestLogs = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(REQUEST_LOG_KEY);
};

export const buildDiagnosticsBundle = () => ({
  generatedAt: new Date().toISOString(),
  logs: getRequestLogs(),
  cacheStats: getCacheStats(),
});

export const getProxyBaseUrl = () => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(PROXY_BASE_KEY) || import.meta.env.VITE_YAHOO_PROXY_BASE || null;
};

export const setProxyBaseUrl = (value: string) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROXY_BASE_KEY, value);
};

export const getAllowDirect = () => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(ALLOW_DIRECT_KEY) === "true";
};

export const setAllowDirect = (value: boolean) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ALLOW_DIRECT_KEY, String(value));
};

export const getDiagnosticsEnabled = () => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DEV_DIAGNOSTICS_KEY) === "true";
};

export const setDiagnosticsEnabled = (value: boolean) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEV_DIAGNOSTICS_KEY, String(value));
};

export type MetricsSnapshot = {
  ticker: string;
  revenue_ttm?: number;
  revenue_cagr_3y?: number;
  ebitda_margin_ttm?: number;
};

export const loadMetricsSnapshot = async () => {
  const response = await fetch("/data/peer_universes/metrics_snapshot.json");
  if (!response.ok) {
    throw new NetworkError("Failed to load metrics snapshot.", "Retry or use manual entry.", {
      status: response.status,
      endpoint: "/data/peer_universes/metrics_snapshot.json",
      timestamp: new Date().toISOString(),
    });
  }
  return (await response.json()) as MetricsSnapshot[];
};

const recordImport = (ticker: string, data: NormalizedFinancials) => {
  if (typeof localStorage === "undefined") return;
  const stored = localStorage.getItem(IMPORT_STORAGE_KEY);
  const existing = stored ? (JSON.parse(stored) as Record<string, NormalizedFinancials>) : {};
  existing[ticker.toUpperCase()] = data;
  localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(existing));
};

const getImport = (ticker: string) => {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(IMPORT_STORAGE_KEY);
  if (!stored) return null;
  try {
    const existing = JSON.parse(stored) as Record<string, NormalizedFinancials>;
    return existing[ticker.toUpperCase()] || null;
  } catch {
    return null;
  }
};

const buildStatus = ({
  level,
  label,
  message,
  actionHint,
  details,
  isStale,
}: Omit<DataStatus, "updatedAt">): DataStatus => ({
  level,
  label,
  message,
  actionHint,
  details,
  isStale,
  updatedAt: new Date().toISOString(),
});

const recordLog = ({
  ticker,
  mode,
  status,
  start,
  endpoint,
  cacheHit,
  cacheStale,
  error,
  responsePreview,
}: {
  ticker: string;
  mode: DataMode;
  status: DataRequestLog["status"];
  start: number;
  endpoint?: string;
  cacheHit: boolean;
  cacheStale?: boolean;
  error?: DataError;
  responsePreview?: string;
}) => {
  const durationMs = Math.round(performance.now() - start);
  storeRequestLog({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ticker,
    mode,
    status,
    timestamp: new Date().toISOString(),
    endpoint,
    durationMs,
    ttfbMs: durationMs,
    cacheHit,
    cacheStale,
    errorCode: error?.code,
    errorMessage: error?.message,
    httpStatus: error?.debugInfo?.status,
    responsePreview,
  });
};

export const getFinancials = async (
  ticker: string,
  mode: DataMode,
  options?: { allowDirect?: boolean }
): Promise<{ data?: NormalizedFinancials; status: DataStatus; warning?: PartialDataWarning; error?: DataError }> => {
  const start = performance.now();
  const cacheKey = buildCacheKey(ticker, mode);

  const cached = getCache<NormalizedFinancials>(cacheKey);
  if (cached?.record && !cached.isStale) {
    recordCacheHit();
    recordLog({ ticker, mode, status: "cached", start, cacheHit: true, cacheStale: false });
    return {
      data: cached.record.data,
      status: buildStatus({
        level: "cached",
        label: "Cached",
        message: "Using cached financials.",
        isStale: false,
      }),
    };
  }

  recordCacheMiss();

  try {
    let normalized: NormalizedFinancials | null = null;
    let warning: PartialDataWarning | null = null;
    let endpoint: string | undefined;
    let responsePreview: string | undefined;

    if (mode === "offline") {
      endpoint = `/data/sample/${ticker.toLowerCase()}.json`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new NotFoundError("Sample dataset not found.", "Choose another sample ticker.", {
          status: response.status,
          endpoint,
        });
      }
      const json = (await response.json()) as NormalizedFinancials;
      normalized = json;
      responsePreview = JSON.stringify(json).slice(0, 500);
    }

    if (mode === "proxy") {
      const proxyBase = getProxyBaseUrl();
      const proxyResponse: YahooProxyResponse = await fetchYahooProxyStatements({
        baseUrl: proxyBase,
        ticker,
        period: "annual",
      });
      endpoint = proxyBase ? `${proxyBase.replace(/\/$/, "")}/api/yahoo/statements` : undefined;
      const normalizedResult = normalizeYahooFinancials(proxyResponse.raw, ticker, proxyResponse.fetchedAt);
      normalized = normalizedResult.normalized;
      warning = normalizedResult.warning;
      responsePreview = JSON.stringify(proxyResponse.raw).slice(0, 500);
    }

    if (mode === "direct") {
      if (!options?.allowDirect) {
        throw new ProxyMisconfiguredError(
          "Direct Yahoo fetch is disabled.",
          "Enable developer mode or use a proxy.",
          { timestamp: new Date().toISOString() }
        );
      }
      const raw = await fetchYahooDirectStatements({ ticker });
      const normalizedResult = normalizeYahooFinancials(raw, ticker, new Date().toISOString());
      normalized = normalizedResult.normalized;
      warning = normalizedResult.warning;
      responsePreview = JSON.stringify(raw).slice(0, 500);
    }

    if (mode === "import") {
      const imported = getImport(ticker);
      if (!imported) {
        throw new NotFoundError("No imported data found.", "Import CSV/JSON data first.", {
          timestamp: new Date().toISOString(),
        });
      }
      normalized = imported;
      responsePreview = JSON.stringify(imported).slice(0, 500);
    }

    if (!normalized) {
      throw new NetworkError("No data available.", "Use sample data or import your own.");
    }

    assertValidNormalizedFinancials(normalized);
    setCache(cacheKey, normalized, CACHE_TTL_MS);

    const status: DataStatus = warning
      ? buildStatus({
          level: "partial",
          label: "Partial",
          message: warning.message,
          actionHint: warning.actionHint,
          details: warning.debugInfo?.details,
        })
      : buildStatus({
          level: "live",
          label: mode === "offline" ? "Sample (offline)" : "Live",
          message: "Financials loaded successfully.",
        });

    recordLog({
      ticker,
      mode,
      status: status.level,
      start,
      endpoint,
      cacheHit: false,
      error: warning ?? undefined,
      responsePreview,
    });

    return { data: normalized, status, warning: warning ?? undefined };
  } catch (error) {
    const resolvedError = error instanceof DataError ? error : new ValidationError("Unexpected error.", "Retry or use sample data.");
    const cachedFallback = cached?.record;

    if (cachedFallback) {
      recordCacheHit();
      recordLog({
        ticker,
        mode,
        status: "cached",
        start,
        cacheHit: true,
        cacheStale: true,
        error: resolvedError,
      });
      return {
        data: cachedFallback.data,
        status: buildStatus({
          level: "cached",
          label: "Cached (stale)",
          message: "Live fetch failed. Showing cached data.",
          actionHint: resolvedError.actionHint,
          details: resolvedError.debugInfo?.details,
          isStale: true,
        }),
        error: resolvedError,
      };
    }

    recordLog({
      ticker,
      mode,
      status: "failed",
      start,
      cacheHit: false,
      error: resolvedError,
    });

    return {
      status: buildStatus({
        level: "failed",
        label: "Failed",
        message: resolvedError.message,
        actionHint: resolvedError.actionHint,
        details: resolvedError.debugInfo?.details,
      }),
      error: resolvedError,
    };
  }
};

export const importFinancials = ({
  ticker,
  rows,
  mapping,
  currency,
  statementType,
  period,
}: {
  ticker: string;
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  currency: string;
  statementType: "incomeStatement" | "balanceSheet";
  period: "yearly" | "quarterly";
}) => {
  const result = normalizeImportedRows({
    rows,
    mapping,
    ticker,
    currency,
    statementType,
    period,
    sourceLabel: "import",
  });
  assertValidNormalizedFinancials(result.normalized);
  recordImport(ticker, result.normalized);
  return result;
};
