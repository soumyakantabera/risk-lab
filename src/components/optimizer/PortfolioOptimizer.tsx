// Portfolio Optimizer - Minimum VaR allocation with target return constraint
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Target, 
  Play, 
  TrendingUp,
  Shield,
  Info,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { mean, stdDev, percentile } from '@/lib/risk/statistics';

interface PortfolioOptimizerProps {
  assetReturns: number[][];
  assetNames: string[];
  currentWeights: number[];
  portfolioValue: number;
  onApplyWeights?: (weights: number[]) => void;
}

interface OptimizationResult {
  weights: number[];
  var95: number;
  es95: number;
  expectedReturn: number;
  volatility: number;
  sharpe: number;
}

export function PortfolioOptimizer({
  assetReturns,
  assetNames,
  currentWeights,
  portfolioValue,
  onApplyWeights,
}: PortfolioOptimizerProps) {
  const [targetReturn, setTargetReturn] = useState(10); // Annual %
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [iterations, setIterations] = useState(1000);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  // Calculate current portfolio stats
  const currentStats = useMemo(() => {
    if (assetReturns.length === 0) return null;
    
    const T = Math.min(...assetReturns.map(r => r.length));
    const portfolioReturns: number[] = [];
    
    for (let t = 0; t < T; t++) {
      let ret = 0;
      for (let i = 0; i < assetReturns.length; i++) {
        ret += currentWeights[i] * assetReturns[i][t];
      }
      portfolioReturns.push(ret);
    }
    
    const mu = mean(portfolioReturns);
    const sigma = stdDev(portfolioReturns);
    const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
    const var95Idx = Math.floor(portfolioReturns.length * 0.05);
    const var95 = -sortedReturns[var95Idx] * portfolioValue;
    const es95 = -mean(sortedReturns.slice(0, var95Idx + 1)) * portfolioValue;
    
    return {
      expectedReturn: mu * 252 * 100,
      volatility: sigma * Math.sqrt(252) * 100,
      var95,
      es95,
      sharpe: sigma > 0 ? ((mu * 252) - 0.02) / (sigma * Math.sqrt(252)) : 0,
    };
  }, [assetReturns, currentWeights, portfolioValue]);

  // Monte Carlo optimization
  const runOptimization = useCallback(async () => {
    if (assetReturns.length < 2) return;
    
    setIsOptimizing(true);
    setProgress(0);
    
    const T = Math.min(...assetReturns.map(r => r.length));
    const n = assetReturns.length;
    const dailyTargetReturn = targetReturn / 100 / 252;
    
    let bestResult: OptimizationResult | null = null;
    let bestVaR = Infinity;
    
    // Generate random portfolios
    for (let iter = 0; iter < iterations; iter++) {
      // Generate random weights that sum to 1
      const rawWeights = Array(n).fill(0).map(() => Math.random());
      const sum = rawWeights.reduce((a, b) => a + b, 0);
      const weights = rawWeights.map(w => w / sum);
      
      // Calculate portfolio returns
      const portfolioReturns: number[] = [];
      for (let t = 0; t < T; t++) {
        let ret = 0;
        for (let i = 0; i < n; i++) {
          ret += weights[i] * assetReturns[i][t];
        }
        portfolioReturns.push(ret);
      }
      
      const mu = mean(portfolioReturns);
      const sigma = stdDev(portfolioReturns);
      
      // Check if meets target return constraint
      if (mu >= dailyTargetReturn * 0.8) { // Allow some tolerance
        const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
        const var95Idx = Math.floor(portfolioReturns.length * 0.05);
        const var95 = -sortedReturns[var95Idx] * portfolioValue;
        const es95 = -mean(sortedReturns.slice(0, var95Idx + 1)) * portfolioValue;
        
        if (var95 < bestVaR) {
          bestVaR = var95;
          bestResult = {
            weights,
            var95,
            es95,
            expectedReturn: mu * 252 * 100,
            volatility: sigma * Math.sqrt(252) * 100,
            sharpe: sigma > 0 ? ((mu * 252) - 0.02) / (sigma * Math.sqrt(252)) : 0,
          };
        }
      }
      
      // Update progress every 100 iterations
      if (iter % 100 === 0) {
        setProgress((iter / iterations) * 100);
        await new Promise(r => setTimeout(r, 0)); // Allow UI update
      }
    }
    
    setResult(bestResult);
    setProgress(100);
    setIsOptimizing(false);
  }, [assetReturns, targetReturn, iterations, portfolioValue]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  if (assetReturns.length < 2) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Portfolio Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Load a multi-asset portfolio to use the optimizer</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Portfolio Optimizer
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            Monte Carlo
          </Badge>
        </CardTitle>
        <CardDescription>
          Find the minimum VaR allocation while meeting your target return
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Educational Intro */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">How It Works</h4>
              <p className="text-sm text-muted-foreground">
                The optimizer generates {iterations.toLocaleString()} random portfolio allocations, 
                filters those meeting your target return, and finds the one with the lowest VaR. 
                This is a simplified Monte Carlo approach to mean-variance optimization.
              </p>
            </div>
          </div>
        </div>

        {/* Current Portfolio Stats */}
        {currentStats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Portfolio</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Expected Return</p>
                <p className="font-mono text-lg">{formatPercent(currentStats.expectedReturn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volatility</p>
                <p className="font-mono text-lg text-warning">{formatPercent(currentStats.volatility)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">VaR 95%</p>
                <p className="font-mono text-lg text-destructive">{formatCurrency(currentStats.var95)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                <p className="font-mono text-lg">{currentStats.sharpe.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Optimization Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Target Annual Return</Label>
              <span className="font-mono text-sm text-primary">{targetReturn}%</span>
            </div>
            <Slider
              value={[targetReturn]}
              onValueChange={([v]) => setTargetReturn(v)}
              min={0}
              max={30}
              step={1}
              disabled={isOptimizing}
            />
            <p className="text-xs text-muted-foreground">
              Minimum expected annual return constraint
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Simulation Iterations</Label>
              <span className="font-mono text-sm">{iterations.toLocaleString()}</span>
            </div>
            <Slider
              value={[iterations]}
              onValueChange={([v]) => setIterations(v)}
              min={500}
              max={5000}
              step={500}
              disabled={isOptimizing}
            />
            <p className="text-xs text-muted-foreground">
              More iterations = better results, slower computation
            </p>
          </div>
        </div>

        {/* Run Button & Progress */}
        <div className="space-y-3">
          <Button 
            onClick={runOptimization} 
            disabled={isOptimizing}
            className="w-full"
          >
            {isOptimizing ? (
              <>Running Optimization...</>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Find Optimal Allocation
              </>
            )}
          </Button>
          
          {isOptimizing && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Testing {Math.floor(progress * iterations / 100).toLocaleString()} of {iterations.toLocaleString()} allocations...
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              <h4 className="text-sm font-semibold text-success">Optimal Portfolio Found!</h4>
            </div>
            
            {/* Optimal Weights */}
            <Table className="data-table">
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Current Weight</TableHead>
                  <TableHead className="text-right">Optimal Weight</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetNames.map((name, i) => {
                  const change = result.weights[i] - currentWeights[i];
                  return (
                    <TableRow key={i} className="border-border/20">
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatPercent(currentWeights[i] * 100)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        {formatPercent(result.weights[i] * 100)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={change >= 0 ? 'text-success' : 'text-destructive'}>
                          {change >= 0 ? '+' : ''}{formatPercent(change * 100)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <h5 className="text-xs text-muted-foreground mb-2">Current Portfolio</h5>
                <div className="space-y-1">
                  <p className="text-sm">VaR 95%: <span className="font-mono text-destructive">{formatCurrency(currentStats?.var95 || 0)}</span></p>
                  <p className="text-sm">Return: <span className="font-mono">{formatPercent(currentStats?.expectedReturn || 0)}</span></p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <h5 className="text-xs text-muted-foreground mb-2">Optimized Portfolio</h5>
                <div className="space-y-1">
                  <p className="text-sm">VaR 95%: <span className="font-mono text-success">{formatCurrency(result.var95)}</span></p>
                  <p className="text-sm">Return: <span className="font-mono">{formatPercent(result.expectedReturn)}</span></p>
                </div>
              </div>
            </div>

            {/* VaR Improvement */}
            {currentStats && (
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-sm text-center">
                  <strong className="text-success">
                    {formatCurrency(currentStats.var95 - result.var95)}
                  </strong>
                  {' '}VaR reduction ({((1 - result.var95 / currentStats.var95) * 100).toFixed(1)}% improvement)
                </p>
              </div>
            )}

            {/* Apply Button */}
            {onApplyWeights && (
              <Button 
                variant="outline" 
                onClick={() => onApplyWeights(result.weights)}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Apply Optimal Weights
              </Button>
            )}
          </div>
        )}

        {/* No Result Found */}
        {result === null && progress === 100 && !isOptimizing && (
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-center">
            <p className="text-sm text-warning">
              No portfolio found meeting the target return constraint. 
              Try lowering the target return or increasing iterations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
