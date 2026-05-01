import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, TrendingDown, Percent, DollarSign, ArrowDownRight } from 'lucide-react';
import { FetchedAssetData } from '@/lib/api/marketData';
import { AssetStatsGrid } from './AssetStatsGrid';
import { CorrelationMatrix } from './CorrelationMatrix';

interface PriceChartPreviewProps {
  assets: FetchedAssetData[];
}

type ChartMode = 'percent' | 'price' | 'drawdown';

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

function calcDrawdownSeries(prices: number[]): number[] {
  const dd: number[] = [];
  let peak = prices[0] || 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    dd.push(((p - peak) / peak) * 100);
  }
  return dd;
}

export interface AssetStat {
  symbol: string;
  color: string;
  startPrice: number;
  endPrice: number;
  changePercent: number;
  annualizedVol: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export function PriceChartPreview({ assets }: PriceChartPreviewProps) {
  const [mode, setMode] = useState<ChartMode>('percent');
  const [range, setRange] = useState<[number, number]>([0, 100]);

  const maxLen = useMemo(() => Math.max(...assets.map(a => a.data.length), 1), [assets]);

  const startIdx = Math.floor((range[0] / 100) * (maxLen - 1));
  const endIdx = Math.floor((range[1] / 100) * (maxLen - 1));

  const { percentTraces, priceTraces, drawdownTraces, stats, dateRange } = useMemo(() => {
    const percentData: Plotly.Data[] = [];
    const priceData: Plotly.Data[] = [];
    const ddData: Plotly.Data[] = [];
    const assetStats: AssetStat[] = [];
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
      const drawdownSeries = calcDrawdownSeries(prices);

      const dailyReturns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }

      const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
      const variance = dailyReturns.length > 1 ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (dailyReturns.length - 1) : 0;
      const dailyVol = Math.sqrt(variance);
      const annualizedVol = dailyVol * Math.sqrt(252);
      const sharpeRatio = annualizedVol > 0 ? (meanReturn * 252) / annualizedVol : 0;
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

      ddData.push({
        x: dates, y: drawdownSeries, type: 'scatter', mode: 'lines',
        name: asset.symbol, line: { color, width: 2 },
        fill: 'tozeroy',
        fillcolor: color.replace(')', ' / 0.1)').replace('hsl(', 'hsla('),
        hovertemplate: `<b>${asset.symbol}</b><br>%{x|%b %d, %Y}<br>Drawdown: %{y:.2f}%<extra></extra>`,
      });

      const lastPrice = prices[prices.length - 1] || 0;
      assetStats.push({
        symbol: asset.symbol, color, startPrice: firstPrice, endPrice: lastPrice,
        changePercent: ((lastPrice - firstPrice) / firstPrice) * 100,
        annualizedVol: annualizedVol * 100, sharpeRatio, maxDrawdown,
      });
    });

    return { percentTraces: percentData, priceTraces: priceData, drawdownTraces: ddData, stats: assetStats, dateRange: { min: minDateStr, max: maxDateStr } };
  }, [assets, startIdx, endIdx]);

  const traces = mode === 'percent' ? percentTraces : mode === 'price' ? priceTraces : drawdownTraces;

  const yAxisConfig = useMemo(() => {
    if (mode === 'percent') return { title: 'Change %', ticksuffix: '%', tickprefix: '', zeroline: true };
    if (mode === 'price') return { title: 'Price ($)', ticksuffix: '', tickprefix: '$', zeroline: false };
    return { title: 'Drawdown %', ticksuffix: '%', tickprefix: '', zeroline: true };
  }, [mode]);

  const layout: Partial<Plotly.Layout> = useMemo(() => ({
    autosize: true, height: 300,
    margin: { l: 60, r: 20, t: 20, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { family: 'inherit', color: 'hsl(var(--foreground))' },
    xaxis: { showgrid: false, showline: true, linecolor: 'hsl(var(--border))', tickformat: '%b %Y', tickfont: { size: 10 } },
    yaxis: {
      title: { text: yAxisConfig.title, font: { size: 11 } },
      showgrid: true, gridcolor: 'hsl(var(--border) / 0.3)',
      zeroline: yAxisConfig.zeroline, zerolinecolor: 'hsl(var(--muted-foreground))', zerolinewidth: 1,
      ticksuffix: yAxisConfig.ticksuffix, tickprefix: yAxisConfig.tickprefix, tickfont: { size: 10 },
    },
    legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10 } },
    hovermode: 'x unified',
  }), [yAxisConfig]);

  const config: Partial<Plotly.Config> = { displayModeBar: false, responsive: true };

  if (assets.length === 0) return null;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Price Preview
            </CardTitle>
            <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg flex-wrap">
              <Button variant={mode === 'percent' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('percent')} className="h-7 px-2 text-xs gap-1">
                <Percent className="h-3 w-3" /> % Change
              </Button>
              <Button variant={mode === 'price' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('price')} className="h-7 px-2 text-xs gap-1">
                <DollarSign className="h-3 w-3" /> Price
              </Button>
              <Button variant={mode === 'drawdown' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('drawdown')} className="h-7 px-2 text-xs gap-1">
                <ArrowDownRight className="h-3 w-3" /> Drawdown
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
              min={0} max={100} step={1}
              className="w-full"
            />
          </div>

          {/* Stats Summary */}
          <AssetStatsGrid stats={stats} />
        </CardContent>
      </Card>

      {/* Correlation Matrix */}
      {assets.length >= 2 && (
        <CorrelationMatrix assets={assets} startIdx={startIdx} endIdx={endIdx} colors={CHART_COLORS} />
      )}
    </div>
  );
}
