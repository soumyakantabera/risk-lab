import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { AssetStat } from './PriceChartPreview';

interface AssetStatsGridProps {
  stats: AssetStat[];
}

export function AssetStatsGrid({ stats }: AssetStatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {stats.map(stat => (
        <div key={stat.symbol} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border" style={{ borderColor: stat.color }}>
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-sm">{stat.symbol}</span>
            {stat.changePercent >= 0 ? (
              <TrendingUp className="h-3 w-3 text-primary" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
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
              <div className={`text-[10px] font-medium ${stat.sharpeRatio >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {stat.sharpeRatio.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-muted-foreground">Max DD</div>
              <div className="text-[10px] font-medium text-destructive">
                -{stat.maxDrawdown.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
