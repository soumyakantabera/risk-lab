# RiskLab — VaR & Expected Shortfall Dashboard

A professional-grade risk analytics web application for calculating Value at Risk (VaR) and Expected Shortfall (ES). Runs entirely client-side as a static site, perfect for GitHub Pages deployment.

## Features

- **6 VaR/ES Models**: Historical Simulation, Parametric Gaussian, Student-t, EWMA, Monte Carlo, Filtered Historical Simulation
- **Multiple Confidence Levels**: 90%, 95%, 97.5%, 99%
- **Backtesting**: Rolling VaR backtest with Kupiec POF test
- **Stress Testing**: Custom shock scenarios and volatility stress
- **Interactive Charts**: Plotly.js powered visualizations
- **CSV Upload**: Import your own price/return data
- **Export**: CSV export and print-friendly reports

## Quick Start

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Connect to GitHub via Lovable
2. Add `.github/workflows/deploy.yml` with GitHub Actions workflow
3. Enable GitHub Pages in repository settings (source: gh-pages branch)
4. Uses HashRouter for SPA compatibility

## Sample Datasets

- **Normal Returns**: Standard normally distributed returns
- **Heavy-Tail**: Fat-tailed distribution with jump events  
- **Multi-Asset**: 3 correlated assets with volatility regime shifts

## Troubleshooting Yahoo fetch

The Yahoo Finance endpoints used by the optional live data proxy are unofficial and can be unstable.
If live data fails, the app automatically falls back to cached responses (when available) or the bundled
sample datasets under `public/data/sample/`.

Common issues and fixes:

- **CORS errors / `Failed to fetch`**: Direct browser calls are blocked. Configure a proxy base URL in the
  Data Hub settings and keep direct mode disabled in production.
- **Proxy returns HTML**: Your proxy may be blocked or returning an error page. Ensure the proxy returns
  JSON with the required `YahooProxyResponse` contract and CORS headers.
- **404 from proxy**: Verify the route is `/api/yahoo/statements` and that the base URL is correct.
- **Validation errors / upstream changes**: Yahoo response shapes can change. Update your proxy parser or
  switch to sample/imported data.
- **Rate limits**: Wait and retry, or use cached/sample data for offline workflows.

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Plotly.js

## Disclaimer

**Educational risk analytics — not financial advice.**
