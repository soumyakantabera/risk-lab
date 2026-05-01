// Monte Carlo simulation paths visualization
import Plot from 'react-plotly.js';
import { useChartTheme } from '@/hooks/useChartTheme';

interface MonteCarloPathsChartProps {
  returns: number[];
  portfolioValue: number;
  numPaths?: number;
  horizon?: number;
  title?: string;
}

export function MonteCarloPathsChart({
  returns,
  portfolioValue,
  numPaths = 100,
  horizon = 30,
  title = 'Monte Carlo Simulation Paths',
}: MonteCarloPathsChartProps) {
  const theme = useChartTheme();
  if (returns.length < 20) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        Need at least 20 data points for Monte Carlo simulation
      </div>
    );
  }

  // Calculate mean and std of returns
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const std = Math.sqrt(variance);

  // Generate random normal using Box-Muller
  const randomNormal = () => {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  // Generate simulation paths
  const paths: number[][] = [];
  const days = Array.from({ length: horizon + 1 }, (_, i) => i);

  for (let p = 0; p < numPaths; p++) {
    const path = [portfolioValue];
    let value = portfolioValue;
    
    for (let d = 0; d < horizon; d++) {
      const ret = mean + std * randomNormal();
      value = value * (1 + ret);
      path.push(value);
    }
    paths.push(path);
  }

  // Calculate percentiles at each time step
  const percentiles = {
    p5: [] as number[],
    p25: [] as number[],
    p50: [] as number[],
    p75: [] as number[],
    p95: [] as number[],
  };

  for (let d = 0; d <= horizon; d++) {
    const valuesAtDay = paths.map(p => p[d]).sort((a, b) => a - b);
    const n = valuesAtDay.length;
    percentiles.p5.push(valuesAtDay[Math.floor(n * 0.05)]);
    percentiles.p25.push(valuesAtDay[Math.floor(n * 0.25)]);
    percentiles.p50.push(valuesAtDay[Math.floor(n * 0.50)]);
    percentiles.p75.push(valuesAtDay[Math.floor(n * 0.75)]);
    percentiles.p95.push(valuesAtDay[Math.floor(n * 0.95)]);
  }

  // Sample paths for display (show 20 paths max)
  const displayPaths = paths.slice(0, Math.min(20, numPaths));

  const traces: Plotly.Data[] = [];

  // Add individual paths (semi-transparent)
  displayPaths.forEach((path, i) => {
    traces.push({
      x: days,
      y: path,
      type: 'scatter',
      mode: 'lines',
      line: { 
        color: 'rgba(100, 149, 237, 0.15)', 
        width: 1 
      },
      hoverinfo: 'skip',
      showlegend: false,
    });
  });

  // Add confidence bands
  traces.push({
    x: days,
    y: percentiles.p95,
    type: 'scatter',
    mode: 'lines',
    line: { color: 'transparent' },
    showlegend: false,
    hoverinfo: 'skip',
  });

  traces.push({
    x: days,
    y: percentiles.p5,
    type: 'scatter',
    mode: 'lines',
    fill: 'tonexty',
    fillcolor: 'rgba(59, 130, 246, 0.1)',
    line: { color: 'transparent' },
    name: '5th-95th Percentile',
  });

  traces.push({
    x: days,
    y: percentiles.p75,
    type: 'scatter',
    mode: 'lines',
    line: { color: 'transparent' },
    showlegend: false,
    hoverinfo: 'skip',
  });

  traces.push({
    x: days,
    y: percentiles.p25,
    type: 'scatter',
    mode: 'lines',
    fill: 'tonexty',
    fillcolor: 'rgba(59, 130, 246, 0.25)',
    line: { color: 'transparent' },
    name: '25th-75th Percentile',
  });

  // Add median line
  traces.push({
    x: days,
    y: percentiles.p50,
    type: 'scatter',
    mode: 'lines',
    line: { color: '#3b82f6', width: 2 },
    name: 'Median',
  });

  // Add starting value line
  traces.push({
    x: days,
    y: Array(horizon + 1).fill(portfolioValue),
    type: 'scatter',
    mode: 'lines',
    line: { color: '#6b7280', width: 1, dash: 'dash' },
    name: 'Initial Value',
  });

  // Calculate final distribution stats
  const finalValues = paths.map(p => p[horizon]);
  const minFinal = Math.min(...finalValues);
  const maxFinal = Math.max(...finalValues);
  const avgFinal = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;

  return (
    <div className="space-y-3">
      <Plot
        data={traces}
        layout={{
          title: title ? { text: title, font: { size: 14, color: theme.fg } } : undefined,
          height: 350,
          margin: { l: 60, r: 30, t: title ? 40 : 20, b: 50 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: theme.mutedFg, size: 11 },
          xaxis: {
            title: { text: 'Days', font: { size: 11 } },
            gridcolor: theme.grid,
            zerolinecolor: theme.zeroLine,
          },
          yaxis: {
            title: { text: 'Portfolio Value ($)', font: { size: 11 } },
            gridcolor: theme.grid,
            zerolinecolor: theme.zeroLine,
            tickformat: ',.0f',
          },
          legend: {
            x: 0,
            y: 1.1,
            orientation: 'h',
            font: { size: 10 },
          },
          hovermode: 'x unified',
        }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        style={{ width: '100%' }}
      />
      <div className="grid grid-cols-4 gap-4 text-xs px-2">
        <div className="text-center">
          <p className="text-muted-foreground">Min Final</p>
          <p className="font-mono text-destructive">
            ${minFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">5th Percentile</p>
          <p className="font-mono text-warning">
            ${percentiles.p5[horizon].toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Average</p>
          <p className="font-mono text-primary">
            ${avgFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Max Final</p>
          <p className="font-mono text-success">
            ${maxFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
}
