// Historical Scenario Replay Component
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, History, ArrowUp, ArrowDown, Play } from 'lucide-react';
import { historicalSimulation } from '@/lib/risk/models';

interface HistoricalReplayPanelProps {
  returns: number[];
  dates: Date[];
  portfolioValue: number;
}

// Predefined historical crisis scenarios
const HISTORICAL_SCENARIOS = [
  {
    id: '2008-crisis',
    name: '2008 Financial Crisis',
    description: 'Lehman Brothers collapse and global market crash',
    dateRange: { start: new Date('2008-09-01'), end: new Date('2009-03-31') },
  },
  {
    id: 'covid-crash',
    name: 'COVID-19 Crash',
    description: 'March 2020 pandemic market selloff',
    dateRange: { start: new Date('2020-02-19'), end: new Date('2020-03-23') },
  },
  {
    id: 'dotcom-bust',
    name: 'Dot-com Bust',
    description: '2000-2002 tech bubble burst',
    dateRange: { start: new Date('2000-03-10'), end: new Date('2002-10-09') },
  },
  {
    id: 'flash-crash',
    name: '2010 Flash Crash',
    description: 'May 6, 2010 rapid market decline',
    dateRange: { start: new Date('2010-05-01'), end: new Date('2010-05-15') },
  },
  {
    id: 'brexit',
    name: 'Brexit Vote',
    description: 'June 2016 UK referendum aftermath',
    dateRange: { start: new Date('2016-06-23'), end: new Date('2016-07-08') },
  },
];

export function HistoricalReplayPanel({
  returns,
  dates,
  portfolioValue,
}: HistoricalReplayPanelProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [customStartIdx, setCustomStartIdx] = useState<number>(0);
  const [customEndIdx, setCustomEndIdx] = useState<number>(Math.min(50, returns.length - 1));

  // Determine available date range from data
  const dataDateRange = useMemo(() => {
    if (dates.length === 0) return null;
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }, [dates]);

  // Calculate baseline VaR from full dataset
  const baselineResults = useMemo(() => {
    if (returns.length < 20) return null;
    return historicalSimulation(returns, portfolioValue);
  }, [returns, portfolioValue]);

  // Find scenario window in data (or use custom)
  const scenarioWindow = useMemo(() => {
    if (selectedScenario === 'custom') {
      return {
        startIdx: customStartIdx,
        endIdx: customEndIdx,
        name: 'Custom Range',
        description: `Days ${customStartIdx + 1} to ${customEndIdx + 1}`,
      };
    }

    const scenario = HISTORICAL_SCENARIOS.find(s => s.id === selectedScenario);
    if (!scenario || dates.length === 0) return null;

    // For sample data, we'll simulate the scenario by taking a portion of the data
    // In real app, you'd match actual dates
    const scenarioLength = Math.min(60, Math.floor(returns.length / 3));
    
    // Use different portions of data for different scenarios to simulate variety
    const scenarioIndex = HISTORICAL_SCENARIOS.findIndex(s => s.id === selectedScenario);
    const startIdx = Math.min(
      Math.floor((scenarioIndex / HISTORICAL_SCENARIOS.length) * (returns.length - scenarioLength)),
      returns.length - scenarioLength
    );
    
    return {
      startIdx,
      endIdx: startIdx + scenarioLength,
      name: scenario.name,
      description: scenario.description,
    };
  }, [selectedScenario, dates, returns.length, customStartIdx, customEndIdx]);

  // Calculate scenario VaR
  const scenarioResults = useMemo(() => {
    if (!scenarioWindow || returns.length < 20) return null;
    
    const scenarioReturns = returns.slice(scenarioWindow.startIdx, scenarioWindow.endIdx + 1);
    if (scenarioReturns.length < 10) return null;
    
    return historicalSimulation(scenarioReturns, portfolioValue);
  }, [scenarioWindow, returns, portfolioValue]);

  // Calculate comparison
  const comparison = useMemo(() => {
    if (!baselineResults || !scenarioResults) return null;

    const baseline95 = baselineResults.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    const baseline99 = baselineResults.results.find(r => r.confidence === 99 && r.horizon === 1)!;
    const scenario95 = scenarioResults.results.find(r => r.confidence === 95 && r.horizon === 1)!;
    const scenario99 = scenarioResults.results.find(r => r.confidence === 99 && r.horizon === 1)!;

    // Calculate scenario statistics
    const scenarioReturns = returns.slice(scenarioWindow!.startIdx, scenarioWindow!.endIdx + 1);
    const scenarioMean = scenarioReturns.reduce((a, b) => a + b, 0) / scenarioReturns.length;
    const scenarioVol = Math.sqrt(
      scenarioReturns.reduce((sum, r) => sum + Math.pow(r - scenarioMean, 2), 0) / (scenarioReturns.length - 1)
    );
    const maxLoss = Math.min(...scenarioReturns);
    const cumReturn = scenarioReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;

    return {
      baseline95,
      baseline99,
      scenario95,
      scenario99,
      deltaVaR95: scenario95.var - baseline95.var,
      deltaVaR99: scenario99.var - baseline99.var,
      deltaES95: scenario95.es - baseline95.es,
      deltaES99: scenario99.es - baseline99.es,
      scenarioVol: scenarioVol * Math.sqrt(252) * 100, // Annualized %
      maxDailyLoss: maxLoss * 100,
      cumulativeReturn: cumReturn * 100,
      observations: scenarioReturns.length,
    };
  }, [baselineResults, scenarioResults, returns, scenarioWindow]);

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

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historical Scenario Replay
        </CardTitle>
        <CardDescription>
          Select a historical crisis period to recompute VaR under stressed conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Selector */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Historical Scenario</Label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a crisis scenario..." />
              </SelectTrigger>
              <SelectContent>
                {HISTORICAL_SCENARIOS.map(scenario => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{scenario.name}</span>
                      <span className="text-xs text-muted-foreground">{scenario.description}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex flex-col">
                    <span className="font-medium">Custom Range</span>
                    <span className="text-xs text-muted-foreground">Select your own data window</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedScenario === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Index</Label>
                <Select 
                  value={String(customStartIdx)} 
                  onValueChange={(v) => setCustomStartIdx(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(1, returns.length - 20) }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        Day {i + 1} {dates[i] ? `(${dates[i].toLocaleDateString()})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Index</Label>
                <Select 
                  value={String(customEndIdx)} 
                  onValueChange={(v) => setCustomEndIdx(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: returns.length - customStartIdx - 10 }, (_, i) => (
                      <SelectItem key={i} value={String(customStartIdx + 10 + i)}>
                        Day {customStartIdx + 11 + i} {dates[customStartIdx + 10 + i] ? `(${dates[customStartIdx + 10 + i].toLocaleDateString()})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {comparison && scenarioWindow && (
          <>
            {/* Scenario Info */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{scenarioWindow.name}</h4>
                  <p className="text-sm text-muted-foreground">{scenarioWindow.description}</p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {comparison.observations} days
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Annualized Vol</p>
                  <p className="font-mono text-warning">{comparison.scenarioVol.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Daily Loss</p>
                  <p className="font-mono text-destructive">{comparison.maxDailyLoss.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cumulative Return</p>
                  <p className={`font-mono ${comparison.cumulativeReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {comparison.cumulativeReturn.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <Table className="data-table">
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Scenario</TableHead>
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
                    {formatCurrency(comparison.scenario95.var)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${comparison.deltaVaR95 > 0 ? 'text-destructive' : 'text-success'}`}>
                      {comparison.deltaVaR95 > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(comparison.deltaVaR95)}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20">
                  <TableCell className="font-medium">VaR 99% (1D)</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(comparison.baseline99.var)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {formatCurrency(comparison.scenario99.var)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${comparison.deltaVaR99 > 0 ? 'text-destructive' : 'text-success'}`}>
                      {comparison.deltaVaR99 > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(comparison.deltaVaR99)}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20">
                  <TableCell className="font-medium">ES 95% (1D)</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(comparison.baseline95.es)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-warning">
                    {formatCurrency(comparison.scenario95.es)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${comparison.deltaES95 > 0 ? 'text-destructive' : 'text-success'}`}>
                      {comparison.deltaES95 > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(comparison.deltaES95)}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20">
                  <TableCell className="font-medium">ES 99% (1D)</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(comparison.baseline99.es)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-warning">
                    {formatCurrency(comparison.scenario99.es)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={`flex items-center justify-end gap-1 ${comparison.deltaES99 > 0 ? 'text-destructive' : 'text-success'}`}>
                      {comparison.deltaES99 > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {formatDelta(comparison.deltaES99)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}

        {!selectedScenario && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a historical scenario to analyze</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
