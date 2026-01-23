// KPI Card component for dashboard
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  tooltip?: string;
  format?: 'currency' | 'percent' | 'number';
  className?: string;
  accentColor?: 'primary' | 'success' | 'warning' | 'destructive';
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  tooltip,
  className,
  accentColor = 'primary',
}: KPICardProps) {
  const accentClasses = {
    primary: 'before:bg-gradient-to-r before:from-primary before:to-accent',
    success: 'before:bg-gradient-to-r before:from-success before:to-emerald-400',
    warning: 'before:bg-gradient-to-r before:from-warning before:to-amber-400',
    destructive: 'before:bg-gradient-to-r before:from-destructive before:to-red-400',
  };
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  
  const content = (
    <div
      className={cn(
        'kpi-card relative overflow-hidden rounded-lg border border-border/30 bg-card p-5 transition-all hover:border-border/50',
        'before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5',
        accentClasses[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="metric-label">{title}</p>
          <p className="metric-value text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
  
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return content;
}
