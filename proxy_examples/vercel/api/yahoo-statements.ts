import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET" } });
  }

  const ticker = req.query.ticker as string | undefined;
  const period = (req.query.period as string | undefined) ?? "annual";
  if (!ticker) {
    return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "ticker is required" } });
  }

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

  const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    ticker
  )}?modules=${modules}&period=${period}`;

  const yahooResponse = await fetch(yahooUrl);
  const raw = await yahooResponse.json();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  return res.status(yahooResponse.ok ? 200 : yahooResponse.status).json({
    ok: yahooResponse.ok,
    ticker,
    fetchedAt: new Date().toISOString(),
    source: "yahoo",
    raw,
    error: yahooResponse.ok
      ? undefined
      : {
          code: "UPSTREAM_ERROR",
          message: "Yahoo request failed",
          status: yahooResponse.status,
        },
  });
}
