// Manual Data Entry Component with Educational Features
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Plus, 
  Trash2, 
  Lightbulb, 
  Calculator,
  HelpCircle,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { PortfolioAsset, DatasetInfo } from '@/lib/risk/types';

interface ManualDataEntryProps {
  onDataLoad: (assets: PortfolioAsset[], info: DatasetInfo) => void;
}

interface DataRow {
  id: string;
  date: string;
  price: string;
}

// Sample data for learning
const SAMPLE_SCENARIOS = [
  {
    id: 'bull-market',
    name: '📈 Bull Market',
    description: 'Steady upward trend with low volatility',
    data: [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 101.5 },
      { date: '2024-01-03', price: 103.2 },
      { date: '2024-01-04', price: 102.8 },
      { date: '2024-01-05', price: 104.5 },
      { date: '2024-01-08', price: 106.2 },
      { date: '2024-01-09', price: 107.8 },
      { date: '2024-01-10', price: 109.1 },
      { date: '2024-01-11', price: 108.5 },
      { date: '2024-01-12', price: 110.3 },
    ],
  },
  {
    id: 'crash',
    name: '📉 Market Crash',
    description: 'Sharp decline followed by recovery attempt',
    data: [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 98 },
      { date: '2024-01-03', price: 92 },
      { date: '2024-01-04', price: 85 },
      { date: '2024-01-05', price: 78 },
      { date: '2024-01-08', price: 82 },
      { date: '2024-01-09', price: 79 },
      { date: '2024-01-10', price: 84 },
      { date: '2024-01-11', price: 86 },
      { date: '2024-01-12', price: 88 },
    ],
  },
  {
    id: 'volatile',
    name: '🎢 High Volatility',
    description: 'Large daily swings in both directions',
    data: [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 105 },
      { date: '2024-01-03', price: 98 },
      { date: '2024-01-04', price: 107 },
      { date: '2024-01-05', price: 95 },
      { date: '2024-01-08', price: 103 },
      { date: '2024-01-09', price: 92 },
      { date: '2024-01-10', price: 101 },
      { date: '2024-01-11', price: 94 },
      { date: '2024-01-12', price: 102 },
    ],
  },
];

export function ManualDataEntry({ onDataLoad }: ManualDataEntryProps) {
  const [assetName, setAssetName] = useState('My Asset');
  const [rows, setRows] = useState<DataRow[]>([
    { id: '1', date: '2024-01-01', price: '100' },
    { id: '2', date: '2024-01-02', price: '' },
    { id: '3', date: '2024-01-03', price: '' },
  ]);
  const [showStats, setShowStats] = useState(false);

  // Calculate returns from current data
  const calculatedStats = useCallback(() => {
    const validPrices = rows
      .filter(r => r.price && !isNaN(parseFloat(r.price)))
      .map(r => parseFloat(r.price));
    
    if (validPrices.length < 2) {
      return null;
    }

    // Calculate log returns
    const logReturns: number[] = [];
    const simpleReturns: number[] = [];
    
    for (let i = 1; i < validPrices.length; i++) {
      const logRet = Math.log(validPrices[i] / validPrices[i - 1]);
      const simpleRet = (validPrices[i] - validPrices[i - 1]) / validPrices[i - 1];
      logReturns.push(logRet);
      simpleReturns.push(simpleRet);
    }

    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (logReturns.length - 1);
    const stdDev = Math.sqrt(variance);
    
    // Simple max drawdown
    let peak = validPrices[0];
    let maxDD = 0;
    for (const p of validPrices) {
      if (p > peak) peak = p;
      const dd = (peak - p) / peak;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      returns: logReturns,
      simpleReturns,
      count: logReturns.length,
      mean: mean * 100,
      stdDev: stdDev * 100,
      annualizedVol: stdDev * Math.sqrt(252) * 100,
      maxDrawdown: maxDD * 100,
      totalReturn: ((validPrices[validPrices.length - 1] / validPrices[0]) - 1) * 100,
    };
  }, [rows]);

  const stats = calculatedStats();

  const addRow = () => {
    const lastDate = rows[rows.length - 1]?.date;
    let nextDate = '';
    
    if (lastDate) {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + 1);
      // Skip weekends
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      nextDate = date.toISOString().split('T')[0];
    }
    
    setRows([...rows, { id: Date.now().toString(), date: nextDate, price: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 2) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: 'date' | 'price', value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const loadScenario = (scenarioId: string) => {
    const scenario = SAMPLE_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      setRows(scenario.data.map((d, i) => ({
        id: String(i),
        date: d.date,
        price: String(d.price),
      })));
      setAssetName(scenario.name.replace(/[📈📉🎢]\s*/, ''));
    }
  };

  const handleSubmit = () => {
    const validRows = rows.filter(r => r.date && r.price && !isNaN(parseFloat(r.price)));
    
    if (validRows.length < 5) {
      return;
    }

    const dataPoints = validRows.map(r => ({
      date: new Date(r.date),
      price: parseFloat(r.price),
    }));

    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    const asset: PortfolioAsset = {
      id: 'manual-asset',
      name: assetName,
      weight: 1,
      data: dataPoints,
    };

    const info: DatasetInfo = {
      id: 'manual-entry',
      name: 'Manual Entry Dataset',
      description: `Custom ${assetName} data with ${dataPoints.length} observations`,
      type: 'custom',
      assetCount: 1,
      dateRange: {
        start: dataPoints[0].date,
        end: dataPoints[dataPoints.length - 1].date,
      },
      observations: dataPoints.length,
    };

    onDataLoad([asset], info);
  };

  const validRowCount = rows.filter(r => r.date && r.price && !isNaN(parseFloat(r.price))).length;
  const isValid = validRowCount >= 5;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Manual Data Entry
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            Learning Mode
          </Badge>
        </CardTitle>
        <CardDescription>
          Enter price data manually to understand how returns and risk metrics are calculated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Educational Intro */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">📚 How This Works</h4>
              <p className="text-sm text-muted-foreground">
                Enter daily prices for an asset. The system will calculate:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Log Returns:</strong> r = ln(P<sub>t</sub> / P<sub>t-1</sub>)</li>
                <li>• <strong>Volatility:</strong> Standard deviation of returns</li>
                <li>• <strong>VaR/ES:</strong> Risk measures from your data distribution</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Scenario Buttons */}
        <div className="space-y-2">
          <Label className="text-sm">Try a Sample Scenario</Label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_SCENARIOS.map(scenario => (
              <TooltipProvider key={scenario.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadScenario(scenario.id)}
                    >
                      {scenario.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{scenario.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Asset Name */}
        <div className="space-y-2">
          <Label>Asset Name</Label>
          <Input
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="e.g., AAPL, My Portfolio"
            className="max-w-xs"
          />
        </div>

        {/* Data Entry Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Price Data</Label>
            <Badge variant={isValid ? "default" : "destructive"}>
              {validRowCount} / 5+ rows required
            </Badge>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[180px]">
                    Date
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 ml-1 inline" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Trading dates (weekdays)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    Price ($)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 ml-1 inline" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Closing price for the day</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    Log Return
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 ml-1 inline" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Log return = ln(P<sub>t</sub> / P<sub>t-1</sub>)</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Positive = gain, Negative = loss
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const prevPrice = index > 0 ? parseFloat(rows[index - 1].price) : null;
                  const currPrice = parseFloat(row.price);
                  let logReturn: number | null = null;
                  
                  if (prevPrice && currPrice && !isNaN(prevPrice) && !isNaN(currPrice) && prevPrice > 0) {
                    logReturn = Math.log(currPrice / prevPrice);
                  }

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.price}
                          onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="h-8 font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        {logReturn !== null ? (
                          <span className={`font-mono text-sm ${logReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {logReturn >= 0 ? '+' : ''}{(logReturn * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 2}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>

        {/* Live Statistics */}
        {stats && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Live Statistics Preview
              </span>
              <Badge variant="outline">{showStats ? 'Hide' : 'Show'}</Badge>
            </Button>
            
            {showStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
                <div>
                  <p className="text-xs text-muted-foreground">Mean Daily Return</p>
                  <p className={`font-mono text-lg ${stats.mean >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stats.mean >= 0 ? '+' : ''}{stats.mean.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Daily Volatility</p>
                  <p className="font-mono text-lg text-warning">{stats.stdDev.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Annualized Vol</p>
                  <p className="font-mono text-lg">{stats.annualizedVol.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Drawdown</p>
                  <p className="font-mono text-lg text-destructive">-{stats.maxDrawdown.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation & Submit */}
        {!isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Enter at least 5 valid price rows to calculate risk metrics. 
              More data points = more reliable VaR estimates.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={!isValid}
          className="w-full"
        >
          <Check className="h-4 w-4 mr-2" />
          Load Data & Calculate Risk Metrics
        </Button>

        {/* Educational Note */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
          <p className="text-xs text-muted-foreground">
            <strong>📊 Pro Tip:</strong> Try entering data with different patterns: 
            steady growth, a sudden crash, or high volatility. Watch how VaR and ES 
            change based on the historical distribution of returns!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
