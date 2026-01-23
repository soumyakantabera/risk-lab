// Market Data Fetcher - Uses real APIs with caching, retry logic, and fallbacks
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  WifiOff,
  RefreshCw,
  Database,
  Trash2
} from 'lucide-react';
import { useRisk } from '@/context/RiskContext';
import { 
  fetchMultipleAssets, 
  FetchedAssetData,
  calculateReturnsFromPrices,
  CRYPTO_MAP,
  getCacheStats,
  clearAllCache,
  clearOldCache,
  MARKETS,
  MarketInfo
} from '@/lib/api/marketData';
import { PriceChartPreview } from './PriceChartPreview';

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
  fromCache?: boolean;
}

export function MarketDataFetcher() {
  const { loadCustomData } = useRisk();
  
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['SPY']);
  const [customTicker, setCustomTicker] = useState('');
  const [dateRange, setDateRange] = useState('1y');
  const [selectedMarket, setSelectedMarket] = useState<string>('US');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FetchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [cacheStats, setCacheStats] = useState({ count: 0, totalSize: 0, symbols: [] as string[] });
  
  // Get current market info
  const currentMarket = MARKETS.find(m => m.id === selectedMarket) || MARKETS[0];
  
  // Update cache stats
  const updateCacheStats = useCallback(() => {
    setCacheStats(getCacheStats());
  }, []);
  
  // Monitor online status and cache
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Clean old cache on mount
    clearOldCache();
    updateCacheStats();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateCacheStats]);
  
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
  
  const handleClearCache = useCallback(() => {
    clearAllCache();
    updateCacheStats();
  }, [updateCacheStats]);
  
  const getTickerBadgeVariant = (symbol: string): 'default' | 'secondary' | 'outline' => {
    if (CRYPTO_MAP[symbol]) return 'default';
    const ticker = POPULAR_TICKERS.find(t => t.symbol === symbol);
    if (ticker?.type === 'etf') return 'secondary';
    return 'outline';
  };
  
  const fetchMarketData = useCallback(async () => {
    if (!isOnline && !cacheStats.count) {
      setError('You appear to be offline and have no cached data.');
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
        (completed, total) => setProgress((completed / total) * 100),
        { useCache: true, forceRefresh, marketId: selectedMarket }
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
            fromCache: result.source === 'cache',
          });
        }
      });
      
      setResults(resultArray);
      updateCacheStats();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [selectedTickers, dateRange, selectedMarket, isOnline, forceRefresh, cacheStats.count, updateCacheStats]);
  
  // Get successful assets for chart preview
  const successfulAssets = useMemo(() => {
    return results
      .filter(r => r.success && r.data)
      .map(r => r.data as FetchedAssetData);
  }, [results]);
  
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
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
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
          Fetch real historical data with caching and automatic fallbacks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Status */}
        {cacheStats.count > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{cacheStats.count}</strong> cached items ({formatBytes(cacheStats.totalSize)})
              </span>
              {cacheStats.symbols.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  • {cacheStats.symbols.slice(0, 5).join(', ')}
                  {cacheStats.symbols.length > 5 && ` +${cacheStats.symbols.length - 5} more`}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCache}
              className="text-xs h-7"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
        
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
        
        {/* Market Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Market / Exchange</Label>
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(
                MARKETS.reduce((acc, m) => {
                  if (!acc[m.region]) acc[m.region] = [];
                  acc[m.region].push(m);
                  return acc;
                }, {} as Record<string, MarketInfo[]>)
              ).map(([region, markets]) => (
                <div key={region}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {region}
                  </div>
                  {markets.map(market => (
                    <SelectItem key={market.id} value={market.id}>
                      <span className="flex items-center gap-2">
                        <span>{market.name}</span>
                        <span className="text-xs text-muted-foreground">({market.currency})</span>
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          {selectedMarket !== 'US' && (
            <p className="text-xs text-muted-foreground">
              Enter local ticker symbols (e.g., RELIANCE for NSE, VOD for LSE)
            </p>
          )}
        </div>

        {/* Date Range & Options */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 flex-1 min-w-[140px]">
            <Label className="text-sm font-medium">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full">
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
          </div>
          
          <div className="flex items-center gap-2 pb-0.5">
            <Button
              variant={forceRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForceRefresh(!forceRefresh)}
              className="text-xs h-9"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${forceRefresh ? 'animate-spin' : ''}`} />
              {forceRefresh ? 'Force Refresh ON' : 'Use Cache'}
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Crypto data limited to 1 year. Data cached for 4 hours. Market: <strong>{currentMarket.name}</strong>
        </p>
        
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
                    {result.fromCache && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        cached
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.data && (
                      <Badge variant="outline" className="text-[10px]">
                        {result.data.source}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{result.message}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Price Chart Preview */}
            {successfulAssets.length > 0 && (
              <PriceChartPreview assets={successfulAssets} />
            )}
            
            <Button 
              onClick={importToRiskLab}
              variant="default"
              className="w-full"
              disabled={!results.some(r => r.success)}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Import to RiskLab ({successfulAssets.length} asset{successfulAssets.length !== 1 ? 's' : ''})
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
          <AlertTitle>Data Sources & Reliability</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p><strong>Primary:</strong> Yahoo Finance (4 CORS proxy fallbacks)</p>
            <p><strong>Fallback:</strong> Alpha Vantage (25 free calls/day)</p>
            <p><strong>Crypto:</strong> CoinGecko API with retry logic</p>
            <p className="text-muted-foreground mt-2">
              Data is cached locally for 4 hours to reduce API calls and improve reliability.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
