## Goal

Make RiskLab fully usable on mobile devices and visually correct in light mode. Today the app has two systemic problems:

1. **Mobile**: The sidebar is always shown (only the `<SidebarTrigger>` is `lg:hidden`, but the `<AppSidebar>` itself never collapses), the TopBar overflows on small widths, page headers/control bars use `flex-wrap` poorly, tables overflow horizontally with no scroll wrapper, and chart heights/legends aren't tuned for narrow widths.
2. **Light mode**: Plotly chart colors are hardcoded to dark-theme HSL values (`hsl(210,40%,98%)` text, `hsl(217,33%,17%)` grid, etc.) in `ReturnsHistogram`, `CorrelationHeatmap`/`DrawdownChart`, `RollingVaRChart`, and `MonteCarloPathsChart`. They look broken in light mode (white text on white background, invisible grid). The `light` CSS class is applied correctly by `RiskContext`, so the issue is purely chart-level.

## Changes

### 1. Responsive layout shell
- `AppLayout` / `AppSidebar`: make the sidebar collapse to an off-canvas drawer below `lg` (use shadcn sidebar `collapsible="offcanvas"` + appropriate `Sidebar` props), and show the `SidebarTrigger` on mobile only.
- `TopBar`: stack badges + return-type select + Recalculate button into a wrapping row; hide non-essential badges (`obs`, `assets`) below `sm`; truncate dataset name; show `SidebarTrigger` on mobile.

### 2. Theme-aware Plotly charts
Replace hardcoded HSL strings with values that adapt to `.light` vs dark. Approach: read CSS variables at render time via a small `useChartTheme()` hook that returns `{ fg, mutedFg, grid, paper }` derived from `getComputedStyle(document.documentElement).getPropertyValue('--foreground')` etc., and re-evaluates when `isDarkMode` from `useRisk()` flips.
- Update files: `ReturnsHistogram.tsx`, `CorrelationHeatmap.tsx` (both `CorrelationHeatmap` and `DrawdownChart`), `RollingVaRChart.tsx`, `MonteCarloPathsChart.tsx`. Replace hardcoded `font.color`, `gridcolor`, `zerolinecolor`, title color, colorbar fonts.
- `CorrelationHeatmap` annotation text: use white only when |z| > 0.5, otherwise theme `--foreground` (same fix already used in `CorrelationMatrix.tsx`).

### 3. Page-level responsive tweaks
- `OverviewPage`: KPI grid already responsive — verify `xl:grid-cols-6` collapses cleanly; reduce KPI card padding on mobile via `KPICard` (`p-4 sm:p-5`).
- `ModelsPage`, `BacktestPage`: control rows use `flex flex-wrap gap-4 items-end` — on small screens make children full-width (`w-full sm:w-auto`) and stack the EWMA / Window sliders so they don't get clipped.
- All pages with `<Table>` (Models, Backtest, Stress, Reports, DataPage weights table): wrap in `<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">` so wide tables scroll horizontally instead of breaking the layout.
- `MarketDataFetcher`: action buttons row → `flex-col sm:flex-row`; popular-tickers chips already wrap (OK); cache-status row wraps on small screens.
- `PriceChartPreview`: mode-switch button group → allow wrap; reduce chart height to `260px` below `sm`.
- `ReportsPage` header: stack title + export buttons on mobile (`flex-col sm:flex-row`).

### 4. Light-mode polish (CSS-side, not just charts)
- `index.css`: the `.light` block exists but `.glass-card` uses a hardcoded dark gradient (`hsl(var(--card) / 0.9)` is fine since it uses the var, but the second stop `hsl(222 47% 7%)` in `.kpi-card` is dark-only). Replace `.kpi-card` background with `hsl(var(--card))` / `hsl(var(--muted))` so it works in both themes.
- Ensure `.print:` styles still produce a readable PDF in either theme (force light tokens for print).

### 5. Touch targets
- Bump small icon-buttons (close-X on ticker badges, mode toggle buttons) to min `h-8 w-8` on mobile via `sm:` breakpoints where they're currently `h-7`.

## Out of scope
- No new features; no design overhaul. Same components, same behavior — just responsive + theme-correct.
- No changes to risk math or data fetching.

## Files to edit
- `src/components/layout/AppSidebar.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/TopBar.tsx`
- `src/components/charts/ReturnsHistogram.tsx`, `src/components/charts/CorrelationHeatmap.tsx`, `src/components/charts/RollingVaRChart.tsx`, `src/components/charts/MonteCarloPathsChart.tsx`
- New `src/hooks/useChartTheme.ts`
- `src/pages/OverviewPage.tsx`, `ModelsPage.tsx`, `BacktestPage.tsx`, `StressPage.tsx`, `ReportsPage.tsx`, `DataPage.tsx`
- `src/components/data/MarketDataFetcher.tsx`, `src/components/data/PriceChartPreview.tsx`, `src/components/data/AssetStatsGrid.tsx`
- `src/components/dashboard/KPICard.tsx`
- `src/index.css` (kpi-card light-mode tweak)

## Validation
- Resize preview to 375px and 768px; confirm sidebar opens via hamburger, no horizontal page scroll, tables scroll inside their card, all charts readable.
- Toggle Light Mode from sidebar; verify chart text/grid lines, correlation cell numbers, KPI cards, and reports section all have correct contrast.
