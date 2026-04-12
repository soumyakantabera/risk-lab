import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, TrendingDown, Percent, DollarSign } from 'lucide-react';
import { FetchedAssetData } from '@/lib/api/marketData';

interface PriceChartPreviewProps {
  assets: FetchedAssetData[];
}

type ChartMode = 'percent' | 'price';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(190, 90%, 50%)',
  'hsl(350, 80%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(210, 80%, 55%)',
  'hsl(320, 70%, 55%)',
];

function calcMaxDrawdown(prices: number[]): number {
  let peak = prices[0] || 0;
  let maxDd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd * 100;
}

export function PriceChartPreview({ assets }: PriceChartPreviewProps) {
  const [mode, setMode] = useState<ChartMode>('percent');
  const [range, setRange] = useState<[number, number]>([0, 100]);

  // Find the global date array length for the slider
  const maxLen = useMemo(() => {
    return Math.max(...assets.map(a => a.data.length), 1);
  }, [assets]);

  const startIdx = Math.floor((range[0] / 100) * (maxLen - 1));
  const endIdx = Math.floor((range[1] / 100) * (maxLen - 1));

  const { percentTraces, priceTraces, stats, dateRange } = useMemo(() => {
    const percentData: Plotly.Data[] = [];
    const priceData: Plotly.Data[] = [];
    const assetStats: Array<{
      symbol: string;
      color: string;
      startPrice: number;
      endPrice: number;
      changePercent: number;
      annualizedVol: number;
      sharpeRatio: number;
      maxDrawdown: number;
    }> = [];
    let minDateStr = '';
    let maxDateStr = '';

    assets.forEach((asset, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      const sliced = asset.data.slice(startIdx, endIdx + 1);
      const dates = sliced.map(d => d.date);
      const prices = sliced.map(d => d.close);

      if (dates.length > 0) {
        const first = String(dates[0]);
        const last = String(dates[dates.length - 1]);
        if (!minDateStr || first < minDateStr) minDateStr = first;
        if (!maxDateStr || last > maxDateStr) maxDateStr = last;
      }

      const firstPrice = prices[0] || 1;
      const normalizedPrices = prices.map(p => ((p - firstPrice) / firstPrice) * 100);

      const dailyReturns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }

      const meanReturn = dailyReturns.length > 0
        ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
        : 0;
      const variance = dailyReturns.length > 1
        ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (dailyReturns.length - 1)
        : 0;
      const dailyVol = Math.sqrt(variance);
      const annualizedVol = dailyVol * Math.sqrt(252);
      const annualizedReturn = meanReturn * 252;
      const sharpeRatio = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;
      const maxDrawdown = calcMaxDrawdown(prices);

      percentData.push({
        x: dates, y: normalizedPrices, type: 'scatter', mode: 'lines',
        name: asset.symbol, line: { color, width: 2 },
        hovertemplate: `<b>${asset.symbol}</b><br>%{x|%b %d, %Y}<br>Change: %{y:.2f}%<extra></extra>`,
      });

      priceData.push({
        x: dates, y: prices, type: 'scatter', mode: 'lines',
        name: asset.symbol, line: { color, width: 2 },
        hovertemplate: `<b>${asset.symbol}</b><br>%{x|%b %d, %Y}<br>Price: $%{y:.2f}<extra></extra>`,
      });

      const lastPrice = prices[prices.length - 1] || 0;
      assetStats.push({
        symbol: asset.symbol, color, startPrice: firstPrice, endPrice: lastPrice,
        changePercent: ((lastPrice - firstPrice) / firstPrice) * 100,
        annualizedVol: annualizedVol * 100, sharpeRatio, maxDrawdown,
      });
    });

    return { percentTraces: percentData, priceTraces: priceData, stats: assetStats, dateRange: { min: minDate, max: maxDate } };
  }, [assets, startIdx, endIdx]);

  const traces = mode === 'percent' ? percentTraces : priceTraces;

  const layout: Partial<Plotly.Layout> = useMemo(() => ({
    autosize: true, height: 300,
    margin: { l: 60, r: 20, t: 20, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { family: 'inherit', color: 'hsl(var(--foreground))' },
    xaxis: {
      showgrid: false, showline: true, linecolor: 'hsl(var(--border))',
      tickformat: '%b %Y', tickfont: { size: 10 },
    },
    yaxis: {
      title: { text: mode === 'percent' ? 'Change %' : 'Price ($)', font: { size: 11 } },
      showgrid: true, gridcolor: 'hsl(var(--border) / 0.3)',
      zeroline: mode === 'percent', zerolinecolor: 'hsl(var(--muted-foreground))', zerolinewidth: 1,
      ticksuffix: mode === 'percent' ? '%' : '', tickprefix: mode === 'price' ? '$' : '',
      tickfont: { size: 10 },
    },
    legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10 } },
    hovermode: 'x unified',
  }), [mode]);

  const config: Partial<Plotly.Config> = { displayModeBar: false, responsive: true };

  if (assets.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Price Preview
          </CardTitle>
          <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
            <Button variant={mode === 'percent' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('percent')} className="h-7 px-2 text-xs gap-1">
              <Percent className="h-3 w-3" /> % Change
            </Button>
            <Button variant={mode === 'price' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('price')} className="h-7 px-2 text-xs gap-1">
              <DollarSign className="h-3 w-3" /> Price
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="w-full rounded-lg overflow-hidden bg-background/50">
          <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '300px' }} useResizeHandler />
        </div>

        {/* Date Range Slider */}
        <div className="space-y-1 px-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Date Range</span>
            <span>{dateRange.min && dateRange.max ? `${dateRange.min} — ${dateRange.max}` : 'Full range'}</span>
          </div>
          <Slider
            value={range}
            onValueChange={(v) => setRange(v as [number, number])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {stats.map(stat => (
            <div key={stat.symbol} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border" style={{ borderColor: stat.color }}>
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-sm">{stat.symbol}</span>
                {stat.changePercent >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
              </div>
              <Badge variant={stat.changePercent >= 0 ? 'default' : 'destructive'} className="text-[10px] justify-center">
                {stat.changePercent >= 0 ? '+' : ''}{stat.changePercent.toFixed(2)}%
              </Badge>
              <div className="text-[10px] text-muted-foreground">
                ${stat.startPrice.toFixed(2)} → ${stat.endPrice.toFixed(2)}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/50">
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">Vol (Ann)</div>
                  <div className="text-[10px] font-medium">{stat.annualizedVol.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">Sharpe</div>
                  <div className={`text-[10px] font-medium ${stat.sharpeRatio >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {stat.sharpeRatio.toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">Max DD</div>
                  <div className="text-[10px] font-medium text-red-500">
                    -{stat.maxDrawdown.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
