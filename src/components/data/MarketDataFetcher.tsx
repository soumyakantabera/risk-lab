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

// Market-specific popular tickers
const POPULAR_TICKERS_BY_MARKET: Record<string, TickerEntry[]> = {
  US: [
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
  ],
  NSE: [
    { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'stock' },
    { symbol: 'TCS', name: 'Tata Consultancy', type: 'stock' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock' },
    { symbol: 'INFY', name: 'Infosys', type: 'stock' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'stock' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', type: 'stock' },
    { symbol: 'SBIN', name: 'State Bank of India', type: 'stock' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', type: 'stock' },
    { symbol: 'ITC', name: 'ITC Limited', type: 'stock' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', type: 'stock' },
  ],
  LSE: [
    { symbol: 'SHEL', name: 'Shell PLC', type: 'stock' },
    { symbol: 'HSBA', name: 'HSBC Holdings', type: 'stock' },
    { symbol: 'BP', name: 'BP PLC', type: 'stock' },
    { symbol: 'AZN', name: 'AstraZeneca', type: 'stock' },
    { symbol: 'VOD', name: 'Vodafone Group', type: 'stock' },
    { symbol: 'GSK', name: 'GSK PLC', type: 'stock' },
    { symbol: 'ULVR', name: 'Unilever PLC', type: 'stock' },
    { symbol: 'RIO', name: 'Rio Tinto', type: 'stock' },
    { symbol: 'LLOY', name: 'Lloyds Banking', type: 'stock' },
    { symbol: 'BARC', name: 'Barclays PLC', type: 'stock' },
  ],
  TSE: [
    { symbol: '7203', name: 'Toyota Motor', type: 'stock' },
    { symbol: '6758', name: 'Sony Group', type: 'stock' },
    { symbol: '9984', name: 'SoftBank Group', type: 'stock' },
    { symbol: '6861', name: 'Keyence', type: 'stock' },
    { symbol: '9432', name: 'NTT', type: 'stock' },
    { symbol: '6098', name: 'Recruit Holdings', type: 'stock' },
    { symbol: '8306', name: 'Mitsubishi UFJ', type: 'stock' },
    { symbol: '6501', name: 'Hitachi', type: 'stock' },
    { symbol: '7974', name: 'Nintendo', type: 'stock' },
    { symbol: '4063', name: 'Shin-Etsu Chemical', type: 'stock' },
  ],
  HKEX: [
    { symbol: '0700', name: 'Tencent Holdings', type: 'stock' },
    { symbol: '9988', name: 'Alibaba Group', type: 'stock' },
    { symbol: '0941', name: 'China Mobile', type: 'stock' },
    { symbol: '1299', name: 'AIA Group', type: 'stock' },
    { symbol: '0005', name: 'HSBC Holdings', type: 'stock' },
    { symbol: '2318', name: 'Ping An Insurance', type: 'stock' },
    { symbol: '3690', name: 'Meituan', type: 'stock' },
    { symbol: '9618', name: 'JD.com', type: 'stock' },
    { symbol: '0388', name: 'HK Exchanges', type: 'stock' },
    { symbol: '1810', name: 'Xiaomi Corp', type: 'stock' },
  ],
  XETRA: [
    { symbol: 'SAP', name: 'SAP SE', type: 'stock' },
    { symbol: 'SIE', name: 'Siemens AG', type: 'stock' },
    { symbol: 'ALV', name: 'Allianz SE', type: 'stock' },
    { symbol: 'DTE', name: 'Deutsche Telekom', type: 'stock' },
    { symbol: 'BAS', name: 'BASF SE', type: 'stock' },
    { symbol: 'MBG', name: 'Mercedes-Benz', type: 'stock' },
    { symbol: 'BMW', name: 'BMW AG', type: 'stock' },
    { symbol: 'MUV2', name: 'Munich Re', type: 'stock' },
    { symbol: 'VOW3', name: 'Volkswagen AG', type: 'stock' },
    { symbol: 'ADS', name: 'Adidas AG', type: 'stock' },
  ],
  EURONEXT: [
    { symbol: 'OR', name: "L'Oréal", type: 'stock' },
    { symbol: 'MC', name: 'LVMH', type: 'stock' },
    { symbol: 'TTE', name: 'TotalEnergies', type: 'stock' },
    { symbol: 'SAN', name: 'Sanofi', type: 'stock' },
    { symbol: 'AIR', name: 'Airbus SE', type: 'stock' },
    { symbol: 'BNP', name: 'BNP Paribas', type: 'stock' },
    { symbol: 'AI', name: 'Air Liquide', type: 'stock' },
    { symbol: 'SU', name: 'Schneider Electric', type: 'stock' },
    { symbol: 'EL', name: 'EssilorLuxottica', type: 'stock' },
    { symbol: 'KER', name: 'Kering', type: 'stock' },
  ],
  ASX: [
    { symbol: 'BHP', name: 'BHP Group', type: 'stock' },
    { symbol: 'CBA', name: 'Commonwealth Bank', type: 'stock' },
    { symbol: 'CSL', name: 'CSL Limited', type: 'stock' },
    { symbol: 'NAB', name: 'National Australia Bank', type: 'stock' },
    { symbol: 'WBC', name: 'Westpac Banking', type: 'stock' },
    { symbol: 'ANZ', name: 'ANZ Group', type: 'stock' },
    { symbol: 'WES', name: 'Wesfarmers', type: 'stock' },
    { symbol: 'MQG', name: 'Macquarie Group', type: 'stock' },
    { symbol: 'FMG', name: 'Fortescue Metals', type: 'stock' },
    { symbol: 'RIO', name: 'Rio Tinto', type: 'stock' },
  ],
  TSX: [
    { symbol: 'RY', name: 'Royal Bank of Canada', type: 'stock' },
    { symbol: 'TD', name: 'Toronto-Dominion Bank', type: 'stock' },
    { symbol: 'ENB', name: 'Enbridge Inc', type: 'stock' },
    { symbol: 'CNR', name: 'Canadian National Railway', type: 'stock' },
    { symbol: 'BMO', name: 'Bank of Montreal', type: 'stock' },
    { symbol: 'CP', name: 'Canadian Pacific', type: 'stock' },
    { symbol: 'BN', name: 'Brookfield Corp', type: 'stock' },
    { symbol: 'BCE', name: 'BCE Inc', type: 'stock' },
    { symbol: 'SHOP', name: 'Shopify Inc', type: 'stock' },
    { symbol: 'SU', name: 'Suncor Energy', type: 'stock' },
  ],
};

const CRYPTO_TICKERS: TickerEntry[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
];

// Get tickers for the selected market
const getPopularTickers = (marketId: string): TickerEntry[] => {
  return POPULAR_TICKERS_BY_MARKET[marketId] || POPULAR_TICKERS_BY_MARKET['US'];
};

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
    const popularTickers = getPopularTickers(selectedMarket);
    const ticker = popularTickers.find(t => t.symbol === symbol);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Database className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">
                <strong>{cacheStats.count}</strong> cached items ({formatBytes(cacheStats.totalSize)})
              </span>
              {cacheStats.symbols.length > 0 && (
                <span className="text-xs text-muted-foreground truncate">
                  • {cacheStats.symbols.slice(0, 5).join(', ')}
                  {cacheStats.symbols.length > 5 && ` +${cacheStats.symbols.length - 5} more`}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCache}
              className="text-xs h-7 self-start sm:self-auto"
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
              <span className="text-xs text-muted-foreground mr-2">Popular ({currentMarket.name}):</span>
              {getPopularTickers(selectedMarket).slice(0, 8).map(ticker => (
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
              {CRYPTO_TICKERS.map(ticker => (
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 sm:items-end">
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

          <div className="flex items-center gap-2 sm:pb-0.5">
            <Button
              variant={forceRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForceRefresh(!forceRefresh)}
              className="text-xs h-9 w-full sm:w-auto"
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
