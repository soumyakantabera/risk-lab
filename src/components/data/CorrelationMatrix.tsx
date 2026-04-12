import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3 } from 'lucide-react';
import { FetchedAssetData } from '@/lib/api/marketData';

interface CorrelationMatrixProps {
  assets: FetchedAssetData[];
  startIdx: number;
  endIdx: number;
  colors: string[];
}

function computeReturns(prices: number[]): number[] {
  const ret: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    ret.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return ret;
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den > 0 ? num / den : 0;
}

export function CorrelationMatrix({ assets, startIdx, endIdx }: CorrelationMatrixProps) {
  const { matrix, symbols } = useMemo(() => {
    const syms = assets.map(a => a.symbol);
    const returnSeries = assets.map(a => {
      const sliced = a.data.slice(startIdx, endIdx + 1);
      return computeReturns(sliced.map(d => d.close));
    });

    const n = syms.length;
    const mat: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(i === j ? 1 : pearsonCorrelation(returnSeries[i], returnSeries[j]));
      }
      mat.push(row);
    }

    return { matrix: mat, symbols: syms };
  }, [assets, startIdx, endIdx]);

  // Create annotation text
  const annotations: Partial<Plotly.Annotations>[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = 0; j < symbols.length; j++) {
      annotations.push({
        x: symbols[j],
        y: symbols[i],
        text: matrix[i][j].toFixed(2),
        showarrow: false,
        font: { size: 11, color: Math.abs(matrix[i][j]) > 0.5 ? 'white' : 'hsl(var(--foreground))' },
      });
    }
  }

  const trace: Plotly.Data = {
    z: matrix,
    x: symbols,
    y: symbols,
    type: 'heatmap',
    colorscale: [
      [0, 'hsl(350, 80%, 40%)'],
      [0.5, 'hsl(var(--muted))'],
      [1, 'hsl(142, 76%, 36%)'],
    ],
    zmin: -1,
    zmax: 1,
    showscale: true,
    colorbar: {
      title: { text: 'ρ', font: { size: 12 } },
      thickness: 12,
      len: 0.8,
      tickfont: { size: 10 },
    },
    hovertemplate: '<b>%{x}</b> vs <b>%{y}</b><br>ρ = %{z:.3f}<extra></extra>',
  };

  const layout: Partial<Plotly.Layout> = {
    autosize: true,
    height: 280,
    margin: { l: 60, r: 60, t: 10, b: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'inherit', color: 'hsl(var(--foreground))' },
    xaxis: { tickfont: { size: 10 }, side: 'bottom' },
    yaxis: { tickfont: { size: 10 }, autorange: 'reversed' },
    annotations,
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          Return Correlation Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-lg overflow-hidden bg-background/50">
          <Plot
            data={[trace]}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%', height: '280px' }}
            useResizeHandler
          />
        </div>
      </CardContent>
    </Card>
  );
}
