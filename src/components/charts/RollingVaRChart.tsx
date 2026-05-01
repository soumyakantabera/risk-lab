// Rolling VaR/ES Time Series Chart
import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { BacktestResult } from '@/lib/risk/types';
import type { Data, Layout } from 'plotly.js';

interface RollingVaRChartProps {
  results: BacktestResult[];
  title?: string;
  showExceptions?: boolean;
}

export function RollingVaRChart({
  results,
  title = 'Rolling VaR Backtest',
  showExceptions = true,
}: RollingVaRChartProps) {
  const theme = useChartTheme();

  const chartData = useMemo(() => {
    if (results.length === 0) return { data: [], layout: {} };

    const dates = results.map(r => r.date);
    const actualReturns = results.map(r => r.actualReturn * 100);
    const varValues = results.map(r => -r.predictedVaR * 100);
    const esValues = results.map(r => -r.predictedES * 100);

    const exceptionDates = results.filter(r => r.exception).map(r => r.date);
    const exceptionReturns = results.filter(r => r.exception).map(r => r.actualReturn * 100);

    const data: Data[] = [
      {
        x: dates,
        y: actualReturns,
        type: 'scatter',
        mode: 'lines',
        name: 'Actual Returns',
        line: { color: 'hsl(173, 80%, 45%)', width: 1 },
        fill: 'tozeroy',
        fillcolor: 'hsla(173, 80%, 45%, 0.1)',
      },
      {
        x: dates,
        y: varValues,
        type: 'scatter',
        mode: 'lines',
        name: 'VaR Threshold',
        line: { color: 'hsl(0, 72%, 55%)', width: 2, dash: 'dash' },
      },
      {
        x: dates,
        y: esValues,
        type: 'scatter',
        mode: 'lines',
        name: 'ES Threshold',
        line: { color: 'hsl(38, 92%, 50%)', width: 2, dash: 'dot' },
      },
    ];

    if (showExceptions && exceptionDates.length > 0) {
      data.push({
        x: exceptionDates,
        y: exceptionReturns,
        type: 'scatter',
        mode: 'markers',
        name: 'Exceptions',
        marker: {
          color: 'hsl(0, 72%, 55%)',
          size: 8,
          symbol: 'x',
          line: { color: 'hsl(0, 72%, 40%)', width: 2 },
        },
      });
    }

    const layout: Partial<Layout> = {
      title: { text: title, font: { color: theme.fg, size: 14 } },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: theme.mutedFg, family: 'Inter, sans-serif' },
      margin: { l: 50, r: 30, t: 40, b: 50 },
      xaxis: {
        title: { text: 'Date', standoff: 10 },
        gridcolor: theme.grid,
        zerolinecolor: theme.zeroLine,
        type: 'date',
      },
      yaxis: {
        title: { text: 'Return (%)', standoff: 10 },
        gridcolor: theme.grid,
        zerolinecolor: theme.zeroLine,
        tickformat: '.2f',
      },
      legend: { x: 0, y: 1.15, orientation: 'h', bgcolor: 'transparent' },
      hovermode: 'x unified',
      showlegend: true,
    };

    return { data, layout };
  }, [results, title, showExceptions, theme]);

  if (results.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No backtest data available
      </div>
    );
  }

  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      config={{
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        responsive: true,
      }}
      style={{ width: '100%', height: '350px' }}
      useResizeHandler
    />
  );
}

interface ReturnsTimeSeriesProps {
  returns: number[];
  dates: Date[];
  title?: string;
}

export function ReturnsTimeSeries({
  returns,
  dates,
  title = 'Returns Time Series',
}: ReturnsTimeSeriesProps) {
  const theme = useChartTheme();

  const chartData = useMemo(() => {
    if (returns.length === 0) return { data: [], layout: {} };

    const returnsPercent = returns.map(r => r * 100);

    const data: Data[] = [
      {
        x: dates,
        y: returnsPercent,
        type: 'scatter',
        mode: 'lines',
        name: 'Returns',
        line: { color: 'hsl(173, 80%, 45%)', width: 1 },
        fill: 'tozeroy',
        fillcolor: 'hsla(173, 80%, 45%, 0.1)',
      },
    ];

    const layout: Partial<Layout> = {
      title: { text: title, font: { color: theme.fg, size: 14 } },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: theme.mutedFg, family: 'Inter, sans-serif' },
      margin: { l: 50, r: 30, t: 40, b: 50 },
      xaxis: {
        gridcolor: theme.grid,
        zerolinecolor: theme.zeroLine,
        type: 'date',
      },
      yaxis: {
        title: { text: 'Return (%)', standoff: 10 },
        gridcolor: theme.grid,
        zerolinecolor: theme.zeroLine,
        tickformat: '.2f',
      },
      hovermode: 'x unified',
      showlegend: false,
    };

    return { data, layout };
  }, [returns, dates, title, theme]);

  if (returns.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%', height: '250px' }}
      useResizeHandler
    />
  );
}
