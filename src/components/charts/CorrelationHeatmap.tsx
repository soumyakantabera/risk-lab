// Correlation Heatmap Chart
import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';

interface CorrelationHeatmapProps {
  correlationMatrix: number[][] | null;
  labels: string[];
  title?: string;
}

export function CorrelationHeatmap({
  correlationMatrix,
  labels,
  title = 'Correlation Matrix',
}: CorrelationHeatmapProps) {
  const chartData = useMemo(() => {
    if (!correlationMatrix || correlationMatrix.length === 0) {
      return { data: [], layout: {} };
    }
    
    const data: Data[] = [
      {
        z: correlationMatrix,
        x: labels,
        y: labels,
        type: 'heatmap',
        colorscale: [
          [0, 'hsl(0, 72%, 55%)'],      // Negative: red
          [0.5, 'hsl(222, 47%, 11%)'],  // Zero: dark
          [1, 'hsl(173, 80%, 45%)'],    // Positive: teal
        ],
        zmin: -1,
        zmax: 1,
        hovertemplate: '%{x} vs %{y}: %{z:.3f}<extra></extra>',
        showscale: true,
        colorbar: {
          title: { text: 'Correlation', side: 'right' },
          titlefont: { color: 'hsl(215, 20%, 55%)' },
          tickfont: { color: 'hsl(215, 20%, 55%)' },
        },
      } as Data,
    ];
    
    const layout: Partial<Layout> = {
      title: {
        text: title,
        font: { color: 'hsl(210, 40%, 98%)', size: 14 },
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: 'hsl(215, 20%, 55%)', family: 'Inter, sans-serif' },
      margin: { l: 100, r: 80, t: 40, b: 80 },
      xaxis: {
        side: 'bottom',
        tickangle: -45,
      },
      yaxis: {
        autorange: 'reversed',
      },
      annotations: correlationMatrix.flatMap((row, i) =>
        row.map((val, j) => ({
          x: labels[j],
          y: labels[i],
          text: val.toFixed(2),
          font: { color: 'white', size: 12 },
          showarrow: false,
        }))
      ),
    };
    
    return { data, layout };
  }, [correlationMatrix, labels, title]);
  
  if (!correlationMatrix || correlationMatrix.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        Multi-asset data required for correlation analysis
      </div>
    );
  }
  
  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      style={{ width: '100%', height: '300px' }}
    />
  );
}

// Drawdown Chart
interface DrawdownChartProps {
  returns: number[];
  dates: Date[];
  title?: string;
}

export function DrawdownChart({
  returns,
  dates,
  title = 'Drawdown',
}: DrawdownChartProps) {
  const chartData = useMemo(() => {
    if (returns.length === 0) return { data: [], layout: {} };
    
    // Calculate drawdown series
    const drawdowns: number[] = [];
    let peak = 1;
    let cumulative = 1;
    
    for (const r of returns) {
      cumulative *= (1 + r);
      if (cumulative > peak) peak = cumulative;
      drawdowns.push((peak - cumulative) / peak * 100);
    }
    
    const data: Data[] = [
      {
        x: dates.slice(0, drawdowns.length),
        y: drawdowns.map(d => -d), // Negative for visual display
        type: 'scatter',
        mode: 'lines',
        name: 'Drawdown',
        line: {
          color: 'hsl(0, 72%, 55%)',
          width: 1,
        },
        fill: 'tozeroy',
        fillcolor: 'hsla(0, 72%, 55%, 0.2)',
      },
    ];
    
    const layout: Partial<Layout> = {
      title: {
        text: title,
        font: { color: 'hsl(210, 40%, 98%)', size: 14 },
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: 'hsl(215, 20%, 55%)', family: 'Inter, sans-serif' },
      margin: { l: 50, r: 30, t: 40, b: 50 },
      xaxis: {
        gridcolor: 'hsl(217, 33%, 17%)',
        type: 'date',
      },
      yaxis: {
        title: { text: 'Drawdown (%)', standoff: 10 },
        gridcolor: 'hsl(217, 33%, 17%)',
        zerolinecolor: 'hsl(217, 33%, 25%)',
        tickformat: '.1f',
      },
      hovermode: 'x unified',
      showlegend: false,
    };
    
    return { data, layout };
  }, [returns, dates, title]);
  
  if (returns.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }
  
  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      style={{ width: '100%', height: '200px' }}
    />
  );
}
