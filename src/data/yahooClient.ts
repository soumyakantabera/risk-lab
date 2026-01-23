import {
  CorsError,
  NetworkError,
  NotFoundError,
  ProxyMisconfiguredError,
  RateLimitError,
  UpstreamChangeError,
} from "@/data/errors";
import type { YahooProxyResponse } from "@/data/types";

const DEFAULT_TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = [500, 1000, 2000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isHtmlResponse = (text: string, contentType?: string | null) => {
  if (contentType?.includes("text/html")) return true;
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
};

const toDebugInfo = (endpoint: string, status?: number, rawPreview?: string) => ({
  endpoint,
  status,
  timestamp: new Date().toISOString(),
  rawPreview,
});

const shouldRetry = (status?: number, errorCode?: string) => {
  if (errorCode === "NETWORK_ERROR" || errorCode === "RATE_LIMIT") return true;
  return status === 502 || status === 503 || status === 504 || status === 429;
};

const fetchWithTimeout = async (url: string, timeoutMs: number, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new NetworkError("Request timed out.", "Retry or switch to sample data.", toDebugInfo(url));
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const handleFetchError = (error: unknown, endpoint: string) => {
  if (error instanceof NetworkError) return error;
  const message = (error as Error).message || "Network request failed";
  if (message.toLowerCase().includes("failed to fetch")) {
    return new CorsError(
      "Browser blocked the request (likely CORS).",
      "Use the proxy or enable developer mode for direct calls.",
      toDebugInfo(endpoint)
    );
  }
  return new NetworkError("Network error while fetching Yahoo data.", "Retry or use cached/sample data.", toDebugInfo(endpoint));
};

const parseJsonResponse = async (response: Response, endpoint: string) => {
  const text = await response.text();
  if (isHtmlResponse(text, response.headers.get("content-type"))) {
    throw new UpstreamChangeError(
      "Proxy likely blocked or returned HTML.",
      "Check proxy logs or use sample data.",
      toDebugInfo(endpoint, response.status, text.slice(0, 500))
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamChangeError(
      "Response was not valid JSON.",
      "Check proxy configuration and ensure JSON responses.",
      toDebugInfo(endpoint, response.status, text.slice(0, 500))
    );
  }
};

export const fetchYahooProxyStatements = async ({
  baseUrl,
  ticker,
  period,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  baseUrl: string | null;
  ticker: string;
  period: "annual" | "quarterly";
  timeoutMs?: number;
}): Promise<YahooProxyResponse> => {
  if (!baseUrl) {
    throw new ProxyMisconfiguredError(
      "Proxy base URL is missing.",
      "Configure a proxy base URL in Data settings.",
      { timestamp: new Date().toISOString() }
    );
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/yahoo/statements?ticker=${encodeURIComponent(
    ticker
  )}&period=${period}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, timeoutMs);
      const json = await parseJsonResponse(response, endpoint);

      if (!response.ok) {
        if (response.status === 404) {
          throw new ProxyMisconfiguredError(
            "Proxy endpoint returned 404.",
            "Verify the proxy route and base URL.",
            toDebugInfo(endpoint, response.status)
          );
        }
        if (response.status === 429) {
          throw new RateLimitError(
            "Rate limited by proxy or upstream.",
            "Wait and retry or use cached data.",
            toDebugInfo(endpoint, response.status)
          );
        }
        throw new NetworkError(
          `Proxy request failed (${response.status}).`,
          "Retry or use cached/sample data.",
          toDebugInfo(endpoint, response.status)
        );
      }

      if (!json || typeof json !== "object" || !("ok" in json)) {
        throw new UpstreamChangeError(
          "Proxy response format did not match contract.",
          "Update the proxy response format.",
          toDebugInfo(endpoint, response.status, JSON.stringify(json).slice(0, 500))
        );
      }

      const proxyResponse = json as YahooProxyResponse;
      if (!proxyResponse.ok) {
        throw new NotFoundError(
          proxyResponse.error?.message || "Ticker not found.",
          "Check the ticker or use sample data.",
          { ...toDebugInfo(endpoint, proxyResponse.error?.status), details: proxyResponse.error?.code }
        );
      }

      return proxyResponse;
    } catch (error) {
      const resolvedError = handleFetchError(error, endpoint);
      lastError = resolvedError;
      if (attempt < RETRY_DELAYS_MS.length && shouldRetry(resolvedError.debugInfo?.status, resolvedError.code)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw resolvedError;
    }
  }

  throw lastError ?? new NetworkError("Unknown error fetching proxy data.", "Retry or use sample data.");
};

export const fetchYahooDirectStatements = async ({
  ticker,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  ticker: string;
  timeoutMs?: number;
}) => {
  const modules = [
    "incomeStatementHistory",
    "incomeStatementHistoryQuarterly",
    "balanceSheetHistory",
    "balanceSheetHistoryQuarterly",
    "price",
    "summaryDetail",
    "defaultKeyStatistics",
    "financialData",
    "calendarEvents",
  ].join(",");
  const endpoint = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    ticker
  )}?modules=${modules}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, timeoutMs);
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError("Yahoo rate limit hit.", "Retry later or use proxy/sample data.", toDebugInfo(endpoint));
        }
        if (response.status === 404) {
          throw new NotFoundError("Ticker not found on Yahoo.", "Check the ticker or use sample data.", toDebugInfo(endpoint));
        }
        throw new NetworkError(
          `Yahoo request failed (${response.status}).`,
          "Retry later or use proxy/sample data.",
          toDebugInfo(endpoint, response.status)
        );
      }

      if (isHtmlResponse(text, response.headers.get("content-type"))) {
        throw new UpstreamChangeError(
          "Yahoo returned HTML instead of JSON.",
          "Use the proxy or sample data.",
          toDebugInfo(endpoint, response.status, text.slice(0, 500))
        );
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new UpstreamChangeError(
          "Yahoo response JSON shape changed.",
          "Use the proxy or sample data.",
          toDebugInfo(endpoint, response.status, text.slice(0, 500))
        );
      }
    } catch (error) {
      const resolvedError = handleFetchError(error, endpoint);
      lastError = resolvedError;
      if (attempt < RETRY_DELAYS_MS.length && shouldRetry(resolvedError.debugInfo?.status, resolvedError.code)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw resolvedError;
    }
  }

  throw lastError ?? new NetworkError("Unknown error fetching Yahoo data.", "Retry or use sample data.");
};
