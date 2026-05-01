// Stress Testing Page
import { useState, useMemo } from 'react';
import { useRisk } from '@/context/RiskContext';
import { EmptyState } from '@/components/ui/EmptyState';
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
  Zap, 
  TrendingDown, 
  Activity,
  ArrowDown,
  ArrowUp,
  LineChart,
} from 'lucide-react';
import { historicalSimulation } from '@/lib/risk/models';
import { mean, stdDev } from '@/lib/risk/statistics';
import { HistoricalReplayPanel } from '@/components/stress/HistoricalReplayPanel';
import { MonteCarloPathsChart } from '@/components/charts/MonteCarloPathsChart';
import { CorrelationStressPanel } from '@/components/stress/CorrelationStressPanel';
import { CombinedStressPanel } from '@/components/stress/CombinedStressPanel';

interface StressResult {
  name: string;
  description: string;
  baselineVaR95: number;
  stressedVaR95: number;
  deltaVaR: number;
  baselineES95: number;
  stressedES95: number;
  deltaES: number;
}

export default function StressPage() {
  const { assets, returns, dates, portfolioValue, assetReturns } = useRisk();
  
  const [shockPercent, setShockPercent] = useState(-5);
  const [volMultiplier, setVolMultiplier] = useState(1.5);
  const [mcPaths, setMcPaths] = useState(200);
  const [mcHorizon, setMcHorizon] = useState(30);
  
  const stressResults = useMemo(() => {
    if (returns.length === 0) return [];
    
    const results: StressResult[] = [];
    
    // Baseline
    const baseline = historicalSimulation(returns, portfolioValue);
    const baselineVaR95 = baseline.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    
    // 1. Single-day shock scenarios
    const shockScenarios = [-2, -5, -10];
    for (const shock of shockScenarios) {
      const shockedReturns = [...returns, shock / 100];
      const stressed = historicalSimulation(shockedReturns, portfolioValue);
      const stressedResult = stressed.results.find(r => r.confidence === 95 && r.horizon === 1)!;
      
      results.push({
        name: `${shock}% Shock`,
        description: `Single-day ${shock}% market decline`,
        baselineVaR95: baselineVaR95.var,
        stressedVaR95: stressedResult.var,
        deltaVaR: stressedResult.var - baselineVaR95.var,
        baselineES95: baselineVaR95.es,
        stressedES95: stressedResult.es,
        deltaES: stressedResult.es - baselineVaR95.es,
      });
    }
    
    // 2. Volatility multiplier scenario
    const mu = mean(returns);
    const sigma = stdDev(returns);
    const scaledReturns = returns.map(r => mu + (r - mu) * volMultiplier);
    const volStressed = historicalSimulation(scaledReturns, portfolioValue);
    const volResult = volStressed.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    
    results.push({
      name: `${volMultiplier}x Volatility`,
      description: `Volatility scaled by ${volMultiplier}x`,
      baselineVaR95: baselineVaR95.var,
      stressedVaR95: volResult.var,
      deltaVaR: volResult.var - baselineVaR95.var,
      baselineES95: baselineVaR95.es,
      stressedES95: volResult.es,
      deltaES: volResult.es - baselineVaR95.es,
    });
    
    // 3. Custom shock scenario
    const customShockedReturns = [...returns, shockPercent / 100];
    const customStressed = historicalSimulation(customShockedReturns, portfolioValue);
    const customResult = customStressed.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    
    results.push({
      name: `Custom ${shockPercent}% Shock`,
      description: `User-defined ${shockPercent}% scenario`,
      baselineVaR95: baselineVaR95.var,
      stressedVaR95: customResult.var,
      deltaVaR: customResult.var - baselineVaR95.var,
      baselineES95: baselineVaR95.es,
      stressedES95: customResult.es,
      deltaES: customResult.es - baselineVaR95.es,
    });
    
    return results;
  }, [returns, portfolioValue, shockPercent, volMultiplier]);
  
  if (assets.length === 0) {
    return <EmptyState />;
  }
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(value);
  
  const formatDelta = (value: number) => {
    const formatted = formatCurrency(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };
  
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stress Testing</h1>
        <p className="text-muted-foreground text-sm">
          Analyze portfolio risk under extreme market conditions
        </p>
      </div>
      
      {/* Scenario Builder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Custom Shock Scenario
            </CardTitle>
            <CardDescription>
              Simulate a single-day market shock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Shock Magnitude</Label>
                <span className="font-mono text-sm text-destructive">{shockPercent}%</span>
              </div>
              <Slider
                value={[shockPercent]}
                onValueChange={([v]) => setShockPercent(v)}
                min={-20}
                max={0}
                step={0.5}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A {shockPercent}% shock represents a single-day decline of that magnitude 
              being added to the historical sample.
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-warning" />
              Volatility Stress
            </CardTitle>
            <CardDescription>
              Scale historical volatility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Volatility Multiplier</Label>
                <span className="font-mono text-sm text-warning">{volMultiplier}x</span>
              </div>
              <Slider
                value={[volMultiplier]}
                onValueChange={([v]) => setVolMultiplier(v)}
                min={1}
                max={3}
                step={0.1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Scales all return deviations from mean by the multiplier. 
              A value of 2x doubles the volatility.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Results Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Stress Test Results
              </CardTitle>
              <CardDescription>
                Impact on 1-day 95% VaR and Expected Shortfall
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono self-start sm:self-auto">
              Portfolio: {formatCurrency(portfolioValue)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-scroll">
          <Table className="data-table">
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="w-[200px]">Scenario</TableHead>
                <TableHead className="text-right">Baseline VaR</TableHead>
                <TableHead className="text-right">Stressed VaR</TableHead>
                <TableHead className="text-right">Δ VaR</TableHead>
                <TableHead className="text-right">Baseline ES</TableHead>
                <TableHead className="text-right">Stressed ES</TableHead>
                <TableHead className="text-right">Δ ES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stressResults.map((result, i) => (
                <TableRow key={i} className="border-border/20">
                  <TableCell>
                    <div>
                      <span className="font-medium">{result.name}</span>
                      <p className="text-xs text-muted-foreground">{result.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(result.baselineVaR95)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {formatCurrency(result.stressedVaR95)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${result.deltaVaR > 0 ? 'text-destructive' : 'text-success'}`}>
                      {result.deltaVaR > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(result.deltaVaR)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(result.baselineES95)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-warning">
                    {formatCurrency(result.stressedES95)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${result.deltaES > 0 ? 'text-destructive' : 'text-success'}`}>
                      {result.deltaES > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(result.deltaES)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Historical Scenario Replay */}
      <HistoricalReplayPanel 
        returns={returns} 
        dates={dates} 
        portfolioValue={portfolioValue} 
      />
      
      {/* Monte Carlo Simulation */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            Monte Carlo Simulation Paths
          </CardTitle>
          <CardDescription>
            Visualize simulated portfolio value paths over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Number of Paths</Label>
                <span className="font-mono text-sm text-primary">{mcPaths}</span>
              </div>
              <Slider
                value={[mcPaths]}
                onValueChange={([v]) => setMcPaths(v)}
                min={50}
                max={500}
                step={50}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Horizon (Days)</Label>
                <span className="font-mono text-sm text-primary">{mcHorizon}</span>
              </div>
              <Slider
                value={[mcHorizon]}
                onValueChange={([v]) => setMcHorizon(v)}
                min={10}
                max={90}
                step={5}
              />
            </div>
          </div>
          
          <MonteCarloPathsChart
            returns={returns}
            portfolioValue={portfolioValue}
            numPaths={mcPaths}
            horizon={mcHorizon}
          />
        </CardContent>
      </Card>
      
      {/* Correlation Stress Testing */}
      <CorrelationStressPanel
        assetReturns={assetReturns}
        assetNames={assets.map(a => a.name)}
        weights={assets.map(a => a.weight)}
        portfolioValue={portfolioValue}
      />
      
      {/* Combined Stress Scenarios */}
      <CombinedStressPanel
        assetReturns={assetReturns}
        assetNames={assets.map(a => a.name)}
        weights={assets.map(a => a.weight)}
        portfolioValue={portfolioValue}
      />
      
      {/* Interpretation */}
      <Card className="bg-muted/30 border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Interpreting Stress Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Shock scenarios</strong> add extreme events to your historical sample, showing how tail risk changes.</li>
            <li>• <strong>Volatility stress</strong> scales all returns away from the mean, simulating sustained high-volatility regimes.</li>
            <li>• <strong>Historical replay</strong> uses actual data from crisis periods to stress test your current portfolio.</li>
            <li>• <strong>Monte Carlo paths</strong> show the range of possible portfolio outcomes under simulated market conditions.</li>
            <li>• <strong>Correlation stress</strong> simulates crisis conditions where all assets move together, reducing diversification benefits.</li>
            <li>• <strong>Combined stress</strong> shows the compounding effect of multiple simultaneous shocks.</li>
            <li>• <strong>Δ VaR/ES</strong> shows the increase in risk capital requirements under stressed conditions.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
