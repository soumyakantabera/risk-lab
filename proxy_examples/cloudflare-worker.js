export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/yahoo/statements") {
      return new Response(JSON.stringify({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } }), {
        status: 404,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    }

    const ticker = url.searchParams.get("ticker");
    const period = url.searchParams.get("period") || "annual";
    if (!ticker) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "BAD_REQUEST", message: "ticker is required" } }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
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

    const body = {
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
    };

    return new Response(JSON.stringify(body), {
      status: yahooResponse.ok ? 200 : yahooResponse.status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
    });
  },
};
