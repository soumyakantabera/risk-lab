// FX Risk Engine - ES/VaR calculations for invoice exposures
import type { 
  Invoice, FXRate, Hedge, RegimeState, RegimeWeights, 
  RiskResult, ComponentES, MarginalES, HedgeAction, HedgePlan,
  ExposureSummary, TimeBucket, TIME_BUCKETS, REGIME_WEIGHTS
} from './types';
import { stdDev, mean } from '@/lib/risk/statistics';

// Calculate FX returns from rate history
export function calculateFXReturns(rates: FXRate[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < rates.length; i++) {
    if (rates[i].rate > 0 && rates[i - 1].rate > 0) {
      returns.push(Math.log(rates[i].rate / rates[i - 1].rate));
    }
  }
  return returns;
}

// Get exposure summary by currency
export function calculateExposureSummary(
  invoices: Invoice[],
  hedges: Hedge[],
  bucket: TimeBucket
): ExposureSummary[] {
  const today = new Date();
  const bucketEnd = new Date(today);
  bucketEnd.setDate(bucketEnd.getDate() + bucket.endDay);
  
  const currencies = new Set(invoices.map(i => i.currency));
  const summaries: ExposureSummary[] = [];
  
  currencies.forEach(currency => {
    const relevantInvoices = invoices.filter(i => {
      const daysUntilDue = Math.ceil((i.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return i.currency === currency && daysUntilDue >= bucket.startDay && daysUntilDue <= bucket.endDay;
    });
    
    const receivable = relevantInvoices
      .filter(i => i.type === 'receivable')
      .reduce((sum, i) => sum + i.amount, 0);
    
    const payable = relevantInvoices
      .filter(i => i.type === 'payable')
      .reduce((sum, i) => sum + i.amount, 0);
    
    const net = receivable - payable;
    
    // Calculate hedged amount for this currency/bucket
    const pair = `EUR${currency}`;
    const relevantHedges = hedges.filter(h => {
      return h.pair === pair && h.endDate >= today && h.startDate <= bucketEnd;
    });
    const hedged = relevantHedges.reduce((sum, h) => sum + h.notional, 0);
    
    summaries.push({
      currency,
      receivable,
      payable,
      net,
      hedged: Math.min(Math.abs(hedged), Math.abs(net)),
      unhedged: Math.max(0, Math.abs(net) - hedged),
    });
  });
  
  return summaries;
}

// Detect regime based on recent volatility
export function detectRegime(returns: number[], lookback: number = 20): RegimeState {
  if (returns.length < lookback * 2) return 'normal';
  
  const recentReturns = returns.slice(-lookback);
  const historicalReturns = returns.slice(-lookback * 4, -lookback);
  
  const recentVol = stdDev(recentReturns);
  const historicalVol = stdDev(historicalReturns);
  
  const volRatio = recentVol / historicalVol;
  
  // Calculate recent kurtosis as additional signal
  const recentMean = mean(recentReturns);
  const m4 = mean(recentReturns.map(r => Math.pow(r - recentMean, 4)));
  const m2 = mean(recentReturns.map(r => Math.pow(r - recentMean, 2)));
  const kurtosis = m4 / (m2 * m2) - 3;
  
  if (volRatio < 0.8 && kurtosis < 1) return 'calm';
  if (volRatio > 1.5 || kurtosis > 3) return 'stress';
  return 'normal';
}

// Historical Simulation VaR/ES
function historicalSimulation(
  returns: number[],
  exposure: number,
  confidence: number
): { var: number; es: number } {
  const losses = returns.map(r => -r * exposure);
  losses.sort((a, b) => b - a); // Descending
  
  const varIndex = Math.floor(losses.length * (1 - confidence));
  const varValue = losses[varIndex] || 0;
  
  const tailLosses = losses.slice(0, varIndex + 1);
  const esValue = tailLosses.length > 0 ? mean(tailLosses) : varValue;
  
  return { var: varValue, es: esValue };
}

// EWMA volatility VaR/ES
function ewmaSimulation(
  returns: number[],
  exposure: number,
  confidence: number,
  lambda: number = 0.94
): { var: number; es: number } {
  // Calculate EWMA variance
  let variance = returns.slice(0, 20).reduce((sum, r) => sum + r * r, 0) / 20;
  
  for (let i = 20; i < returns.length; i++) {
    variance = lambda * variance + (1 - lambda) * returns[i] * returns[i];
  }
  
  const vol = Math.sqrt(variance);
  
  // Assume normal distribution with EWMA vol
  const zScore = confidence === 0.99 ? 2.326 : confidence === 0.95 ? 1.645 : 1.282;
  const varValue = zScore * vol * exposure;
  
  // ES for normal distribution
  const phi = Math.exp(-zScore * zScore / 2) / Math.sqrt(2 * Math.PI);
  const esValue = vol * exposure * phi / (1 - confidence);
  
  return { var: varValue, es: esValue };
}

// Student-t VaR/ES
function studentTSimulation(
  returns: number[],
  exposure: number,
  confidence: number,
  df: number = 5
): { var: number; es: number } {
  const vol = stdDev(returns);
  
  // Approximate t-distribution quantiles
  const tQuantiles: Record<number, Record<number, number>> = {
    0.99: { 5: 3.365, 6: 3.143, 7: 2.998 },
    0.95: { 5: 2.015, 6: 1.943, 7: 1.895 },
    0.90: { 5: 1.476, 6: 1.440, 7: 1.415 },
  };
  
  const tScore = tQuantiles[confidence]?.[df] || 2.326;
  const scaledVol = vol * Math.sqrt((df - 2) / df);
  const varValue = tScore * scaledVol * exposure;
  
  // ES for t-distribution (approximation)
  const esMultiplier = (df + tScore * tScore) / (df - 1);
  const esValue = varValue * esMultiplier * 0.6; // Simplified
  
  return { var: varValue, es: esValue };
}

// Monte Carlo simulation
function monteCarloSimulation(
  returns: number[],
  exposure: number,
  confidence: number,
  simulations: number = 10000
): { var: number; es: number } {
  const vol = stdDev(returns);
  const mu = mean(returns);
  
  // Generate simulated losses
  const losses: number[] = [];
  for (let i = 0; i < simulations; i++) {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const simulatedReturn = mu + vol * z;
    losses.push(-simulatedReturn * exposure);
  }
  
  losses.sort((a, b) => b - a);
  
  const varIndex = Math.floor(simulations * (1 - confidence));
  const varValue = losses[varIndex];
  const tailLosses = losses.slice(0, varIndex + 1);
  const esValue = mean(tailLosses);
  
  return { var: varValue, es: esValue };
}

// Filtered Historical Simulation
function filteredHSSimulation(
  returns: number[],
  exposure: number,
  confidence: number,
  lambda: number = 0.94
): { var: number; es: number } {
  // Calculate EWMA volatility series
  const vols: number[] = [];
  let variance = returns.slice(0, 20).reduce((sum, r) => sum + r * r, 0) / 20;
  
  for (let i = 0; i < returns.length; i++) {
    if (i >= 20) {
      variance = lambda * variance + (1 - lambda) * returns[i] * returns[i];
    }
    vols.push(Math.sqrt(variance));
  }
  
  const currentVol = vols[vols.length - 1];
  
  // Standardize returns and re-scale by current vol
  const scaledLosses = returns.map((r, i) => {
    const standardized = r / (vols[i] || currentVol);
    return -standardized * currentVol * exposure;
  });
  
  scaledLosses.sort((a, b) => b - a);
  
  const varIndex = Math.floor(scaledLosses.length * (1 - confidence));
  const varValue = scaledLosses[varIndex];
  const tailLosses = scaledLosses.slice(0, varIndex + 1);
  const esValue = mean(tailLosses);
  
  return { var: varValue, es: esValue };
}

// Calculate blended ES using regime weights
export function calculateBlendedES(
  returns: number[],
  exposure: number,
  confidence: number,
  weights: RegimeWeights
): { var: number; es: number; byModel: Record<string, { var: number; es: number }> } {
  const hs = historicalSimulation(returns, exposure, confidence);
  const ewma = ewmaSimulation(returns, exposure, confidence);
  const studentT = studentTSimulation(returns, exposure, confidence);
  const fhs = filteredHSSimulation(returns, exposure, confidence);
  const mc = monteCarloSimulation(returns, exposure, confidence);
  
  const blendedVar = 
    weights.historical * hs.var +
    weights.ewma * ewma.var +
    weights.studentT * studentT.var +
    weights.fhs * fhs.var +
    weights.monteCarlo * mc.var;
  
  const blendedES = 
    weights.historical * hs.es +
    weights.ewma * ewma.es +
    weights.studentT * studentT.es +
    weights.fhs * fhs.es +
    weights.monteCarlo * mc.es;
  
  return {
    var: blendedVar,
    es: blendedES,
    byModel: {
      historical: hs,
      ewma: ewma,
      studentT: studentT,
      fhs: fhs,
      monteCarlo: mc,
    },
  };
}

// Calculate Component ES for attribution
export function calculateComponentES(
  invoices: Invoice[],
  fxReturns: Map<string, number[]>,
  confidence: number,
  currentRates: Map<string, number>
): ComponentES[] {
  const today = new Date();
  const components: ComponentES[] = [];
  
  // Group by currency first
  const byCurrency = new Map<string, Invoice[]>();
  invoices.forEach(inv => {
    const list = byCurrency.get(inv.currency) || [];
    list.push(inv);
    byCurrency.set(inv.currency, list);
  });
  
  let totalES = 0;
  const currencyES: { currency: string; es: number }[] = [];
  
  byCurrency.forEach((invs, currency) => {
    const returns = fxReturns.get(`EUR${currency}`) || [];
    if (returns.length === 0) return;
    
    // Net exposure in EUR
    const netExposure = invs.reduce((sum, inv) => {
      const rate = currentRates.get(`EUR${currency}`) || 1;
      const eurAmount = inv.amount / rate;
      return sum + (inv.type === 'payable' ? -eurAmount : eurAmount);
    }, 0);
    
    const { es } = historicalSimulation(returns, Math.abs(netExposure), confidence);
    currencyES.push({ currency, es });
    totalES += es;
  });
  
  // Convert to components
  currencyES.forEach(({ currency, es }) => {
    components.push({
      id: currency,
      type: 'currency',
      name: `${currency} Exposure`,
      es,
      percentOfTotal: totalES > 0 ? (es / totalES) * 100 : 0,
    });
  });
  
  return components.sort((a, b) => b.es - a.es);
}

// Calculate Marginal ES for hedging decisions
export function calculateMarginalES(
  invoices: Invoice[],
  fxReturns: Map<string, number[]>,
  confidence: number,
  currentRates: Map<string, number>,
  buckets: typeof TIME_BUCKETS
): MarginalES[] {
  const marginals: MarginalES[] = [];
  const epsilon = 1000; // €1,000 hedge increment
  
  buckets.forEach(bucket => {
    const currencies = new Set(invoices.map(i => i.currency));
    
    currencies.forEach(currency => {
      const returns = fxReturns.get(`EUR${currency}`) || [];
      if (returns.length === 0) return;
      
      // Current exposure in bucket
      const bucketInvoices = invoices.filter(inv => {
        const daysUntilDue = Math.ceil((inv.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return inv.currency === currency && daysUntilDue >= bucket.startDay && daysUntilDue <= bucket.endDay;
      });
      
      if (bucketInvoices.length === 0) return;
      
      const rate = currentRates.get(`EUR${currency}`) || 1;
      const netExposure = bucketInvoices.reduce((sum, inv) => {
        const eurAmount = inv.amount / rate;
        return sum + (inv.type === 'payable' ? -eurAmount : eurAmount);
      }, 0);
      
      // Calculate ES with current exposure
      const baseES = historicalSimulation(returns, Math.abs(netExposure), confidence).es;
      
      // Calculate ES with reduced exposure (hedged)
      const hedgedExposure = Math.max(0, Math.abs(netExposure) - epsilon);
      const hedgedES = historicalSimulation(returns, hedgedExposure, confidence).es;
      
      const esReduction = baseES - hedgedES;
      
      marginals.push({
        currency,
        bucket: bucket.label,
        mesPerThousand: esReduction,
        esReduction,
      });
    });
  });
  
  return marginals.sort((a, b) => b.mesPerThousand - a.mesPerThousand);
}

// Generate hedge plan to meet ES limit
export function generateHedgePlan(
  invoices: Invoice[],
  fxReturns: Map<string, number[]>,
  currentRates: Map<string, number>,
  currentES: number,
  esLimit: number,
  confidence: number = 0.99,
  maxHedgeRatio: number = 0.8,
  minTradeSize: number = 2000,
  spreadBps: number = 15
): HedgePlan {
  const actions: HedgeAction[] = [];
  let remainingESGap = currentES - esLimit;
  
  if (remainingESGap <= 0) {
    return {
      actions: [],
      totalCost: 0,
      esBefore: currentES,
      esAfter: currentES,
      limitMet: true,
    };
  }
  
  // Get marginal ES for all buckets
  const buckets = [
    { label: '30D', days: 30, startDay: 0, endDay: 30 },
    { label: '60D', days: 60, startDay: 30, endDay: 60 },
    { label: '90D', days: 90, startDay: 60, endDay: 90 },
  ];
  
  const marginals = calculateMarginalES(invoices, fxReturns, confidence, currentRates, buckets);
  
  // Greedy: pick best ES-reduction-per-cost actions
  let actionId = 1;
  let totalCost = 0;
  let esAfter = currentES;
  
  for (const mes of marginals) {
    if (remainingESGap <= 0) break;
    
    const returns = fxReturns.get(`EUR${mes.currency}`) || [];
    if (returns.length === 0) continue;
    
    // Calculate how much to hedge
    const bucketInvoices = invoices.filter(inv => {
      const daysUntilDue = Math.ceil((inv.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const bucket = buckets.find(b => b.label === mes.bucket);
      return bucket && inv.currency === mes.currency && 
             daysUntilDue >= bucket.startDay && daysUntilDue <= bucket.endDay;
    });
    
    const rate = currentRates.get(`EUR${mes.currency}`) || 1;
    const netExposure = Math.abs(bucketInvoices.reduce((sum, inv) => {
      const eurAmount = inv.amount / rate;
      return sum + (inv.type === 'payable' ? -eurAmount : eurAmount);
    }, 0));
    
    const maxHedgeAmount = netExposure * maxHedgeRatio;
    
    if (maxHedgeAmount < minTradeSize) continue;
    
    // Estimate hedge needed based on MES
    const hedgeNeeded = mes.mesPerThousand > 0 
      ? Math.min(maxHedgeAmount, (remainingESGap / mes.mesPerThousand) * 1000)
      : maxHedgeAmount;
    
    const hedgeAmount = Math.max(minTradeSize, Math.min(hedgeNeeded, maxHedgeAmount));
    const hedgeRatio = hedgeAmount / netExposure;
    const cost = hedgeAmount * (spreadBps / 10000);
    const esReduction = (hedgeAmount / 1000) * mes.mesPerThousand;
    
    actions.push({
      id: `ACT-${String(actionId++).padStart(3, '0')}`,
      currency: mes.currency,
      bucket: mes.bucket,
      notional: Math.round(hedgeAmount),
      hedgePercent: hedgeRatio * 100,
      estimatedCostEur: Math.round(cost),
      esReduction: Math.round(esReduction),
      rationale: `Targets ${mes.currency} ${mes.bucket} bucket with highest marginal ES reduction (€${mes.mesPerThousand.toFixed(0)}/€1k hedged)`,
    });
    
    totalCost += cost;
    esAfter -= esReduction;
    remainingESGap -= esReduction;
  }
  
  return {
    actions,
    totalCost: Math.round(totalCost),
    esBefore: currentES,
    esAfter: Math.max(0, Math.round(esAfter)),
    limitMet: esAfter <= esLimit,
  };
}

// CFaR calculation (Cashflow at Risk)
export function calculateCFaR(
  returns: number[],
  exposure: number,
  confidence: number
): number {
  const losses = returns.map(r => -r * exposure);
  losses.sort((a, b) => b - a);
  
  const index = Math.floor(losses.length * (1 - confidence));
  return losses[index] || 0;
}
