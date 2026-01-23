// Real Market Data APIs for client-side use (GitHub Pages compatible)

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
}

// Yahoo Finance via free CORS proxy services
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

async function fetchWithProxy(url: string): Promise<Response> {
  let lastError: Error | null = null;
  
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        return response;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
    }
  }
  
  throw lastError || new Error('All proxies failed');
}

// Fetch from Yahoo Finance v8 chart API
export async function fetchYahooFinance(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<FetchedAssetData> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  
  const response = await fetchWithProxy(url);
  const json = await response.json();
  
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
  };
}

// Alternative: Fetch from Polygon.io free tier (requires API key but has generous free tier)
// This is commented out but available if you add POLYGON_API_KEY
/*
export async function fetchPolygon(
  symbol: string,
  startDate: Date,
  endDate: Date,
  apiKey: string
): Promise<FetchedAssetData> {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${start}/${end}?adjusted=true&sort=asc&apiKey=${apiKey}`;
  
  const response = await fetch(url);
  const json = await response.json();
  
  if (json.status !== 'OK' || !json.results) {
    throw new Error(json.message || 'Polygon API error');
  }
  
  const data: MarketDataPoint[] = json.results.map((r: any) => ({
    date: new Date(r.t),
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v,
  }));
  
  return {
    symbol: symbol.toUpperCase(),
    name: symbol,
    data,
    currency: 'USD',
  };
}
*/

// Cryptocurrency data from CoinGecko (no API key needed)
export async function fetchCryptoData(
  coinId: string,
  days: number = 365
): Promise<FetchedAssetData> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  const json = await response.json();
  
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
};

// Smart fetcher that tries Yahoo first, then CoinGecko for crypto
export async function fetchMarketData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<FetchedAssetData> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check if it's a known cryptocurrency
  const cryptoId = CRYPTO_MAP[upperSymbol];
  
  if (cryptoId) {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return fetchCryptoData(cryptoId, Math.min(days, 365)); // CoinGecko free tier limited to 365 days
  }
  
  // Try Yahoo Finance for stocks/ETFs
  return fetchYahooFinance(symbol, startDate, endDate);
}

// Batch fetch multiple symbols
export async function fetchMultipleAssets(
  symbols: string[],
  startDate: Date,
  endDate: Date,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, FetchedAssetData | Error>> {
  const results = new Map<string, FetchedAssetData | Error>();
  
  // Fetch sequentially to avoid rate limits
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    try {
      const data = await fetchMarketData(symbol, startDate, endDate);
      results.set(symbol, data);
    } catch (err) {
      results.set(symbol, err instanceof Error ? err : new Error('Unknown error'));
    }
    
    onProgress?.(i + 1, symbols.length);
    
    // Small delay between requests to be nice to APIs
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return results;
}

// Calculate returns from price data
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
