// Backtesting Page
import { useState, useMemo } from 'react';
import { useRisk } from '@/context/RiskContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { RollingVaRChart } from '@/components/charts/RollingVaRChart';
import { rollingBacktest, generateBacktestSummary, calculateESCoverage } from '@/lib/risk/backtest';
import type { ConfidenceLevel, ModelType, BacktestSummary } from '@/lib/risk/types';

export default function BacktestPage() {
  const { assets, returns, dates } = useRisk();
  
  const [window, setWindow] = useState(250);
  const [confidence, setConfidence] = useState<ConfidenceLevel>(95);
  const [model, setModel] = useState<ModelType>('historical');
  
  const backtestResults = useMemo(() => {
    if (returns.length <= window) return [];
    return rollingBacktest(returns, dates, { window, confidence, model });
  }, [returns, dates, window, confidence, model]);
  
  const summary = useMemo(() => {
    if (backtestResults.length === 0) return null;
    return generateBacktestSummary(backtestResults, confidence, model);
  }, [backtestResults, confidence, model]);
  
  const esCoverage = useMemo(() => {
    if (backtestResults.length === 0) return null;
    return calculateESCoverage(backtestResults);
  }, [backtestResults]);
  
  if (assets.length === 0) {
    return <EmptyState />;
  }
  
  if (returns.length <= window) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backtesting</h1>
          <p className="text-muted-foreground text-sm">
            Validate VaR models against historical performance
          </p>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Insufficient Data</AlertTitle>
          <AlertDescription>
            Backtesting requires more observations than the rolling window size. 
            Current: {returns.length} observations, Window: {window} days.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const StatusIcon = summary?.status === 'ok' 
    ? CheckCircle 
    : summary?.status === 'warning' 
      ? AlertTriangle 
      : XCircle;
  
  const statusColor = summary?.status === 'ok' 
    ? 'text-success' 
    : summary?.status === 'warning' 
      ? 'text-warning' 
      : 'text-destructive';
  
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backtesting</h1>
        <p className="text-muted-foreground text-sm">
          Validate VaR models with Kupiec POF test and Christoffersen conditional coverage test
        </p>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-6 items-end">
        <div className="space-y-2 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">
            Rolling Window: {window} days
          </Label>
          <Slider
            value={[window]}
            onValueChange={([v]) => setWindow(v)}
            min={50}
            max={Math.min(500, returns.length - 50)}
            step={10}
            className="w-48"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Confidence</Label>
          <Tabs value={String(confidence)} onValueChange={(v) => setConfidence(Number(v) as ConfidenceLevel)}>
            <TabsList>
              <TabsTrigger value="90">90%</TabsTrigger>
              <TabsTrigger value="95">95%</TabsTrigger>
              <TabsTrigger value="99">99%</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Model</Label>
          <Tabs value={model} onValueChange={(v) => setModel(v as ModelType)}>
            <TabsList>
              <TabsTrigger value="historical">Historical</TabsTrigger>
              <TabsTrigger value="gaussian">Gaussian</TabsTrigger>
              <TabsTrigger value="ewma">EWMA</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Summary Status */}
      {summary && (
        <Alert className={`border-${summary.status === 'ok' ? 'success' : summary.status === 'warning' ? 'warning' : 'destructive'}/30`}>
          <StatusIcon className={`h-5 w-5 ${statusColor}`} />
          <AlertTitle className="flex items-center gap-2">
            {summary.status === 'ok' && 'Model Passes Kupiec Test'}
            {summary.status === 'warning' && 'Model Marginally Acceptable'}
            {summary.status === 'fail' && 'Model Fails Kupiec Test'}
            <Badge variant={summary.status === 'ok' ? 'default' : 'outline'} className="ml-2">
              p = {summary.kupiecPValue.toFixed(4)}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-1">
            {summary.statusReason}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Rolling VaR Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Rolling VaR Backtest ({window}-day window)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RollingVaRChart results={backtestResults} showExceptions={true} title="" />
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Exception Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-mono font-semibold text-destructive">
                  {summary?.exceptions || 0}
                </p>
                <p className="text-xs text-muted-foreground">Actual Exceptions</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-semibold text-muted-foreground">
                  {summary?.expectedExceptions.toFixed(1) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Expected</p>
              </div>
              <div>
                <p className="text-lg font-mono">
                  {summary ? `${(summary.exceptionRate * 100).toFixed(2)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Exception Rate</p>
              </div>
              <div>
                <p className="text-lg font-mono text-muted-foreground">
                  {`${((1 - confidence / 100) * 100).toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground">Expected Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Statistical Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-lg font-mono">{summary?.totalDays || 0}</p>
                <p className="text-xs text-muted-foreground">Test Days</p>
              </div>
              <div>
                <p className={`text-lg font-mono ${summary && summary.kupiecPValue < 0.05 ? 'text-destructive' : 'text-success'}`}>
                  {summary?.kupiecPValue.toFixed(4) || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Kupiec p-value</p>
              </div>
              <div>
                <p className={`text-lg font-mono ${summary && summary.independencePValue < 0.05 ? 'text-destructive' : 'text-success'}`}>
                  {summary?.independencePValue.toFixed(4) || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Independence p-value</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Conditional Coverage (CC)</span>
                <Badge 
                  variant={summary && summary.conditionalCoveragePValue >= 0.05 ? 'default' : 'destructive'}
                  className="font-mono"
                >
                  p = {summary?.conditionalCoveragePValue.toFixed(4) || '-'}
                </Badge>
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {summary.christoffersenInterpretation}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ES Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-lg font-mono text-warning">
                  {esCoverage ? `${(esCoverage.avgPredictedES * 100).toFixed(2)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Avg Predicted ES</p>
              </div>
              <div>
                <p className="text-lg font-mono text-destructive">
                  {esCoverage ? `${(esCoverage.avgLossGivenException * 100).toFixed(2)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Avg Loss | Exception</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Exceptions Table */}
      {backtestResults.filter(r => r.exception).length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Exception Details</CardTitle>
            <CardDescription>Days where actual loss exceeded VaR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table className="data-table">
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actual Return</TableHead>
                    <TableHead className="text-right">Predicted VaR</TableHead>
                    <TableHead className="text-right">Predicted ES</TableHead>
                    <TableHead className="text-right">Breach Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backtestResults
                    .filter(r => r.exception)
                    .slice(0, 50)
                    .map((result, i) => (
                      <TableRow key={i} className="border-border/20">
                        <TableCell className="font-mono">
                          {result.date.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {(result.actualReturn * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          -{(result.predictedVaR * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-warning">
                          -{(result.predictedES * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {((-result.actualReturn - result.predictedVaR) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
