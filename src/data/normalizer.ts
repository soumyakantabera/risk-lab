import { PartialDataWarning } from "@/data/errors";
import type { FinancialStatement, NormalizedFinancials } from "@/data/types";

const incomeMap: Record<string, string> = {
  totalRevenue: "revenue",
  costOfRevenue: "costOfRevenue",
  grossProfit: "grossProfit",
  operatingExpense: "operatingExpense",
  operatingIncome: "operatingIncome",
  ebit: "ebit",
  ebitda: "ebitda",
  interestExpense: "interestExpense",
  incomeBeforeTax: "pretaxIncome",
  incomeTaxExpense: "incomeTax",
  netIncome: "netIncome",
};

const balanceMap: Record<string, string> = {
  totalAssets: "totalAssets",
  totalCurrentAssets: "currentAssets",
  totalLiab: "totalLiabilities",
  totalCurrentLiabilities: "currentLiabilities",
  cash: "cashAndEquivalents",
  shortTermInvestments: "shortTermInvestments",
  longTermInvestments: "longTermInvestments",
  goodwill: "goodwill",
  totalStockholderEquity: "totalEquity",
  commonStock: "commonStock",
  retainedEarnings: "retainedEarnings",
};

const numberValue = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object" && value !== null) {
    const raw = (value as { raw?: number }).raw;
    if (typeof raw === "number") return raw;
    const fmt = (value as { fmt?: string }).fmt;
    if (fmt) {
      const parsed = Number(fmt.replace(/,/g, ""));
      return Number.isNaN(parsed) ? null : parsed;
    }
  }
  return null;
};

const dateValue = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value * 1000).toISOString().slice(0, 10);
  if (typeof value === "object") {
    const fmt = (value as { fmt?: string }).fmt;
    if (fmt) return fmt;
  }
  return null;
};

const mapStatement = (items: Record<string, unknown>[], map: Record<string, string>, lineItemMap: Record<string, string>) => {
  return items
    .map((item) => {
      const date = dateValue(item.endDate) || dateValue(item.asOfDate) || "";
      const normalized: Record<string, number | string | null> = { date };
      Object.entries(map).forEach(([rawKey, normalizedKey]) => {
        if (rawKey in item) {
          lineItemMap[rawKey] = normalizedKey;
          normalized[normalizedKey] = numberValue(item[rawKey]);
        }
      });
      return normalized;
    })
    .filter((item) => item.date);
};

const emptyStatement = (): FinancialStatement => ({ yearly: [], quarterly: [] });

const extractStatement = (raw: any, path: string[]): Record<string, unknown>[] => {
  let current: any = raw;
  for (const key of path) {
    if (!current || !(key in current)) return [];
    current = current[key];
  }
  return Array.isArray(current) ? current : [];
};

export const normalizeYahooFinancials = (raw: any, ticker: string, fetchedAt: string) => {
  const quoteSummary = raw?.quoteSummary?.result?.[0];
  const lineItemMap: Record<string, string> = {};

  const incomeYearly = extractStatement(quoteSummary, ["incomeStatementHistory", "incomeStatementHistory"]);
  const incomeQuarterly = extractStatement(quoteSummary, [
    "incomeStatementHistoryQuarterly",
    "incomeStatementHistory",
  ]);
  const balanceYearly = extractStatement(quoteSummary, ["balanceSheetHistory", "balanceSheetStatements"]);
  const balanceQuarterly = extractStatement(quoteSummary, [
    "balanceSheetHistoryQuarterly",
    "balanceSheetStatements",
  ]);

  const incomeStatement: FinancialStatement = {
    yearly: mapStatement(incomeYearly, incomeMap, lineItemMap),
    quarterly: mapStatement(incomeQuarterly, incomeMap, lineItemMap),
  };
  const balanceSheet: FinancialStatement = {
    yearly: mapStatement(balanceYearly, balanceMap, lineItemMap),
    quarterly: mapStatement(balanceQuarterly, balanceMap, lineItemMap),
  };

  const currency =
    quoteSummary?.price?.currency ||
    quoteSummary?.summaryDetail?.currency ||
    quoteSummary?.financialData?.financialCurrency ||
    "USD";

  const fiscalYearEnd =
    dateValue(quoteSummary?.calendarEvents?.earnings?.earningsDate?.[0]) ||
    incomeStatement.yearly[0]?.date ||
    "";

  const sharesOut = numberValue(quoteSummary?.defaultKeyStatistics?.sharesOutstanding);
  const marketCap = numberValue(quoteSummary?.summaryDetail?.marketCap);
  const price = numberValue(quoteSummary?.price?.regularMarketPrice);

  const normalized: NormalizedFinancials = {
    meta: {
      ticker,
      currency,
      fiscalYearEnd: fiscalYearEnd || "Unknown",
      source: "yahoo",
      asOfDate: fetchedAt,
    },
    incomeStatement: incomeStatement.yearly.length || incomeStatement.quarterly.length ? incomeStatement : emptyStatement(),
    balanceSheet: balanceSheet.yearly.length || balanceSheet.quarterly.length ? balanceSheet : emptyStatement(),
    lineItemMap,
    sharesOut: sharesOut ?? undefined,
    marketCap: marketCap ?? undefined,
    price: price ?? undefined,
  };

  let warning: PartialDataWarning | null = null;
  if (!incomeStatement.yearly.length || !balanceSheet.yearly.length) {
    warning = new PartialDataWarning(
      "Some statements are missing from Yahoo responses.",
      "Proceed with assumptions or import missing statements manually.",
      { details: "Income or balance statements unavailable." }
    );
  }

  return { normalized, warning };
};

export const normalizeImportedRows = ({
  rows,
  mapping,
  ticker,
  currency,
  statementType,
  period,
  sourceLabel,
}: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  ticker: string;
  currency: string;
  statementType: "incomeStatement" | "balanceSheet";
  period: "yearly" | "quarterly";
  sourceLabel?: string;
}) => {
  const lineItemMap: Record<string, string> = {};
  const statement: FinancialStatement = { yearly: [], quarterly: [] };

  const mappedRows = rows
    .map((row) => {
      const normalized: Record<string, number | string | null> = { date: row.date || "" };
      Object.entries(mapping).forEach(([rawKey, normalizedKey]) => {
        if (!normalizedKey) return;
        if (rawKey in row) {
          lineItemMap[rawKey] = normalizedKey;
          normalized[normalizedKey] = numberValue(row[rawKey]);
        }
      });
      return normalized;
    })
    .filter((row) => row.date);

  statement[period] = mappedRows;

  return {
    normalized: {
      meta: {
        ticker,
        currency,
        fiscalYearEnd: mappedRows[0]?.date ?? "",
        source: sourceLabel ?? "import",
        asOfDate: new Date().toISOString(),
      },
      incomeStatement: statementType === "incomeStatement" ? statement : { yearly: [], quarterly: [] },
      balanceSheet: statementType === "balanceSheet" ? statement : { yearly: [], quarterly: [] },
      lineItemMap,
    } as NormalizedFinancials,
    warning: mappedRows.length === 0
      ? new PartialDataWarning(
          "No rows were imported.",
          "Check the date column mapping and ensure rows include dates.",
          { details: "No valid rows after mapping." }
        )
      : null,
  };
};
