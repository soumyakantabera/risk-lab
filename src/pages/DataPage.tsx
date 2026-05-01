// Data & Portfolio Page
import { useState, useCallback } from 'react';
import { useRisk } from '@/context/RiskContext';
import { parseCSV } from '@/lib/data/parser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  Database, 
  AlertCircle, 
  Check,
  FileSpreadsheet,
  TrendingUp,
  Layers,
  Activity
} from 'lucide-react';
import { ReturnsTimeSeries } from '@/components/charts/RollingVaRChart';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { ManualDataEntry } from '@/components/data/ManualDataEntry';
import { MarketDataFetcher } from '@/components/data/MarketDataFetcher';

const sampleDatasets = [
  {
    id: 'normal-baseline',
    name: 'Normal Returns',
    description: 'Normally distributed returns (μ≈10%, σ≈20% annualized)',
    icon: TrendingUp,
    color: 'text-primary',
  },
  {
    id: 'heavy-tail',
    name: 'Heavy-Tail Returns',
    description: 'Fat-tailed distribution with 5% jump probability',
    icon: Activity,
    color: 'text-warning',
  },
  {
    id: 'multi-asset-correlated',
    name: 'Multi-Asset Portfolio',
    description: '3 correlated assets with volatility regime shifts',
    icon: Layers,
    color: 'text-accent',
  },
] as const;

export default function DataPage() {
  const { 
    assets, 
    datasetInfo,
    returns,
    dates,
    correlationMatrix,
    portfolioValue,
    returnType,
    setPortfolioValue,
    setReturnType,
    loadSampleDataset,
    loadCustomData,
    updateWeights,
    clearData,
  } = useRisk();
  
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({});
  
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const result = await parseCSV(file);
      
      if (!result.success && result.errors.length > 0) {
        setUploadError(result.errors.join('. '));
        return;
      }
      
      if (result.data.length === 0) {
        setUploadError('No valid data found in CSV.');
        return;
      }
      
      loadCustomData(result.data, result.info);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse CSV');
    } finally {
      setIsUploading(false);
    }
  }, [loadCustomData]);
  
  const weightSum = assets.reduce((sum, a) => sum + a.weight, 0);
  const weightsValid = Math.abs(weightSum - 1) < 0.001;
  
  const handleWeightChange = (assetId: string, newWeight: number) => {
    const newWeights = { ...tempWeights, [assetId]: newWeight };
    setTempWeights(newWeights);
    
    // Auto-update weights in real-time
    const weightUpdates = assets.map(a => ({
      id: a.id,
      weight: newWeights[a.id] ?? a.weight,
    }));
    updateWeights(weightUpdates);
  };
  
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Data & Portfolio</h1>
        <p className="text-muted-foreground text-sm">
          Load data and configure your portfolio weights
        </p>
      </div>
      
      {/* Sample Datasets */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Sample Datasets
          </CardTitle>
          <CardDescription>
            Quick start with pre-built synthetic datasets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleDatasets.map((dataset) => {
              const isActive = datasetInfo?.id === dataset.id;
              return (
                <button
                  key={dataset.id}
                  onClick={() => loadSampleDataset(dataset.id)}
                  className={`relative p-4 rounded-lg border text-left transition-all hover:border-primary/50 ${
                    isActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border/50 bg-card/50'
                  }`}
                >
                  {isActive && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                  <dataset.icon className={`h-8 w-8 mb-3 ${dataset.color}`} />
                  <h3 className="font-semibold text-foreground">{dataset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{dataset.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* CSV Upload */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Upload Custom Data
          </CardTitle>
          <CardDescription>
            CSV format: date column + price or return columns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="csv-upload" className="sr-only">Upload CSV</Label>
              <div className="relative">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                )}
              </div>
            </div>
            {assets.length > 0 && (
              <Button variant="outline" onClick={clearData}>
                Clear Data
              </Button>
            )}
          </div>
          
          {uploadError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          
          <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-dashed border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Expected CSV format:</strong><br />
              • First column: dates (YYYY-MM-DD, MM/DD/YYYY, etc.)<br />
              • Other columns: prices ({">"} 1) or returns (decimals like 0.02 for 2%)<br />
              • Column headers required
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Market Data Integration */}
      <MarketDataFetcher />
      
      {/* Manual Data Entry - Educational */}
      <ManualDataEntry onDataLoad={loadCustomData} />
      
      {/* Portfolio Configuration */}
      {assets.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portfolio Value */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={portfolioValue}
                      onChange={(e) => setPortfolioValue(Number(e.target.value))}
                      className="text-xl font-mono"
                      min={1000}
                      step={100000}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your portfolio notional value for VaR/ES calculations in dollar terms
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Return Type Toggle */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Return Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Tabs value={returnType} onValueChange={(v) => setReturnType(v as 'log' | 'simple')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="log">Log Returns</TabsTrigger>
                      <TabsTrigger value="simple">Simple Returns</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    {returnType === 'log' 
                      ? 'Log returns: r = ln(P_t / P_{t-1}). Additive over time, commonly used in finance.'
                      : 'Simple returns: r = (P_t - P_{t-1}) / P_{t-1}. Intuitive percentage change.'}
                  </p>
                  <Badge variant="outline" className="font-mono text-xs">
                    Current: {returnType === 'log' ? 'Logarithmic' : 'Arithmetic'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Dataset Info */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Dataset Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Observations</p>
                    <p className="font-mono text-lg">{datasetInfo?.observations || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Assets</p>
                    <p className="font-mono text-lg">{assets.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Start Date</p>
                    <p className="font-mono text-sm">
                      {datasetInfo?.dateRange.start.toLocaleDateString() || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">End Date</p>
                    <p className="font-mono text-sm">
                      {datasetInfo?.dateRange.end.toLocaleDateString() || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Asset Weights */}
          {assets.length > 1 && (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Portfolio Weights</CardTitle>
                    <CardDescription>Adjust allocation across assets</CardDescription>
                  </div>
                  {!weightsValid && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Weights sum to {(weightSum * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead className="w-[200px] sm:w-[300px]">Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell className="font-mono">
                          {((tempWeights[asset.id] ?? asset.weight) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Slider
                            value={[(tempWeights[asset.id] ?? asset.weight) * 100]}
                            onValueChange={([v]) => handleWeightChange(asset.id, v / 100)}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Portfolio Returns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReturnsTimeSeries returns={returns} dates={dates} title="" />
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
          </div>
        </>
      )}
    </div>
  );
}
