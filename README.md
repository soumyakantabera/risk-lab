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

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Plotly.js

## Disclaimer

**Educational risk analytics — not financial advice.**
