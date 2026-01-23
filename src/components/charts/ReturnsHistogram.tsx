// Plotly chart wrapper for Returns Histogram
import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { mean, stdDev } from '@/lib/risk/statistics';
import type { Data, Layout } from 'plotly.js';

interface ReturnsHistogramProps {
  returns: number[];
  varValue?: number;
  esValue?: number;
  title?: string;
  showFittedCurve?: boolean;
}

export function ReturnsHistogram({
  returns,
  varValue,
  esValue,
  title = 'Returns Distribution',
  showFittedCurve = true,
}: ReturnsHistogramProps) {
  const chartData = useMemo(() => {
    if (returns.length === 0) return { data: [], layout: {} };
    
    const mu = mean(returns);
    const sigma = stdDev(returns);
    
    // Convert to percentage for display
    const returnsPercent = returns.map(r => r * 100);
    
    const data: Data[] = [
      {
        x: returnsPercent,
        type: 'histogram',
        name: 'Returns',
        marker: {
          color: 'hsl(173, 80%, 45%)',
          line: {
            color: 'hsl(173, 80%, 35%)',
            width: 1,
          },
        },
        opacity: 0.7,
        histnorm: 'probability density',
      },
    ];
    
    // Add fitted normal curve
    if (showFittedCurve && sigma > 0) {
      const xMin = Math.min(...returnsPercent);
      const xMax = Math.max(...returnsPercent);
      const step = (xMax - xMin) / 100;
      const xFit: number[] = [];
      const yFit: number[] = [];
      
      for (let x = xMin; x <= xMax; x += step) {
        xFit.push(x);
        // Normal PDF scaled to percentage returns
        const z = (x / 100 - mu) / sigma;
        const pdf = Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI)) / 100;
        yFit.push(pdf);
      }
      
      data.push({
        x: xFit,
        y: yFit,
        type: 'scatter',
        mode: 'lines',
        name: 'Normal Fit',
        line: {
          color: 'hsl(190, 95%, 45%)',
          width: 2,
          dash: 'dash',
        },
      } as Data);
    }
    
    // Add VaR line
    if (varValue !== undefined) {
      const varPercent = -varValue * 100; // Negative because VaR is loss
      data.push({
        x: [varPercent, varPercent],
        y: [0, 1],
        type: 'scatter',
        mode: 'lines',
        name: 'VaR',
        line: {
          color: 'hsl(0, 72%, 55%)',
          width: 2,
        },
        yaxis: 'y2',
      } as Data);
    }
    
    // Add ES line
    if (esValue !== undefined) {
      const esPercent = -esValue * 100;
      data.push({
        x: [esPercent, esPercent],
        y: [0, 1],
        type: 'scatter',
        mode: 'lines',
        name: 'ES',
        line: {
          color: 'hsl(38, 92%, 50%)',
          width: 2,
          dash: 'dot',
        },
        yaxis: 'y2',
      } as Data);
    }
    
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
        title: { text: 'Returns (%)', standoff: 10 },
        gridcolor: 'hsl(217, 33%, 17%)',
        zerolinecolor: 'hsl(217, 33%, 25%)',
        tickformat: '.1f',
      },
      yaxis: {
        title: { text: 'Density', standoff: 10 },
        gridcolor: 'hsl(217, 33%, 17%)',
        zerolinecolor: 'hsl(217, 33%, 25%)',
      },
      yaxis2: {
        overlaying: 'y',
        visible: false,
        range: [0, 1],
      },
      legend: {
        x: 1,
        y: 1,
        xanchor: 'right',
        bgcolor: 'transparent',
      },
      hovermode: 'x unified',
      showlegend: true,
    };
    
    return { data, layout };
  }, [returns, varValue, esValue, title, showFittedCurve]);
  
  if (returns.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available
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
      style={{ width: '100%', height: '300px' }}
    />
  );
}
