// Model Results Table component
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import type { ModelResult, ConfidenceLevel, TimeHorizon } from '@/lib/risk/types';
import { cn } from '@/lib/utils';

interface ModelResultsTableProps {
  results: ModelResult[];
  confidence?: ConfidenceLevel;
  horizon?: TimeHorizon;
  showCurrency?: boolean;
}

export function ModelResultsTable({
  results,
  confidence = 95,
  horizon = 1,
  showCurrency = true,
}: ModelResultsTableProps) {
  const formatValue = (value: number, isCurrency: boolean) => {
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return `${(value * 100).toFixed(2)}%`;
  };
  
  const filteredResults = results.map(r => ({
    ...r,
    result: r.results.find(res => res.confidence === confidence && res.horizon === horizon),
  })).filter(r => r.result);
  
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 overflow-hidden">
      <Table className="data-table">
        <TableHeader>
          <TableRow className="border-border/30 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Model</TableHead>
            <TableHead className="text-right text-muted-foreground">
              <div className="flex items-center justify-end gap-1">
                VaR ({confidence}%)
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Value at Risk: Maximum expected loss over the specified time horizon at the given confidence level. If VaR(95%) = $50K, there's a 5% chance of losing more than $50K.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className="text-right text-muted-foreground">
              <div className="flex items-center justify-end gap-1">
                ES ({confidence}%)
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Expected Shortfall (CVaR): Average loss when losses exceed VaR. ES is always ≥ VaR because it measures the expected loss in the tail, not just the threshold.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className="text-right text-muted-foreground">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredResults.map((r) => (
            <TableRow 
              key={r.model} 
              className="border-border/20 hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{r.modelName}</span>
                  {r.computeTime > 100 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {r.computeTime.toFixed(0)}ms
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className={cn(
                'text-right font-mono',
                'text-destructive'
              )}>
                {showCurrency 
                  ? formatValue(r.result!.var, true)
                  : `${r.result!.varPercent.toFixed(2)}%`
                }
              </TableCell>
              <TableCell className={cn(
                'text-right font-mono',
                'text-destructive'
              )}>
                {showCurrency 
                  ? formatValue(r.result!.es, true)
                  : `${r.result!.esPercent.toFixed(2)}%`
                }
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {horizon}D
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Full comparison table showing all confidence levels
interface FullModelComparisonProps {
  results: ModelResult[];
  horizon?: TimeHorizon;
}

export function FullModelComparison({ results, horizon = 1 }: FullModelComparisonProps) {
  const confidenceLevels: ConfidenceLevel[] = [90, 95, 97.5, 99];
  
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 overflow-hidden overflow-x-auto">
      <Table className="data-table min-w-[600px]">
        <TableHeader>
          <TableRow className="border-border/30 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Model</TableHead>
            {confidenceLevels.map(conf => (
              <TableHead key={conf} className="text-center text-muted-foreground">
                {conf}% VaR
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow 
              key={r.model} 
              className="border-border/20 hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-medium">{r.modelName}</TableCell>
              {confidenceLevels.map(conf => {
                const result = r.results.find(
                  res => res.confidence === conf && res.horizon === horizon
                );
                return (
                  <TableCell 
                    key={conf} 
                    className="text-center font-mono text-destructive"
                  >
                    {result ? `${result.varPercent.toFixed(2)}%` : '-'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
