// Combined CVaR Stress Scenarios - Volatility + Correlation breakdown
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Flame, 
  ArrowUp, 
  ArrowDown,
  Info,
  AlertTriangle,
  TrendingDown,
  GitBranch,
  Activity,
} from 'lucide-react';
import { historicalSimulation } from '@/lib/risk/models';
import { mean, stdDev, correlationMatrix, cholesky, randomNormal } from '@/lib/risk/statistics';

interface CombinedStressPanelProps {
  assetReturns: number[][];
  assetNames: string[];
  weights: number[];
  portfolioValue: number;
}

interface StressScenario {
  name: string;
  description: string;
  volMultiplier: number;
  corrStress: number;
  icon: 'mild' | 'moderate' | 'severe' | 'extreme';
}

const PRESET_SCENARIOS: StressScenario[] = [
  {
    name: 'Mild Stress',
    description: 'Minor market turbulence',
    volMultiplier: 1.25,
    corrStress: 0.2,
    icon: 'mild',
  },
  {
    name: 'Moderate Stress',
    description: 'Significant market downturn',
    volMultiplier: 1.5,
    corrStress: 0.4,
    icon: 'moderate',
  },
  {
    name: 'Severe Stress',
    description: 'Major financial crisis',
    volMultiplier: 2.0,
    corrStress: 0.7,
    icon: 'severe',
  },
  {
    name: 'Extreme Stress',
    description: '2008-level market collapse',
    volMultiplier: 3.0,
    corrStress: 0.9,
    icon: 'extreme',
  },
];

export function CombinedStressPanel({
  assetReturns,
  assetNames,
  weights,
  portfolioValue,
}: CombinedStressPanelProps) {
  const [volMultiplier, setVolMultiplier] = useState(1.5);
  const [corrStress, setCorrStress] = useState(0.5);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Calculate baseline metrics
  const baseline = useMemo(() => {
    if (assetReturns.length < 2) return null;
    
    const T = Math.min(...assetReturns.map(r => r.length));
    const portfolioReturns: number[] = [];
    
    for (let t = 0; t < T; t++) {
      let ret = 0;
      for (let i = 0; i < assetReturns.length; i++) {
        ret += weights[i] * assetReturns[i][t];
      }
      portfolioReturns.push(ret);
    }
    
    const result = historicalSimulation(portfolioReturns, portfolioValue);
    const r95 = result.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    const r99 = result.results.find(r => r.confidence === 99 && r.horizon === 1)!;
    
    return {
      returns: portfolioReturns,
      var95: r95.var,
      var99: r99.var,
      es95: r95.es,
      es99: r99.es,
      corrMatrix: correlationMatrix(assetReturns),
    };
  }, [assetReturns, weights, portfolioValue]);

  // Calculate stressed metrics with combined shocks
  const stressedMetrics = useMemo(() => {
    if (!baseline || assetReturns.length < 2) return null;
    
    const n = assetReturns.length;
    const T = Math.min(...assetReturns.map(r => r.length));
    
    // Calculate asset statistics
    const means = assetReturns.map(r => mean(r));
    const stds = assetReturns.map(r => stdDev(r));
    
    // Apply volatility stress
    const stressedStds = stds.map(s => s * volMultiplier);
    
    // Apply correlation stress (push toward +1)
    const stressedCorr: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          stressedCorr[i][j] = 1;
        } else {
          stressedCorr[i][j] = baseline.corrMatrix[i][j] + corrStress * (1 - baseline.corrMatrix[i][j]);
        }
      }
    }
    
    // Build stressed covariance matrix
    const stressedCov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        stressedCov[i][j] = stressedCorr[i][j] * stressedStds[i] * stressedStds[j];
      }
    }
    
    // Generate stressed returns via Cholesky
    let L: number[][];
    try {
      L = cholesky(stressedCov);
    } catch {
      return null;
    }
    
    const stressedPortfolioReturns: number[] = [];
    for (let t = 0; t < T; t++) {
      const z = Array(n).fill(0).map(() => randomNormal());
      const correlatedReturns: number[] = Array(n).fill(0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          correlatedReturns[i] += L[i][j] * z[j];
        }
        correlatedReturns[i] += means[i];
      }
      
      let portfolioRet = 0;
      for (let i = 0; i < n; i++) {
        portfolioRet += weights[i] * correlatedReturns[i];
      }
      stressedPortfolioReturns.push(portfolioRet);
    }
    
    const result = historicalSimulation(stressedPortfolioReturns, portfolioValue);
    const r95 = result.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    const r99 = result.results.find(r => r.confidence === 99 && r.horizon === 1)!;
    
    return {
      var95: r95.var,
      var99: r99.var,
      es95: r95.es,
      es99: r99.es,
      stressedCorr,
      volIncrease: (volMultiplier - 1) * 100,
      corrIncrease: corrStress * 100,
    };
  }, [baseline, assetReturns, weights, portfolioValue, volMultiplier, corrStress]);

  const applyPreset = (scenario: StressScenario) => {
    setVolMultiplier(scenario.volMultiplier);
    setCorrStress(scenario.corrStress);
    setSelectedPreset(scenario.name);
  };

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

  const getIconColor = (icon: string) => {
    switch (icon) {
      case 'mild': return 'text-success';
      case 'moderate': return 'text-warning';
      case 'severe': return 'text-orange-500';
      case 'extreme': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  if (assetReturns.length < 2) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" />
            Combined Stress Scenarios (CVaR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Load a multi-asset portfolio to use combined stress testing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-destructive" />
          Combined Stress Scenarios
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Real crises combine multiple shocks: volatility spikes AND correlations 
                  increase simultaneously. This test shows the compounded effect on your portfolio.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Simulate volatility shocks and correlation breakdown together
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Scenarios */}
        <div className="space-y-2">
          <Label>Quick Presets</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PRESET_SCENARIOS.map(scenario => (
              <button
                key={scenario.name}
                onClick={() => applyPreset(scenario)}
                className={`p-3 rounded-lg border text-left transition-all hover:border-primary/50 ${
                  selectedPreset === scenario.name 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 bg-card/50'
                }`}
              >
                <Flame className={`h-4 w-4 mb-1 ${getIconColor(scenario.icon)}`} />
                <p className="font-medium text-sm">{scenario.name}</p>
                <p className="text-xs text-muted-foreground">{scenario.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-warning" />
              <div className="flex-1 flex justify-between items-center">
                <Label>Volatility Multiplier</Label>
                <Badge variant={volMultiplier > 2 ? "destructive" : "secondary"}>
                  {volMultiplier.toFixed(1)}x
                </Badge>
              </div>
            </div>
            <Slider
              value={[volMultiplier]}
              onValueChange={([v]) => {
                setVolMultiplier(v);
                setSelectedPreset(null);
              }}
              min={1}
              max={4}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Scales all asset volatilities by this factor
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <div className="flex-1 flex justify-between items-center">
                <Label>Correlation Stress</Label>
                <Badge variant={corrStress > 0.7 ? "destructive" : "secondary"}>
                  {(corrStress * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
            <Slider
              value={[corrStress]}
              onValueChange={([v]) => {
                setCorrStress(v);
                setSelectedPreset(null);
              }}
              min={0}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              Pushes all correlations toward +1
            </p>
          </div>
        </div>

        {/* Visual Stress Indicator */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-success/10 via-warning/10 to-destructive/10 border border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stress Intensity</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(level => {
                const intensity = (volMultiplier - 1) / 3 * 0.5 + corrStress * 0.5;
                const isActive = level <= Math.ceil(intensity * 5);
                return (
                  <div
                    key={level}
                    className={`w-3 h-6 rounded transition-colors ${
                      isActive 
                        ? level <= 2 ? 'bg-success' : level <= 4 ? 'bg-warning' : 'bg-destructive'
                        : 'bg-muted'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Table */}
        {baseline && stressedMetrics && (
          <Table className="data-table">
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Risk Metric</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
                <TableHead className="text-right">Stressed</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">% Increase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/20">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    VaR 95% (1D)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum expected loss at 95% confidence</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatCurrency(baseline.var95)}
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  {formatCurrency(stressedMetrics.var95)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span className="flex items-center justify-end gap-1 text-destructive">
                    <ArrowUp className="h-3 w-3" />
                    {formatDelta(stressedMetrics.var95 - baseline.var95)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  +{((stressedMetrics.var95 / baseline.var95 - 1) * 100).toFixed(0)}%
                </TableCell>
              </TableRow>
              <TableRow className="border-border/20">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    ES 95% (CVaR)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Expected loss in the worst 5% of scenarios</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatCurrency(baseline.es95)}
                </TableCell>
                <TableCell className="text-right font-mono text-warning">
                  {formatCurrency(stressedMetrics.es95)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span className="flex items-center justify-end gap-1 text-destructive">
                    <ArrowUp className="h-3 w-3" />
                    {formatDelta(stressedMetrics.es95 - baseline.es95)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-warning">
                  +{((stressedMetrics.es95 / baseline.es95 - 1) * 100).toFixed(0)}%
                </TableCell>
              </TableRow>
              <TableRow className="border-border/20">
                <TableCell className="font-medium">VaR 99% (1D)</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatCurrency(baseline.var99)}
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  {formatCurrency(stressedMetrics.var99)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span className="flex items-center justify-end gap-1 text-destructive">
                    <ArrowUp className="h-3 w-3" />
                    {formatDelta(stressedMetrics.var99 - baseline.var99)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  +{((stressedMetrics.var99 / baseline.var99 - 1) * 100).toFixed(0)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Key Insight */}
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">⚠️ Compounding Effect</h4>
              <p className="text-sm text-muted-foreground">
                Notice how the combined stress ({volMultiplier.toFixed(1)}x vol + {(corrStress * 100).toFixed(0)}% corr stress) 
                produces a larger VaR increase than either shock alone. This demonstrates why 
                diversification fails precisely when you need it most — during market crises.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
