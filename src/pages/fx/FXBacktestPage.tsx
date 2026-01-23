// FX Backtesting - Model validation and monitoring
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  TestTube, 
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useFX } from '@/context/FXContext';
import Plot from 'react-plotly.js';

export default function FXBacktestPage() {
  const { fxReturns, regime } = useFX();
  
  const eurusdReturns = fxReturns.get('EURUSD') || [];
  
  // Run rolling backtest
  const backtestResults = useMemo(() => {
    if (eurusdReturns.length < 100) return null;
    
    const windowSize = 250;
    const results: Array<{
      index: number;
      predictedVar: number;
      actualLoss: number;
      isException: boolean;
    }> = [];
    
    for (let i = windowSize; i < eurusdReturns.length; i++) {
      const window = eurusdReturns.slice(i - windowSize, i);
      const sorted = [...window].map(r => -r).sort((a, b) => b - a);
      const var99 = sorted[Math.floor(sorted.length * 0.01)];
      
      const actualLoss = -eurusdReturns[i];
      const isException = actualLoss > var99;
      
      results.push({
        index: i,
        predictedVar: var99 * 100,
        actualLoss: actualLoss * 100,
        isException,
      });
    }
    
    return results;
  }, [eurusdReturns]);
  
  // Calculate backtest statistics
  const backtestStats = useMemo(() => {
    if (!backtestResults) return null;
    
    const exceptions = backtestResults.filter(r => r.isException).length;
    const total = backtestResults.length;
    const exceptionRate = (exceptions / total) * 100;
    const expectedRate = 1; // 99% VaR → 1% exceptions expected
    
    // Kupiec POF test (simplified)
    const p = 0.01;
    const n = total;
    const x = exceptions;
    const expectedExceptions = n * p;
    const lr = 2 * (x * Math.log(x / expectedExceptions) + (n - x) * Math.log((n - x) / (n - expectedExceptions)));
    const kupiecPValue = lr < 3.84 ? 'Pass' : 'Fail'; // Chi-sq 95%
    
    // Traffic light
    let trafficLight: 'green' | 'yellow' | 'red' = 'green';
    if (exceptions > expectedExceptions * 1.5) trafficLight = 'yellow';
    if (exceptions > expectedExceptions * 2) trafficLight = 'red';
    
    return {
      exceptions,
      total,
      exceptionRate,
      expectedRate,
      expectedExceptions: Math.round(expectedExceptions),
      kupiecPValue,
      trafficLight,
    };
  }, [backtestResults]);
  
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  
  const trafficLightColors = {
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backtesting & Monitoring</h1>
        <p className="text-muted-foreground">
          Model validation and exception tracking
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Observations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backtestStats?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VaR Exceptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backtestStats?.exceptions || 0}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (expected: {backtestStats?.expectedExceptions || 0})
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exception Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(backtestStats?.exceptionRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Target: 1.00%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Traffic Light</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className={`text-sm capitalize ${trafficLightColors[backtestStats?.trafficLight || 'green']}`}>
              {backtestStats?.trafficLight || 'N/A'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Basel regulatory zone</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Backtest Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Rolling VaR Backtest
          </CardTitle>
          <CardDescription>
            Actual losses vs predicted VaR (99%) - EUR/USD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backtestResults ? (
            <Plot
              data={[
                {
                  y: backtestResults.map(r => r.actualLoss),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Actual Loss',
                  line: { color: 'hsl(var(--primary))', width: 1 },
                },
                {
                  y: backtestResults.map(r => r.predictedVar),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'VaR (99%)',
                  line: { color: 'hsl(350, 80%, 55%)', width: 2, dash: 'dash' },
                },
                {
                  x: backtestResults
                    .map((r, i) => r.isException ? i : null)
                    .filter(i => i !== null),
                  y: backtestResults
                    .filter(r => r.isException)
                    .map(r => r.actualLoss),
                  type: 'scatter',
                  mode: 'markers',
                  name: 'Exception',
                  marker: { color: 'hsl(350, 80%, 55%)', size: 8 },
                },
              ]}
              layout={{
                autosize: true,
                height: 350,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'hsl(var(--foreground))' },
                xaxis: { showgrid: false, title: { text: 'Days' } },
                yaxis: { 
                  showgrid: true, 
                  gridcolor: 'hsl(var(--border) / 0.3)',
                  ticksuffix: '%',
                  title: { text: 'Loss %' },
                },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
              useResizeHandler
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Insufficient data for backtest (need 100+ observations)
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistical Tests</CardTitle>
            <CardDescription>Model validation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Statistic</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Kupiec POF</TableCell>
                    <TableCell className="font-mono">
                      {backtestStats?.exceptions || 0} / {backtestStats?.expectedExceptions || 0} exceptions
                    </TableCell>
                    <TableCell>
                      {backtestStats?.kupiecPValue === 'Pass' ? (
                        <Badge className="bg-green-500/10 text-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pass
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Basel Traffic Light</TableCell>
                    <TableCell className="font-mono capitalize">
                      {backtestStats?.trafficLight || 'N/A'} Zone
                    </TableCell>
                    <TableCell>
                      <Badge className={trafficLightColors[backtestStats?.trafficLight || 'green']}>
                        {backtestStats?.trafficLight === 'green' && 'No capital add-on'}
                        {backtestStats?.trafficLight === 'yellow' && 'Review model'}
                        {backtestStats?.trafficLight === 'red' && 'Capital add-on required'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Regime History
            </CardTitle>
            <CardDescription>Recent regime state changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium">Current Regime</div>
                  <div className="text-sm text-muted-foreground">Detected from volatility</div>
                </div>
                <Badge className={`capitalize ${
                  regime === 'calm' ? 'bg-green-500/10 text-green-500' :
                  regime === 'stress' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {regime}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                The regime engine monitors FX volatility and automatically adjusts 
                model weights to improve risk estimates during different market conditions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
