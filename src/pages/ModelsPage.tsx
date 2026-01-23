// Models Page - VaR/ES Engine
import { useState } from 'react';
import { useRisk } from '@/context/RiskContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HelpCircle, Clock, Zap } from 'lucide-react';
import { ReturnsHistogram } from '@/components/charts/ReturnsHistogram';
import type { ConfidenceLevel, TimeHorizon, ModelType } from '@/lib/risk/types';

const modelDescriptions: Record<ModelType, { name: string; description: string }> = {
  'historical': {
    name: 'Historical Simulation',
    description: 'Uses actual historical returns to estimate risk. No distributional assumptions.',
  },
  'gaussian': {
    name: 'Parametric (Gaussian)',
    description: 'Assumes returns follow a normal distribution. Simple but may underestimate tail risk.',
  },
  'student-t': {
    name: 'Parametric (Student-t)',
    description: 'Heavier tails than Gaussian. Better for leptokurtic return distributions.',
  },
  'ewma': {
    name: 'EWMA',
    description: 'Exponentially Weighted Moving Average volatility. Gives more weight to recent observations.',
  },
  'monte-carlo': {
    name: 'Monte Carlo (GBM)',
    description: 'Simulates thousands of price paths using Geometric Brownian Motion.',
  },
  'filtered-hs': {
    name: 'Filtered Historical Simulation',
    description: 'Combines EWMA volatility with bootstrapped standardized residuals.',
  },
};

export default function ModelsPage() {
  const { 
    assets, 
    returns,
    modelResults,
    ewmaLambda,
    setEwmaLambda,
    portfolioValue,
  } = useRisk();
  
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel>(95);
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>(1);
  
  if (assets.length === 0) {
    return <EmptyState />;
  }
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(value);
  
  // Get selected VaR value for histogram
  const hsResult = modelResults.find(r => r.model === 'historical');
  const selectedResult = hsResult?.results.find(
    r => r.confidence === selectedConfidence && r.horizon === selectedHorizon
  );
  
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">VaR & ES Models</h1>
        <p className="text-muted-foreground text-sm">
          Compare risk estimates across different methodologies
        </p>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Confidence Level</Label>
          <Tabs value={String(selectedConfidence)} onValueChange={(v) => setSelectedConfidence(Number(v) as ConfidenceLevel)}>
            <TabsList>
              <TabsTrigger value="90">90%</TabsTrigger>
              <TabsTrigger value="95">95%</TabsTrigger>
              <TabsTrigger value="97.5">97.5%</TabsTrigger>
              <TabsTrigger value="99">99%</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Time Horizon</Label>
          <Tabs value={String(selectedHorizon)} onValueChange={(v) => setSelectedHorizon(Number(v) as TimeHorizon)}>
            <TabsList>
              <TabsTrigger value="1">1 Day</TabsTrigger>
              <TabsTrigger value="10">10 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="space-y-2 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">EWMA Lambda</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Decay factor for EWMA volatility. Higher values (e.g., 0.97) give more weight to older observations. Standard is 0.94 (RiskMetrics).</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              value={[ewmaLambda]}
              onValueChange={([v]) => setEwmaLambda(v)}
              min={0.8}
              max={0.99}
              step={0.01}
              className="w-32"
            />
            <span className="font-mono text-sm w-12">{ewmaLambda.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Distribution Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Returns Distribution with VaR/ES Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReturnsHistogram
            returns={returns}
            varValue={selectedResult?.varPercent ? selectedResult.varPercent / 100 : undefined}
            esValue={selectedResult?.esPercent ? selectedResult.esPercent / 100 : undefined}
            title=""
            showFittedCurve={true}
          />
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-destructive" />
              <span className="text-muted-foreground">VaR ({selectedConfidence}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-warning" />
              <span className="text-muted-foreground">Expected Shortfall</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Model Results Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Model Comparison ({selectedHorizon}-Day, {selectedConfidence}% Confidence)
              </CardTitle>
              <CardDescription>
                Portfolio Value: {formatCurrency(portfolioValue)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="data-table">
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="w-[250px]">Model</TableHead>
                <TableHead className="text-right">VaR ($)</TableHead>
                <TableHead className="text-right">VaR (%)</TableHead>
                <TableHead className="text-right">ES ($)</TableHead>
                <TableHead className="text-right">ES (%)</TableHead>
                <TableHead className="text-right">Compute Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelResults.map((model) => {
                const result = model.results.find(
                  r => r.confidence === selectedConfidence && r.horizon === selectedHorizon
                );
                
                if (!result) return null;
                
                return (
                  <TableRow key={model.model} className="border-border/20">
                    <TableCell>
                      <div>
                        <span className="font-medium">{model.modelName}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 ml-2 inline text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{modelDescriptions[model.model].description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {formatCurrency(result.var)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {result.varPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-warning">
                      {formatCurrency(result.es)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-warning">
                      {result.esPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        {model.computeTime.toFixed(1)}ms
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Model Parameters */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Estimated Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="data-table">
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Model</TableHead>
                <TableHead className="text-right">μ (Mean)</TableHead>
                <TableHead className="text-right">σ (Volatility)</TableHead>
                <TableHead className="text-right">df (Degrees of Freedom)</TableHead>
                <TableHead className="text-right">λ (Lambda)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelResults.map((model) => (
                <TableRow key={model.model} className="border-border/20">
                  <TableCell className="font-medium">{model.modelName}</TableCell>
                  <TableCell className="text-right font-mono">
                    {model.parameters.mu !== undefined 
                      ? `${(model.parameters.mu * 100).toFixed(4)}%` 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {model.parameters.sigma !== undefined 
                      ? `${(model.parameters.sigma * 100).toFixed(4)}%` 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {model.parameters.df !== undefined 
                      ? model.parameters.df.toFixed(2) 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {model.parameters.lambda !== undefined 
                      ? model.parameters.lambda.toFixed(2) 
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Explanation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              What is VaR?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong>Value at Risk (VaR)</strong> is the maximum expected loss over a given time horizon 
              at a specified confidence level. For example, a 1-day 95% VaR of $50,000 means there's a 5% 
              chance of losing more than $50,000 in a single day.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-warning/5 border-warning/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              What is Expected Shortfall?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong>Expected Shortfall (ES)</strong>, also called CVaR, is the average loss when losses 
              exceed VaR. ES is always ≥ VaR because it captures the average of tail losses, not just 
              the threshold. ES is considered a more coherent risk measure.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
