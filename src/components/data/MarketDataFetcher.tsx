// Market Data Fetcher - Uses real APIs (Yahoo Finance, CoinGecko)
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useRisk } from '@/context/RiskContext';
import { 
  fetchMultipleAssets, 
  FetchedAssetData,
  calculateReturnsFromPrices,
  CRYPTO_MAP 
} from '@/lib/api/marketData';

interface TickerEntry {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto';
}

const POPULAR_TICKERS: TickerEntry[] = [
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', type: 'etf' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', type: 'etf' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'GLD', name: 'Gold ETF', type: 'etf' },
  { symbol: 'TLT', name: '20+ Year Treasury ETF', type: 'etf' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
];

const DATE_RANGES = [
  { value: '3m', label: '3 Months', days: 90 },
  { value: '6m', label: '6 Months', days: 180 },
  { value: '1y', label: '1 Year', days: 365 },
  { value: '2y', label: '2 Years', days: 730 },
];

interface FetchResult {
  symbol: string;
  success: boolean;
  message: string;
  data?: FetchedAssetData;
}

export function MarketDataFetcher() {
  const { loadCustomData } = useRisk();
  
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['SPY']);
  const [customTicker, setCustomTicker] = useState('');
  const [dateRange, setDateRange] = useState('1y');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FetchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Monitor online status
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
  
  const addTicker = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase().trim();
    if (upper && !selectedTickers.includes(upper) && selectedTickers.length < 10) {
      setSelectedTickers(prev => [...prev, upper]);
    }
    setCustomTicker('');
  }, [selectedTickers]);
  
  const removeTicker = useCallback((symbol: string) => {
    setSelectedTickers(prev => prev.filter(t => t !== symbol));
  }, []);
  
  const getTickerBadgeVariant = (symbol: string): 'default' | 'secondary' | 'outline' => {
    if (CRYPTO_MAP[symbol]) return 'default';
    const ticker = POPULAR_TICKERS.find(t => t.symbol === symbol);
    if (ticker?.type === 'etf') return 'secondary';
    return 'outline';
  };
  
  const fetchMarketData = useCallback(async () => {
    if (!isOnline) {
      setError('You appear to be offline. Please check your internet connection.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(0);
    
    const range = DATE_RANGES.find(r => r.value === dateRange) || DATE_RANGES[2];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range.days);
    
    try {
      const fetchResults = await fetchMultipleAssets(
        selectedTickers,
        startDate,
        endDate,
        (completed, total) => setProgress((completed / total) * 100)
      );
      
      const resultArray: FetchResult[] = [];
      
      fetchResults.forEach((result, symbol) => {
        if (result instanceof Error) {
          resultArray.push({
            symbol,
            success: false,
            message: result.message,
          });
        } else {
          resultArray.push({
            symbol,
            success: true,
            message: `${result.data.length} days of data`,
            data: result,
          });
        }
      });
      
      setResults(resultArray);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [selectedTickers, dateRange, isOnline]);
  
  const importToRiskLab = useCallback(() => {
    const successfulResults = results.filter(r => r.success && r.data);
    
    if (successfulResults.length === 0) {
      setError('No data to import');
      return;
    }
    
    // Convert to RiskLab format
    const assets = successfulResults.map(result => {
      const assetData = result.data!;
      const prices = assetData.data.map(d => d.close);
      const returns = calculateReturnsFromPrices(prices, 'log');
      
      return {
        id: result.symbol.toLowerCase(),
        name: assetData.name || result.symbol,
        weight: 1 / successfulResults.length,
        data: assetData.data.slice(1).map((d, i) => ({
          date: d.date,
          price: d.close,
          return: returns[i] ?? 0,
        })),
      };
    });
    
    // Find common date range
    const minDates = assets.map(a => a.data[0]?.date.getTime() || 0);
    const maxDates = assets.map(a => a.data[a.data.length - 1]?.date.getTime() || 0);
    
    const datasetInfo = {
      id: 'market-data',
      name: `Market Data: ${selectedTickers.join(', ')}`,
      description: `Live data for ${selectedTickers.length} asset${selectedTickers.length > 1 ? 's' : ''} over ${dateRange}`,
      type: 'custom' as const,
      assetCount: assets.length,
      dateRange: {
        start: new Date(Math.max(...minDates)),
        end: new Date(Math.min(...maxDates)),
      },
      observations: Math.min(...assets.map(a => a.data.length)),
    };
    
    loadCustomData(assets, datasetInfo);
  }, [results, selectedTickers, dateRange, loadCustomData]);
  
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Live Market Data
          {isOnline ? (
            <Badge variant="outline" className="ml-2 text-xs gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-2 text-xs gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Fetch real historical data from Yahoo Finance & CoinGecko
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
                variant={getTickerBadgeVariant(ticker)}
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                {ticker}
                {CRYPTO_MAP[ticker] && <span className="text-[10px] opacity-70">₿</span>}
                <button 
                  onClick={() => removeTicker(ticker)}
                  className="hover:bg-destructive/20 rounded p-0.5 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker (e.g., AAPL, BTC)"
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
          
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-2">Stocks/ETFs:</span>
              {POPULAR_TICKERS.filter(t => t.type !== 'crypto').slice(0, 8).map(ticker => (
                <button
                  key={ticker.symbol}
                  onClick={() => addTicker(ticker.symbol)}
                  disabled={selectedTickers.includes(ticker.symbol)}
                  className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={ticker.name}
                >
                  {ticker.symbol}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-2">Crypto:</span>
              {POPULAR_TICKERS.filter(t => t.type === 'crypto').map(ticker => (
                <button
                  key={ticker.symbol}
                  onClick={() => addTicker(ticker.symbol)}
                  disabled={selectedTickers.includes(ticker.symbol)}
                  className="text-xs px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={ticker.name}
                >
                  {ticker.symbol}
                </button>
              ))}
            </div>
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
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Crypto data limited to 1 year due to API constraints
          </p>
        </div>
        
        {/* Fetch Button */}
        <Button 
          onClick={fetchMarketData}
          disabled={loading || selectedTickers.length === 0 || !isOnline}
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
              Fetch Live Market Data
            </>
          )}
        </Button>
        
        {/* Progress */}
        {loading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Fetching {selectedTickers.length} assets...
            </p>
          </div>
        )}
        
        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fetch Results</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map(result => (
                <div 
                  key={result.symbol}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono font-medium">{result.symbol}</span>
                    {result.data && (
                      <span className="text-xs text-muted-foreground">
                        ({result.data.name})
                      </span>
                    )}
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
        
        {/* Info Note */}
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertTitle>Live Data Sources</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p><strong>Stocks & ETFs:</strong> Yahoo Finance (via CORS proxy)</p>
            <p><strong>Crypto:</strong> CoinGecko API (supports BTC, ETH, SOL, etc.)</p>
            <p className="text-muted-foreground mt-2">
              Data is fetched in real-time. No API keys required.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
