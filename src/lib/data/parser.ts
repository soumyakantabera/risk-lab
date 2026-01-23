// CSV parsing and data handling
import Papa from 'papaparse';
import { calculateLogReturns, calculateSimpleReturns } from '../risk/statistics';
import type { DataPoint, PortfolioAsset, DatasetInfo } from '../risk/types';

interface ParsedRow {
  date: string;
  [key: string]: string | number;
}

interface ParseResult {
  success: boolean;
  data: PortfolioAsset[];
  errors: string[];
  info: DatasetInfo;
}

/**
 * Parse CSV file to portfolio assets
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const errors: string[] = [];
        
        if (results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
        }
        
        const rows = results.data as ParsedRow[];
        if (rows.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['No data found in CSV'],
            info: createEmptyDatasetInfo(),
          });
          return;
        }
        
        // Detect columns
        const headers = Object.keys(rows[0]);
        const dateColumn = headers.find(h => 
          h.toLowerCase().includes('date') || 
          h.toLowerCase() === 'time' ||
          h.toLowerCase() === 'timestamp'
        );
        
        if (!dateColumn) {
          resolve({
            success: false,
            data: [],
            errors: ['No date column found. Expected a column named "date", "time", or "timestamp".'],
            info: createEmptyDatasetInfo(),
          });
          return;
        }
        
        // Get value columns (price or return)
        const valueColumns = headers.filter(h => 
          h !== dateColumn && 
          !h.toLowerCase().includes('volume') &&
          typeof rows[0][h] === 'number'
        );
        
        if (valueColumns.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['No numeric columns found for prices or returns.'],
            info: createEmptyDatasetInfo(),
          });
          return;
        }
        
        // Parse data for each asset
        const assets: PortfolioAsset[] = [];
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        
        for (const column of valueColumns) {
          const dataPoints: DataPoint[] = [];
          
          for (const row of rows) {
            const dateStr = row[dateColumn];
            const value = row[column];
            
            if (!dateStr || value === null || value === undefined) continue;
            
            const date = parseDate(String(dateStr));
            if (!date) {
              errors.push(`Invalid date: ${dateStr}`);
              continue;
            }
            
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
            
            // Detect if it's a price (typically > 1) or return (typically small decimal)
            const numValue = Number(value);
            if (isNaN(numValue)) continue;
            
            const isPrice = Math.abs(numValue) > 1;
            
            dataPoints.push({
              date,
              price: isPrice ? numValue : undefined,
              return: isPrice ? undefined : numValue,
            });
          }
          
          if (dataPoints.length > 0) {
            // Sort by date
            dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
            
            assets.push({
              id: column.toLowerCase().replace(/\s+/g, '-'),
              name: column,
              weight: 1 / valueColumns.length,
              data: dataPoints,
            });
          }
        }
        
        const info: DatasetInfo = {
          id: file.name.replace('.csv', '').toLowerCase().replace(/\s+/g, '-'),
          name: file.name.replace('.csv', ''),
          description: `Uploaded dataset with ${assets.length} asset(s)`,
          type: assets.length > 1 ? 'multi-asset' : 'custom',
          assetCount: assets.length,
          dateRange: {
            start: minDate || new Date(),
            end: maxDate || new Date(),
          },
          observations: assets[0]?.data.length || 0,
        };
        
        resolve({
          success: errors.length === 0 || assets.length > 0,
          data: assets,
          errors,
          info,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [error.message],
          info: createEmptyDatasetInfo(),
        });
      },
    });
  });
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  // Try various formats
  const formats = [
    // ISO
    /^(\d{4})-(\d{2})-(\d{2})/,
    // US format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // European format
    /^(\d{1,2})-(\d{1,2})-(\d{4})/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Fallback to Date constructor
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function createEmptyDatasetInfo(): DatasetInfo {
  return {
    id: '',
    name: '',
    description: '',
    type: 'custom',
    assetCount: 0,
    dateRange: { start: new Date(), end: new Date() },
    observations: 0,
  };
}

/**
 * Extract returns from portfolio assets
 */
export function extractReturns(
  assets: PortfolioAsset[],
  returnType: 'log' | 'simple' = 'log'
): number[] {
  if (assets.length === 0) return [];
  
  if (assets.length === 1) {
    const asset = assets[0];
    
    // If returns are already provided
    if (asset.data[0]?.return !== undefined) {
      return asset.data.map(d => d.return!).filter(r => !isNaN(r));
    }
    
    // Calculate from prices
    const prices = asset.data.map(d => d.price!).filter(p => p !== undefined && !isNaN(p));
    return returnType === 'log' 
      ? calculateLogReturns(prices)
      : calculateSimpleReturns(prices);
  }
  
  // Multi-asset: calculate weighted portfolio returns
  const assetReturns: number[][] = [];
  
  for (const asset of assets) {
    let returns: number[];
    
    if (asset.data[0]?.return !== undefined) {
      returns = asset.data.map(d => d.return!).filter(r => !isNaN(r));
    } else {
      const prices = asset.data.map(d => d.price!).filter(p => p !== undefined && !isNaN(p));
      returns = returnType === 'log'
        ? calculateLogReturns(prices)
        : calculateSimpleReturns(prices);
    }
    
    assetReturns.push(returns);
  }
  
  // Align lengths
  const minLength = Math.min(...assetReturns.map(r => r.length));
  
  // Calculate weighted returns
  const portfolioReturns: number[] = [];
  for (let i = 0; i < minLength; i++) {
    let weightedReturn = 0;
    for (let j = 0; j < assets.length; j++) {
      weightedReturn += assets[j].weight * assetReturns[j][i];
    }
    portfolioReturns.push(weightedReturn);
  }
  
  return portfolioReturns;
}

/**
 * Extract individual asset returns for multi-asset analysis
 */
export function extractAssetReturns(
  assets: PortfolioAsset[],
  returnType: 'log' | 'simple' = 'log'
): number[][] {
  return assets.map(asset => {
    if (asset.data[0]?.return !== undefined) {
      return asset.data.map(d => d.return!).filter(r => !isNaN(r));
    }
    
    const prices = asset.data.map(d => d.price!).filter(p => p !== undefined && !isNaN(p));
    return returnType === 'log'
      ? calculateLogReturns(prices)
      : calculateSimpleReturns(prices);
  });
}

/**
 * Extract dates from portfolio
 */
export function extractDates(assets: PortfolioAsset[]): Date[] {
  if (assets.length === 0) return [];
  
  const dates = assets[0].data.map(d => d.date);
  // Remove first date since returns are calculated from day 2
  return dates.slice(1);
}
