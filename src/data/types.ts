export type FinancialLineItem = {
  date: string;
  [key: string]: number | string | null;
};

export type FinancialStatement = {
  yearly: FinancialLineItem[];
  quarterly: FinancialLineItem[];
};

export type NormalizedMeta = {
  ticker: string;
  currency: string;
  fiscalYearEnd: string;
  source: string;
  asOfDate: string;
};

export type NormalizedFinancials = {
  meta: NormalizedMeta;
  incomeStatement: FinancialStatement;
  balanceSheet: FinancialStatement;
  lineItemMap: Record<string, string>;
  sharesOut?: number;
  marketCap?: number;
  price?: number;
};

export type YahooProxyResponse = {
  ok: boolean;
  ticker: string;
  fetchedAt: string;
  source: "yahoo";
  raw: unknown;
  error?: { code: string; message: string; status?: number };
};

export type DataMode = "offline" | "proxy" | "direct" | "import";

export type DataStatusLevel = "live" | "cached" | "partial" | "failed";

export type DataStatus = {
  level: DataStatusLevel;
  label: string;
  message: string;
  updatedAt: string;
  actionHint?: string;
  details?: string;
  isStale?: boolean;
};

export type DataRequestLog = {
  id: string;
  ticker: string;
  mode: DataMode;
  status: DataStatusLevel;
  timestamp: string;
  endpoint?: string;
  durationMs: number;
  ttfbMs?: number;
  cacheHit: boolean;
  cacheStale?: boolean;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  responsePreview?: string;
};

export type CacheStats = {
  hits: number;
  misses: number;
};
