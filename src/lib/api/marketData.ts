// Real Market Data APIs for client-side use (GitHub Pages compatible)
// Enhanced with caching, retry logic, multiple fallback proxies, and Alpha Vantage support

export interface MarketDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FetchedAssetData {
  symbol: string;
  name: string;
  data: MarketDataPoint[];
  currency: string;
  source: 'yahoo' | 'alphavantage' | 'coingecko' | 'cache';
  cachedAt?: number;
}

// ============= CACHE LAYER =============
const CACHE_PREFIX = 'risklab_market_';
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

interface CachedData {
  data: FetchedAssetData;
  timestamp: number;
  expiresAt: number;
}

function getCacheKey(symbol: string, startDate: Date, endDate: Date): string {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  return `${CACHE_PREFIX}${symbol.toUpperCase()}_${start}_${end}`;
}

function getFromCache(symbol: string, startDate: Date, endDate: Date): FetchedAssetData | null {
  try {
    const key = getCacheKey(symbol, startDate, endDate);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const parsed: CachedData = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Restore Date objects
    const data: FetchedAssetData = {
      ...parsed.data,
      data: parsed.data.data.map(d => ({
        ...d,
        date: new Date(d.date),
      })),
      source: 'cache',
      cachedAt: parsed.timestamp,
    };
    
    return data;
  } catch {
    return null;
  }
}

function saveToCache(data: FetchedAssetData, startDate: Date, endDate: Date): void {
  try {
    const key = getCacheKey(data.symbol, startDate, endDate);
    const cached: CachedData = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // localStorage might be full, clear old cache entries
    clearOldCache();
  }
}

export function clearOldCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed: CachedData = JSON.parse(cached);
          if (Date.now() > parsed.expiresAt) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore errors
  }
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

// ============= CORS PROXIES =============
// Multiple fallback proxies for reliability - ordered by reliability
const CORS_PROXIES = [
  { url: 'https://api.allorigins.win/raw?url=', name: 'AllOrigins' },
  { url: 'https://corsproxy.org/?', name: 'CorsProxy.org' }, // Different from corsproxy.io
  { url: 'https://proxy.cors.sh/', name: 'CorsShProxy' },
  { url: 'https://thingproxy.freeboard.io/fetch/', name: 'ThingProxy' },
  { url: 'https://yacdn.org/proxy/', name: 'YaCDN' },
];

// ============= RETRY LOGIC =============
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry on client errors (4xx) except rate limits
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
      
      // Don't retry on abort
      if (lastError.name === 'AbortError') {
        throw new Error('Request timeout');
      }
    }
    
    // Wait before retrying (except on last attempt)
    if (attempt < config.maxRetries) {
      await sleep(calculateBackoff(attempt, config));
    }
  }
  
  throw lastError || new Error('All retries failed');
}

async function fetchWithProxy(url: string): Promise<Response> {
  let lastError: Error | null = null;
  
  for (const proxy of CORS_PROXIES) {
    try {
      console.log(`[MarketData] Trying ${proxy.name} proxy...`);
      const response = await fetchWithRetry(
        proxy.url + encodeURIComponent(url),
        { headers: { 'Accept': 'application/json' } },
        { maxRetries: 1, baseDelay: 500, maxDelay: 2000 }
      );
      
      // Check if response looks like valid JSON before returning
      // Some proxies return error text instead of JSON
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        // Clone and check the first few bytes
        const clone = response.clone();
        const text = await clone.text();
        if (text.startsWith('Edge:') || text.includes('Too Many Requests') || text.includes('error')) {
          throw new Error(`Proxy returned error: ${text.slice(0, 100)}`);
        }
        // If it looks like JSON anyway, continue
        if (!text.startsWith('{') && !text.startsWith('[')) {
          throw new Error(`Invalid response format from ${proxy.name}`);
        }
      }
      
      console.log(`[MarketData] ${proxy.name} succeeded`);
      return response;
    } catch (err) {
      console.warn(`[MarketData] ${proxy.name} failed:`, err);
      lastError = err instanceof Error ? err : new Error('Unknown error');
    }
  }
  
  throw lastError || new Error('All CORS proxies failed. Try again in a few minutes or use cached data.');
}

// ============= YAHOO FINANCE =============
export async function fetchYahooFinance(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<FetchedAssetData> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  
  const response = await fetchWithProxy(url);
  
  // Parse response text first to handle non-JSON errors
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from Yahoo Finance: ${text.slice(0, 100)}...`);
  }
  
  if (json.chart?.error) {
    throw new Error(json.chart.error.description || 'Yahoo Finance API error');
  }
  
  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error(`No data found for ${symbol}`);
  }
  
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose || quote.close || [];
  
  const data: MarketDataPoint[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    const close = adjClose[i] ?? quote.close?.[i];
    if (close != null && !isNaN(close)) {
      data.push({
        date: new Date(timestamps[i] * 1000),
        open: quote.open?.[i] ?? close,
        high: quote.high?.[i] ?? close,
        low: quote.low?.[i] ?? close,
        close,
        volume: quote.volume?.[i] ?? 0,
      });
    }
  }
  
  if (data.length === 0) {
    throw new Error(`No valid price data for ${symbol}`);
  }
  
  return {
    symbol: symbol.toUpperCase(),
    name: result.meta?.longName || result.meta?.shortName || symbol,
    data,
    currency: result.meta?.currency || 'USD',
    source: 'yahoo',
  };
}

// ============= ALPHA VANTAGE (FREE TIER) =============
// Free tier: 25 requests/day - use as fallback
const ALPHA_VANTAGE_API_KEY = 'demo'; // Use 'demo' for limited testing or get free key at alphavantage.co

export async function fetchAlphaVantage(
  symbol: string,
  apiKey: string = ALPHA_VANTAGE_API_KEY
): Promise<FetchedAssetData> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
  
  const response = await fetchWithRetry(url, {
    headers: { 'Accept': 'application/json' },
  });
  
  const json = await response.json();
  
  // Check for API errors
  if (json['Error Message']) {
    throw new Error(json['Error Message']);
  }
  
  if (json['Note']) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }
  
  const timeSeries = json['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error(`No data found for ${symbol}`);
  }
  
  const data: MarketDataPoint[] = Object.entries(timeSeries)
    .map(([dateStr, values]: [string, any]) => ({
      date: new Date(dateStr),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['5. adjusted close'] || values['4. close']),
      volume: parseInt(values['6. volume'] || values['5. volume'] || '0'),
    }))
    .filter(d => !isNaN(d.close) && d.close > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  if (data.length === 0) {
    throw new Error(`No valid price data for ${symbol}`);
  }
  
  const meta = json['Meta Data'] || {};
  
  return {
    symbol: symbol.toUpperCase(),
    name: meta['2. Symbol'] || symbol,
    data,
    currency: 'USD',
    source: 'alphavantage',
  };
}

// ============= COINGECKO (CRYPTO) =============
export async function fetchCryptoData(
  coinId: string,
  days: number = 365
): Promise<FetchedAssetData> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  
  const response = await fetchWithRetry(url, {
    headers: { 'Accept': 'application/json' },
  });
  
  const json = await response.json();
  
  if (json.error) {
    throw new Error(json.error);
  }
  
  if (!json.prices || json.prices.length === 0) {
    throw new Error(`No data found for ${coinId}`);
  }
  
  const data: MarketDataPoint[] = json.prices.map((p: [number, number]) => ({
    date: new Date(p[0]),
    open: p[1],
    high: p[1],
    low: p[1],
    close: p[1],
    volume: 0,
  }));
  
  return {
    symbol: coinId.toUpperCase(),
    name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
    data,
    currency: 'USD',
    source: 'coingecko',
  };
}

// Map of crypto tickers to CoinGecko IDs
export const CRYPTO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
};

// Market/Exchange suffixes for Yahoo Finance
export interface MarketInfo {
  id: string;
  name: string;
  suffix: string;
  currency: string;
  region: string;
}

export const MARKETS: MarketInfo[] = [
  { id: 'US', name: 'US (NYSE, NASDAQ)', suffix: '', currency: 'USD', region: 'Americas' },
  { id: 'NSE', name: 'NSE India', suffix: '.NS', currency: 'INR', region: 'Asia' },
  { id: 'BSE', name: 'BSE India', suffix: '.BO', currency: 'INR', region: 'Asia' },
  { id: 'LSE', name: 'London Stock Exchange', suffix: '.L', currency: 'GBP', region: 'Europe' },
  { id: 'TSE', name: 'Tokyo Stock Exchange', suffix: '.T', currency: 'JPY', region: 'Asia' },
  { id: 'HKEX', name: 'Hong Kong Exchange', suffix: '.HK', currency: 'HKD', region: 'Asia' },
  { id: 'SSE', name: 'Shanghai (A-shares)', suffix: '.SS', currency: 'CNY', region: 'Asia' },
  { id: 'SZSE', name: 'Shenzhen (A-shares)', suffix: '.SZ', currency: 'CNY', region: 'Asia' },
  { id: 'TSX', name: 'Toronto Stock Exchange', suffix: '.TO', currency: 'CAD', region: 'Americas' },
  { id: 'ASX', name: 'Australian Stock Exchange', suffix: '.AX', currency: 'AUD', region: 'Oceania' },
  { id: 'FRA', name: 'Frankfurt Stock Exchange', suffix: '.F', currency: 'EUR', region: 'Europe' },
  { id: 'EPA', name: 'Euronext Paris', suffix: '.PA', currency: 'EUR', region: 'Europe' },
  { id: 'AMS', name: 'Euronext Amsterdam', suffix: '.AS', currency: 'EUR', region: 'Europe' },
  { id: 'SIX', name: 'Swiss Exchange', suffix: '.SW', currency: 'CHF', region: 'Europe' },
  { id: 'KRX', name: 'Korea Exchange', suffix: '.KS', currency: 'KRW', region: 'Asia' },
  { id: 'SGX', name: 'Singapore Exchange', suffix: '.SI', currency: 'SGD', region: 'Asia' },
];

// Build Yahoo symbol with market suffix
export function buildYahooSymbol(ticker: string, marketId: string): string {
  const market = MARKETS.find(m => m.id === marketId);
  if (!market || market.id === 'US') return ticker.toUpperCase();
  return `${ticker.toUpperCase()}${market.suffix}`;
}

// ============= SMART FETCHER WITH FALLBACKS =============
export interface FetchOptions {
  useCache?: boolean;
  alphaVantageKey?: string;
  forceRefresh?: boolean;
  marketId?: string; // Exchange/market identifier
}

export async function fetchMarketData(
  symbol: string,
  startDate: Date,
  endDate: Date,
  options: FetchOptions = {}
): Promise<FetchedAssetData> {
  const { useCache = true, alphaVantageKey, forceRefresh = false, marketId = 'US' } = options;
  
  // Build the full symbol with market suffix
  const upperSymbol = symbol.toUpperCase();
  const yahooSymbol = buildYahooSymbol(upperSymbol, marketId);
  const cacheKey = yahooSymbol; // Use full symbol for cache
  
  // Check cache first (unless force refresh)
  if (useCache && !forceRefresh) {
    const cached = getFromCache(cacheKey, startDate, endDate);
    if (cached) {
      console.log(`[MarketData] Cache hit for ${cacheKey}`);
      return cached;
    }
  }
  
  let data: FetchedAssetData;
  let errors: string[] = [];
  
  // Check if it's a known cryptocurrency (no market suffix needed)
  const cryptoId = CRYPTO_MAP[upperSymbol];
  
  if (cryptoId) {
    // Crypto: use CoinGecko
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    try {
      data = await fetchCryptoData(cryptoId, Math.min(days, 365));
    } catch (cryptoError) {
      const cryptoMessage = cryptoError instanceof Error ? cryptoError.message : 'Unknown error';
      throw new Error(`Failed to fetch crypto ${upperSymbol}: ${cryptoMessage}. CoinGecko may be rate-limited.`);
    }
  } else {
    // Stocks/ETFs: try Yahoo first with market-specific symbol
    try {
      console.log(`[MarketData] Fetching ${yahooSymbol} from Yahoo Finance...`);
      data = await fetchYahooFinance(yahooSymbol, startDate, endDate);
      
      // Update symbol to show original ticker (without suffix) for cleaner display
      data = { ...data, symbol: upperSymbol };
    } catch (yahooError) {
      const yahooMessage = yahooError instanceof Error ? yahooError.message : 'Unknown error';
      errors.push(`Yahoo (${yahooSymbol}): ${yahooMessage}`);
      console.warn(`[MarketData] Yahoo Finance failed for ${yahooSymbol}:`, yahooError);
      
      // Try Alpha Vantage as fallback (only for US market)
      if (marketId === 'US') {
        try {
          console.log(`[MarketData] Trying Alpha Vantage for ${upperSymbol}...`);
          const fullData = await fetchAlphaVantage(upperSymbol, alphaVantageKey);
          
          // Filter to requested date range
          data = {
            ...fullData,
            data: fullData.data.filter(
              d => d.date >= startDate && d.date <= endDate
            ),
          };
          
          if (data.data.length === 0) {
            throw new Error('No data in requested date range');
          }
        } catch (avError) {
          const avMessage = avError instanceof Error ? avError.message : 'Unknown error';
          errors.push(`Alpha Vantage: ${avMessage}`);
          console.warn(`[MarketData] Alpha Vantage failed for ${upperSymbol}:`, avError);
          
          throw new Error(`Failed to fetch ${upperSymbol}. ${errors.join('; ')}. Check if the ticker symbol is correct.`);
        }
      } else {
        // Non-US markets: provide helpful error message
        const market = MARKETS.find(m => m.id === marketId);
        throw new Error(`Failed to fetch ${upperSymbol} from ${market?.name || marketId}. ${errors.join('; ')}. Verify the ticker exists on this exchange.`);
      }
    }
  }
  
  // Save to cache using full symbol
  if (useCache) {
    const dataToCache = { ...data, symbol: cacheKey };
    saveToCache(dataToCache, startDate, endDate);
    data = { ...data, symbol: upperSymbol }; // Keep display symbol clean
  }
  
  return data;
}

// ============= BATCH FETCH =============
export async function fetchMultipleAssets(
  symbols: string[],
  startDate: Date,
  endDate: Date,
  onProgress?: (completed: number, total: number) => void,
  options: FetchOptions = {}
): Promise<Map<string, FetchedAssetData | Error>> {
  const results = new Map<string, FetchedAssetData | Error>();
  
  // Fetch sequentially to avoid rate limits
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    try {
      const data = await fetchMarketData(symbol, startDate, endDate, options);
      results.set(symbol, data);
    } catch (err) {
      results.set(symbol, err instanceof Error ? err : new Error('Unknown error'));
    }
    
    onProgress?.(i + 1, symbols.length);
    
    // Delay between requests (shorter if using cache)
    if (i < symbols.length - 1) {
      const wasCached = results.get(symbol) instanceof Error === false && 
                       (results.get(symbol) as FetchedAssetData)?.source === 'cache';
      await sleep(wasCached ? 100 : 500);
    }
  }
  
  return results;
}

// ============= UTILITIES =============
export function calculateReturnsFromPrices(
  prices: number[],
  type: 'log' | 'simple' = 'log'
): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      if (type === 'log') {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      } else {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
  }
  
  return returns;
}

// Get cache statistics
export function getCacheStats(): { count: number; totalSize: number; symbols: string[] } {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    let totalSize = 0;
    const symbols: string[] = [];
    
    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length;
        const symbolMatch = key.replace(CACHE_PREFIX, '').split('_')[0];
        if (symbolMatch && !symbols.includes(symbolMatch)) {
          symbols.push(symbolMatch);
        }
      }
    });
    
    return { count: keys.length, totalSize, symbols };
  } catch {
    return { count: 0, totalSize: 0, symbols: [] };
  }
}
