// FX Invoice Risk Context for RiskLab Pro
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  Invoice, FXRate, Hedge, PolicyLimit, RegimeState, RegimeWeights,
  ExposureSummary, RiskResult, ComponentES, MarginalES, HedgePlan,
  FXState, TIME_BUCKETS
} from '@/lib/fx/types';
import { REGIME_WEIGHTS } from '@/lib/fx/types';
import { 
  generateSampleInvoices, 
  generateSampleFXRates, 
  generateSampleHedges 
} from '@/lib/fx/sampleData';
import {
  calculateFXReturns,
  calculateExposureSummary,
  detectRegime,
  calculateBlendedES,
  calculateComponentES,
  calculateMarginalES,
  generateHedgePlan,
  calculateCFaR,
} from '@/lib/fx/riskEngine';

interface FXContextValue extends FXState {
  // Computed values
  exposureSummaries: Map<string, ExposureSummary[]>;
  fxReturns: Map<string, number[]>;
  currentRates: Map<string, number>;
  totalES: number;
  totalCFaR: number;
  componentES: ComponentES[];
  marginalES: MarginalES[];
  hedgeCoverage: number;
  isBreaching: boolean;
  
  // Actions
  loadSampleData: () => void;
  loadInvoices: (invoices: Invoice[]) => void;
  loadFXRates: (rates: FXRate[]) => void;
  loadHedges: (hedges: Hedge[]) => void;
  setESLimit: (limit: number) => void;
  setRegimeAuto: (auto: boolean) => void;
  setModelWeights: (weights: RegimeWeights) => void;
  generateHedgePlanAction: () => HedgePlan;
  clearData: () => void;
}

const FXContext = createContext<FXContextValue | null>(null);

const TIME_BUCKETS_DATA = [
  { label: '7D', days: 7, startDay: 0, endDay: 7 },
  { label: '30D', days: 30, startDay: 0, endDay: 30 },
  { label: '60D', days: 60, startDay: 0, endDay: 60 },
  { label: '90D', days: 90, startDay: 0, endDay: 90 },
];

export function FXProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FXState>({
    invoices: [],
    fxRates: new Map(),
    hedges: [],
    limits: [],
    baseCurrency: 'EUR',
    regime: 'normal',
    regimeAuto: true,
    modelWeights: REGIME_WEIGHTS.normal,
    esLimit: 50000,
  });
  
  // Calculate FX returns from rates
  const fxReturns = useMemo(() => {
    const returns = new Map<string, number[]>();
    state.fxRates.forEach((rates, pair) => {
      returns.set(pair, calculateFXReturns(rates));
    });
    return returns;
  }, [state.fxRates]);
  
  // Get current (latest) rates
  const currentRates = useMemo(() => {
    const rates = new Map<string, number>();
    state.fxRates.forEach((rateHistory, pair) => {
      if (rateHistory.length > 0) {
        rates.set(pair, rateHistory[rateHistory.length - 1].rate);
      }
    });
    return rates;
  }, [state.fxRates]);
  
  // Auto-detect regime
  useEffect(() => {
    if (!state.regimeAuto || fxReturns.size === 0) return;
    
    // Use EUR/USD as primary signal
    const eurusdReturns = fxReturns.get('EURUSD') || [];
    if (eurusdReturns.length > 40) {
      const detectedRegime = detectRegime(eurusdReturns);
      setState(s => ({
        ...s,
        regime: detectedRegime,
        modelWeights: REGIME_WEIGHTS[detectedRegime],
      }));
    }
  }, [fxReturns, state.regimeAuto]);
  
  // Calculate exposure summaries for all buckets
  const exposureSummaries = useMemo(() => {
    const summaries = new Map<string, ExposureSummary[]>();
    TIME_BUCKETS_DATA.forEach(bucket => {
      summaries.set(bucket.label, calculateExposureSummary(state.invoices, state.hedges, bucket));
    });
    return summaries;
  }, [state.invoices, state.hedges]);
  
  // Calculate total ES (30D bucket, 99% confidence)
  const totalES = useMemo(() => {
    if (state.invoices.length === 0 || fxReturns.size === 0) return 0;
    
    let totalES = 0;
    const bucket30D = TIME_BUCKETS_DATA.find(b => b.label === '30D')!;
    const summaries = exposureSummaries.get('30D') || [];
    
    summaries.forEach(summary => {
      const returns = fxReturns.get(`EUR${summary.currency}`) || [];
      if (returns.length === 0) return;
      
      const { es } = calculateBlendedES(returns, summary.unhedged, 0.99, state.modelWeights);
      totalES += es;
    });
    
    return totalES;
  }, [state.invoices, fxReturns, exposureSummaries, state.modelWeights]);
  
  // Calculate CFaR (95%)
  const totalCFaR = useMemo(() => {
    if (state.invoices.length === 0 || fxReturns.size === 0) return 0;
    
    let cfar = 0;
    const summaries = exposureSummaries.get('30D') || [];
    
    summaries.forEach(summary => {
      const returns = fxReturns.get(`EUR${summary.currency}`) || [];
      if (returns.length === 0) return;
      
      cfar += calculateCFaR(returns, summary.unhedged, 0.95);
    });
    
    return cfar;
  }, [state.invoices, fxReturns, exposureSummaries]);
  
  // Component ES attribution
  const componentES = useMemo(() => {
    if (state.invoices.length === 0 || fxReturns.size === 0) return [];
    return calculateComponentES(state.invoices, fxReturns, 0.99, currentRates);
  }, [state.invoices, fxReturns, currentRates]);
  
  // Marginal ES for hedging
  const marginalES = useMemo(() => {
    if (state.invoices.length === 0 || fxReturns.size === 0) return [];
    return calculateMarginalES(state.invoices, fxReturns, 0.99, currentRates, TIME_BUCKETS_DATA);
  }, [state.invoices, fxReturns, currentRates]);
  
  // Hedge coverage %
  const hedgeCoverage = useMemo(() => {
    const summaries = exposureSummaries.get('30D') || [];
    const totalExposure = summaries.reduce((sum, s) => sum + Math.abs(s.net), 0);
    const totalHedged = summaries.reduce((sum, s) => sum + s.hedged, 0);
    return totalExposure > 0 ? (totalHedged / totalExposure) * 100 : 0;
  }, [exposureSummaries]);
  
  // Check if breaching limit
  const isBreaching = totalES > state.esLimit;
  
  // Actions
  const loadSampleData = useCallback(() => {
    const invoices = generateSampleInvoices();
    const fxRates = generateSampleFXRates();
    const hedges = generateSampleHedges();
    
    setState(s => ({
      ...s,
      invoices,
      fxRates,
      hedges,
    }));
  }, []);
  
  const loadInvoices = useCallback((invoices: Invoice[]) => {
    setState(s => ({ ...s, invoices }));
  }, []);
  
  const loadFXRates = useCallback((rates: FXRate[]) => {
    const rateMap = new Map<string, FXRate[]>();
    rates.forEach(r => {
      const list = rateMap.get(r.pair) || [];
      list.push(r);
      rateMap.set(r.pair, list);
    });
    // Sort by date
    rateMap.forEach((list, pair) => {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());
      rateMap.set(pair, list);
    });
    setState(s => ({ ...s, fxRates: rateMap }));
  }, []);
  
  const loadHedges = useCallback((hedges: Hedge[]) => {
    setState(s => ({ ...s, hedges }));
  }, []);
  
  const setESLimit = useCallback((limit: number) => {
    setState(s => ({ ...s, esLimit: limit }));
  }, []);
  
  const setRegimeAuto = useCallback((auto: boolean) => {
    setState(s => ({ ...s, regimeAuto: auto }));
  }, []);
  
  const setModelWeights = useCallback((weights: RegimeWeights) => {
    setState(s => ({ ...s, modelWeights: weights, regimeAuto: false }));
  }, []);
  
  const generateHedgePlanAction = useCallback((): HedgePlan => {
    return generateHedgePlan(
      state.invoices,
      fxReturns,
      currentRates,
      totalES,
      state.esLimit,
      0.99,
      0.8,
      2000,
      15
    );
  }, [state.invoices, fxReturns, currentRates, totalES, state.esLimit]);
  
  const clearData = useCallback(() => {
    setState(s => ({
      ...s,
      invoices: [],
      fxRates: new Map(),
      hedges: [],
    }));
  }, []);
  
  const value: FXContextValue = {
    ...state,
    exposureSummaries,
    fxReturns,
    currentRates,
    totalES,
    totalCFaR,
    componentES,
    marginalES,
    hedgeCoverage,
    isBreaching,
    loadSampleData,
    loadInvoices,
    loadFXRates,
    loadHedges,
    setESLimit,
    setRegimeAuto,
    setModelWeights,
    generateHedgePlanAction,
    clearData,
  };
  
  return (
    <FXContext.Provider value={value}>
      {children}
    </FXContext.Provider>
  );
}

export function useFX() {
  const context = useContext(FXContext);
  if (!context) {
    throw new Error('useFX must be used within a FXProvider');
  }
  return context;
}
