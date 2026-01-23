// Correlation Stress Testing Component
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  GitBranch, 
  ArrowUp, 
  ArrowDown,
  Info,
  AlertTriangle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { historicalSimulation } from '@/lib/risk/models';
import { correlationMatrix, stdDev, mean, cholesky, randomNormal } from '@/lib/risk/statistics';

interface CorrelationStressPanelProps {
  assetReturns: number[][];
  assetNames: string[];
  weights: number[];
  portfolioValue: number;
}

export function CorrelationStressPanel({
  assetReturns,
  assetNames,
  weights,
  portfolioValue,
}: CorrelationStressPanelProps) {
  const [stressLevel, setStressLevel] = useState(0);

  // Calculate baseline correlation matrix
  const baselineCorr = useMemo(() => {
    if (assetReturns.length < 2) return null;
    return correlationMatrix(assetReturns);
  }, [assetReturns]);

  // Calculate stressed correlation matrix (push toward +1)
  const stressedCorr = useMemo(() => {
    if (!baselineCorr) return null;
    
    const n = baselineCorr.length;
    const stressed: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          stressed[i][j] = 1;
        } else {
          // Linear interpolation toward 1
          // stressLevel = 0 means baseline, stressLevel = 1 means all correlations = 1
          stressed[i][j] = baselineCorr[i][j] + stressLevel * (1 - baselineCorr[i][j]);
        }
      }
    }
    
    return stressed;
  }, [baselineCorr, stressLevel]);

  // Generate stressed portfolio returns using stressed correlations
  const stressedReturns = useMemo(() => {
    if (!stressedCorr || assetReturns.length < 2) return null;
    
    const n = assetReturns.length;
    const T = Math.min(...assetReturns.map(r => r.length));
    
    // Calculate asset statistics
    const means = assetReturns.map(r => mean(r));
    const stds = assetReturns.map(r => stdDev(r));
    
    // Build stressed covariance matrix
    const stressedCov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        stressedCov[i][j] = stressedCorr[i][j] * stds[i] * stds[j];
      }
    }
    
    // Cholesky decomposition
    let L: number[][];
    try {
      L = cholesky(stressedCov);
    } catch {
      // If Cholesky fails (matrix not positive definite), return null
      return null;
    }
    
    // Generate correlated returns
    const portfolioReturns: number[] = [];
    for (let t = 0; t < T; t++) {
      // Generate independent normals
      const z = Array(n).fill(0).map(() => randomNormal());
      
      // Apply Cholesky to get correlated
      const correlatedReturns: number[] = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          correlatedReturns[i] += L[i][j] * z[j];
        }
        correlatedReturns[i] += means[i];
      }
      
      // Calculate weighted portfolio return
      let portfolioRet = 0;
      for (let i = 0; i < n; i++) {
        portfolioRet += weights[i] * correlatedReturns[i];
      }
      portfolioReturns.push(portfolioRet);
    }
    
    return portfolioReturns;
  }, [stressedCorr, assetReturns, weights]);

  // Calculate baseline portfolio returns
  const baselinePortfolioReturns = useMemo(() => {
    if (assetReturns.length < 2) return [];
    const T = Math.min(...assetReturns.map(r => r.length));
    const returns: number[] = [];
    
    for (let t = 0; t < T; t++) {
      let ret = 0;
      for (let i = 0; i < assetReturns.length; i++) {
        ret += weights[i] * assetReturns[i][t];
      }
      returns.push(ret);
    }
    
    return returns;
  }, [assetReturns, weights]);

  // Calculate VaR comparison
  const comparison = useMemo(() => {
    if (baselinePortfolioReturns.length < 20 || !stressedReturns) return null;
    
    const baseline = historicalSimulation(baselinePortfolioReturns, portfolioValue);
    const stressed = historicalSimulation(stressedReturns, portfolioValue);
    
    const baseline95 = baseline.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    const stressed95 = stressed.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    const baseline99 = baseline.results.find(r => r.confidence === 99 && r.horizon === 1)!;
    const stressed99 = stressed.results.find(r => r.confidence === 99 && r.horizon === 1)!;
    
    return {
      baseline95,
      stressed95,
      baseline99,
      stressed99,
      deltaVaR95: stressed95.var - baseline95.var,
      deltaVaR99: stressed99.var - baseline99.var,
      deltaES95: stressed95.es - baseline95.es,
      deltaES99: stressed99.es - baseline99.es,
    };
  }, [baselinePortfolioReturns, stressedReturns, portfolioValue]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDelta = (value: number) => {
    const formatted = formatCurrency(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatCorr = (value: number) => value.toFixed(2);

  if (assetReturns.length < 2) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Correlation Stress Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Load a multi-asset portfolio to use correlation stress testing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Correlation Stress Testing
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  During market crises, asset correlations tend to increase toward +1 
                  ("correlation breakdown"). This test simulates how your portfolio 
                  risk changes as diversification benefits disappear.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Simulate the effect of increasing correlations during market stress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stress Level Slider */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Correlation Stress Level</Label>
              <Badge variant={stressLevel > 0.5 ? "destructive" : stressLevel > 0 ? "secondary" : "outline"}>
                {stressLevel === 0 ? 'Baseline' : stressLevel === 1 ? 'Full Crisis' : `${(stressLevel * 100).toFixed(0)}% Stressed`}
              </Badge>
            </div>
            <Slider
              value={[stressLevel]}
              onValueChange={([v]) => setStressLevel(v)}
              min={0}
              max={1}
              step={0.05}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Normal Market</span>
              <span>All Correlations → 1</span>
            </div>
          </div>
          
          {/* Educational Explanation */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Why this matters:</strong> In calm markets, assets behave independently. 
              But during crises (2008, COVID), correlations spike toward +1, meaning all assets 
              fall together. Your "diversified" portfolio suddenly acts like a single asset!
            </p>
          </div>
        </div>

        {/* Correlation Matrix Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Baseline Correlations */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Baseline Correlations</h4>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="w-20"></TableHead>
                    {assetNames.map((name, i) => (
                      <TableHead key={i} className="text-center font-mono">{name.slice(0, 6)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baselineCorr && assetNames.map((name, i) => (
                    <TableRow key={i} className="border-border/20">
                      <TableCell className="font-mono">{name.slice(0, 6)}</TableCell>
                      {baselineCorr[i].map((corr, j) => (
                        <TableCell 
                          key={j} 
                          className={`text-center font-mono ${
                            i === j ? 'text-muted-foreground' : 
                            corr > 0.5 ? 'text-warning' : 'text-success'
                          }`}
                        >
                          {formatCorr(corr)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Stressed Correlations */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Stressed Correlations 
              <span className="text-destructive ml-1">({(stressLevel * 100).toFixed(0)}%)</span>
            </h4>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="w-20"></TableHead>
                    {assetNames.map((name, i) => (
                      <TableHead key={i} className="text-center font-mono">{name.slice(0, 6)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stressedCorr && assetNames.map((name, i) => (
                    <TableRow key={i} className="border-border/20">
                      <TableCell className="font-mono">{name.slice(0, 6)}</TableCell>
                      {stressedCorr[i].map((corr, j) => (
                        <TableCell 
                          key={j} 
                          className={`text-center font-mono ${
                            i === j ? 'text-muted-foreground' : 
                            corr > 0.8 ? 'text-destructive' :
                            corr > 0.5 ? 'text-warning' : 'text-success'
                          }`}
                        >
                          {formatCorr(corr)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* VaR Impact */}
        {comparison && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Risk Impact</h4>
            <Table className="data-table">
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Stressed</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border/20">
                  <TableCell className="font-medium">VaR 95% (1D)</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(comparison.baseline95.var)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {formatCurrency(comparison.stressed95.var)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${comparison.deltaVaR95 > 0 ? 'text-destructive' : 'text-success'}`}>
                      {comparison.deltaVaR95 > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(comparison.deltaVaR95)}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20">
                  <TableCell className="font-medium">ES 95% (1D)</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(comparison.baseline95.es)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-warning">
                    {formatCurrency(comparison.stressed95.es)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${comparison.deltaES95 > 0 ? 'text-destructive' : 'text-success'}`}>
                      {comparison.deltaES95 > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(comparison.deltaES95)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Educational Note */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="text-sm font-semibold text-foreground mb-1">📊 Key Insight</h4>
          <p className="text-xs text-muted-foreground">
            Notice how VaR increases as correlations rise? This demonstrates the 
            <strong> diversification premium</strong> — the risk reduction you get from 
            holding uncorrelated assets. When correlations spike to 1, you lose this benefit entirely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
