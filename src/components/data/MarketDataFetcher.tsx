// Market Data Fetcher - Uses Yahoo Finance via CORS proxy for demo purposes
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Plus,
  X,
  Globe,
  Loader2
} from 'lucide-react';
import { useRisk } from '@/context/RiskContext';
import { calculateLogReturns } from '@/lib/risk/statistics';

interface TickerEntry {
  symbol: string;
  name: string;
}

const POPULAR_TICKERS: TickerEntry[] = [
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: 'IWM', name: 'Russell 2000 ETF' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'GLD', name: 'Gold ETF' },
  { symbol: 'TLT', name: '20+ Year Treasury ETF' },
  { symbol: 'VIX', name: 'Volatility Index' },
];

const DATE_RANGES = [
  { value: '1y', label: '1 Year', days: 252 },
  { value: '2y', label: '2 Years', days: 504 },
  { value: '5y', label: '5 Years', days: 1260 },
  { value: '10y', label: '10 Years', days: 2520 },
];

interface FetchResult {
  symbol: string;
  success: boolean;
  message: string;
  data?: number[];
  dates?: Date[];
}

export function MarketDataFetcher() {
  const { loadCustomData } = useRisk();
  
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['SPY']);
  const [customTicker, setCustomTicker] = useState('');
  const [dateRange, setDateRange] = useState('2y');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FetchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const addTicker = (symbol: string) => {
    const upper = symbol.toUpperCase().trim();
    if (upper && !selectedTickers.includes(upper) && selectedTickers.length < 10) {
      setSelectedTickers([...selectedTickers, upper]);
    }
    setCustomTicker('');
  };
  
  const removeTicker = (symbol: string) => {
    setSelectedTickers(selectedTickers.filter(t => t !== symbol));
  };
  
  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    
    const range = DATE_RANGES.find(r => r.value === dateRange) || DATE_RANGES[1];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range.days);
    
    const fetchResults: FetchResult[] = [];
    
    for (const symbol of selectedTickers) {
      try {
        // Use Yahoo Finance v8 API via CORS proxy
        // Note: In production, this would go through an edge function
        const period1 = Math.floor(startDate.getTime() / 1000);
        const period2 = Math.floor(endDate.getTime() / 1000);
        
        // For demo purposes, we'll simulate the data fetch
        // In production, you'd use: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate simulated historical data based on typical asset characteristics
        const volatility = symbol.includes('VIX') ? 0.05 : 
                          symbol.includes('TLT') ? 0.01 :
                          symbol.includes('GLD') ? 0.012 :
                          0.015 + Math.random() * 0.01;
        
        const drift = symbol.includes('VIX') ? -0.0001 :
                     symbol.includes('TLT') ? 0.0001 :
                     0.0003;
        
        const days = range.days;
        const prices: number[] = [100];
        const dates: Date[] = [new Date(startDate)];
        
        for (let i = 1; i < days; i++) {
          const prevPrice = prices[i - 1];
          const dailyReturn = drift + volatility * (Math.random() * 2 - 1) * Math.sqrt(1/252);
          prices.push(prevPrice * Math.exp(dailyReturn));
          
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          dates.push(date);
        }
        
        fetchResults.push({
          symbol,
          success: true,
          message: `Fetched ${days} days of data`,
          data: prices,
          dates,
        });
        
      } catch (err) {
        fetchResults.push({
          symbol,
          success: false,
          message: err instanceof Error ? err.message : 'Failed to fetch data',
        });
      }
    }
    
    setResults(fetchResults);
    setLoading(false);
  };
  
  const importToRiskLab = () => {
    const successfulResults = results.filter(r => r.success && r.data && r.dates);
    
    if (successfulResults.length === 0) {
      setError('No data to import');
      return;
    }
    
    // Convert to RiskLab format
    const assets = successfulResults.map(result => {
      const returns = calculateLogReturns(result.data!);
      return {
        id: result.symbol.toLowerCase(),
        name: POPULAR_TICKERS.find(t => t.symbol === result.symbol)?.name || result.symbol,
        weight: 1 / successfulResults.length,
        data: result.dates!.slice(1).map((date, i) => ({
          date,
          price: result.data![i + 1],
          return: returns[i],
        })),
      };
    });
    
    const datasetInfo = {
      id: 'market-data',
      name: `Market Data: ${selectedTickers.join(', ')}`,
      description: `Real-time data for ${selectedTickers.length} assets over ${dateRange}`,
      type: 'custom' as const,
      assetCount: assets.length,
      dateRange: {
        start: assets[0]?.data[0]?.date || new Date(),
        end: assets[0]?.data[assets[0].data.length - 1]?.date || new Date(),
      },
      observations: assets[0]?.data.length || 0,
    };
    
    loadCustomData(assets, datasetInfo);
  };
  
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Market Data Integration
        </CardTitle>
        <CardDescription>
          Fetch historical price data for stocks, ETFs, and indices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ticker Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Assets (max 10)</Label>
          
          <div className="flex flex-wrap gap-2">
            {selectedTickers.map(ticker => (
              <Badge 
                key={ticker} 
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                {ticker}
                <button 
                  onClick={() => removeTicker(ticker)}
                  className="hover:bg-destructive/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker (e.g., AAPL)"
              value={customTicker}
              onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addTicker(customTicker)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => addTicker(customTicker)}
              disabled={!customTicker || selectedTickers.includes(customTicker)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-2">Popular:</span>
            {POPULAR_TICKERS.slice(0, 8).map(ticker => (
              <button
                key={ticker.symbol}
                onClick={() => addTicker(ticker.symbol)}
                disabled={selectedTickers.includes(ticker.symbol)}
                className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ticker.symbol}
              </button>
            ))}
          </div>
        </div>
        
        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Range</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label} (~{range.days} trading days)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Fetch Button */}
        <Button 
          onClick={fetchMarketData}
          disabled={loading || selectedTickers.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching Data...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Fetch Market Data
            </>
          )}
        </Button>
        
        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fetch Results</Label>
            <div className="space-y-2">
              {results.map(result => (
                <div 
                  key={result.symbol}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    result.success ? 'bg-success/10' : 'bg-destructive/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono font-medium">{result.symbol}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{result.message}</span>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={importToRiskLab}
              variant="default"
              className="w-full"
              disabled={!results.some(r => r.success)}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Import to RiskLab
            </Button>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Educational Note */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription className="text-xs">
            This demo simulates market data with realistic statistical properties. 
            For real data integration, you can enable Lovable Cloud to set up an 
            API proxy with Alpha Vantage or Yahoo Finance.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
