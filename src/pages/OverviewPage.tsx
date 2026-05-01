// Overview Dashboard Page
import { useState } from 'react';
import { useRisk } from '@/context/RiskContext';
import { KPICard } from '@/components/dashboard/KPICard';
import { ModelResultsTable, FullModelComparison } from '@/components/dashboard/ModelResultsTable';
import { ReturnsHistogram } from '@/components/charts/ReturnsHistogram';
import { ReturnsTimeSeries } from '@/components/charts/RollingVaRChart';
import { DrawdownChart, CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { VaRTutorial } from '@/components/tutorial/VaRTutorial';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConfidenceLevel } from '@/lib/risk/types';

export default function OverviewPage() {
  const { 
    assets, 
    returns, 
    dates,
    modelResults, 
    metrics, 
    correlationMatrix,
    portfolioValue,
    isLoading,
  } = useRisk();
  
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel>(95);
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (assets.length === 0) {
    return (
      <div className="space-y-6 fade-in">
        <EmptyState />
        
        {/* Show tutorial even without data */}
        <VaRTutorial />
      </div>
    );
  }
  
  // Get VaR/ES values for display
  const hsResult = modelResults.find(r => r.model === 'historical');
  const var95 = hsResult?.results.find(r => r.confidence === 95 && r.horizon === 1);
  const var99 = hsResult?.results.find(r => r.confidence === 99 && r.horizon === 1);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  
  const formatPercent = (value: number) => 
    `${(value * 100).toFixed(2)}%`;
  
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Risk Overview</h1>
          <p className="text-muted-foreground text-sm">
            Portfolio value: {formatCurrency(portfolioValue)}
          </p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard
          title="VaR (95%)"
          value={var95 ? formatCurrency(var95.var) : '-'}
          subtitle={var95 ? `${var95.varPercent.toFixed(2)}% of portfolio` : undefined}
          accentColor="destructive"
          tooltip="1-day 95% Value at Risk: There's a 5% chance of losing more than this amount in a single day."
        />
        <KPICard
          title="VaR (99%)"
          value={var99 ? formatCurrency(var99.var) : '-'}
          subtitle={var99 ? `${var99.varPercent.toFixed(2)}% of portfolio` : undefined}
          accentColor="destructive"
          tooltip="1-day 99% Value at Risk: There's a 1% chance of losing more than this amount in a single day."
        />
        <KPICard
          title="ES (95%)"
          value={var95 ? formatCurrency(var95.es) : '-'}
          subtitle={var95 ? `${var95.esPercent.toFixed(2)}% of portfolio` : undefined}
          accentColor="warning"
          tooltip="Expected Shortfall: Average loss when losses exceed VaR. Always greater than or equal to VaR."
        />
        <KPICard
          title="Max Drawdown"
          value={metrics ? formatPercent(metrics.maxDrawdown) : '-'}
          accentColor="destructive"
          tooltip="Maximum peak-to-trough decline in portfolio value over the observation period."
        />
        <KPICard
          title="Volatility (Ann.)"
          value={metrics ? formatPercent(metrics.annualizedVolatility) : '-'}
          accentColor="primary"
          tooltip="Annualized standard deviation of returns (assumes 252 trading days)."
        />
        <KPICard
          title="Sharpe Ratio"
          value={metrics ? metrics.sharpeRatio.toFixed(2) : '-'}
          trend={metrics && metrics.sharpeRatio > 0.5 ? 'up' : metrics && metrics.sharpeRatio < 0 ? 'down' : 'neutral'}
          accentColor={metrics && metrics.sharpeRatio > 0.5 ? 'success' : 'primary'}
          tooltip="Risk-adjusted return: (Return - Risk-free rate) / Volatility. Higher is better."
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Returns Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnsHistogram 
              returns={returns}
              varValue={var95?.varPercent ? var95.varPercent / 100 : undefined}
              esValue={var95?.esPercent ? var95.esPercent / 100 : undefined}
              title=""
            />
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Returns Time Series
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnsTimeSeries returns={returns} dates={dates} title="" />
          </CardContent>
        </Card>
      </div>
      
      {/* Model Comparison */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold">Model Comparison</CardTitle>
            <Tabs value={String(selectedConfidence)} onValueChange={(v) => setSelectedConfidence(Number(v) as ConfidenceLevel)}>
              <TabsList className="h-8">
                <TabsTrigger value="90" className="text-xs px-3 h-6">90%</TabsTrigger>
                <TabsTrigger value="95" className="text-xs px-3 h-6">95%</TabsTrigger>
                <TabsTrigger value="97.5" className="text-xs px-3 h-6">97.5%</TabsTrigger>
                <TabsTrigger value="99" className="text-xs px-3 h-6">99%</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-scroll">
            <ModelResultsTable
              results={modelResults}
              confidence={selectedConfidence}
              horizon={1}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DrawdownChart returns={returns} dates={dates} title="" />
          </CardContent>
        </Card>
        
        {assets.length > 1 && correlationMatrix && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Asset Correlation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CorrelationHeatmap 
                correlationMatrix={correlationMatrix}
                labels={assets.map(a => a.name)}
                title=""
              />
            </CardContent>
          </Card>
        )}
        
        {assets.length === 1 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distribution Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Mean Return</p>
                  <p className="font-mono text-lg">{metrics ? formatPercent(metrics.meanReturn) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Daily Vol</p>
                  <p className="font-mono text-lg">{metrics ? formatPercent(metrics.volatility) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Skewness</p>
                  <p className="font-mono text-lg">{metrics ? metrics.skewness.toFixed(3) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Excess Kurtosis</p>
                  <p className="font-mono text-lg">{metrics ? metrics.kurtosis.toFixed(3) : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Full Comparison Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">VaR Across Confidence Levels (1-Day)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-scroll">
            <FullModelComparison results={modelResults} horizon={1} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
