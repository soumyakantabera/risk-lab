// Global state management for RiskLab
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { PortfolioAsset, DatasetInfo, ModelResult, RiskMetrics, ModelType } from '@/lib/risk/types';
import { extractReturns, extractAssetReturns, extractDates } from '@/lib/data/parser';
import { runAllModels } from '@/lib/risk/models';
import { 
  mean, 
  stdDev, 
  maxDrawdown, 
  skewness, 
  kurtosis,
  correlationMatrix 
} from '@/lib/risk/statistics';
import { generateNormalReturns, generateHeavyTailReturns, generateMultiAssetReturns } from '@/lib/data/sampleData';

interface RiskState {
  // Data
  assets: PortfolioAsset[];
  datasetInfo: DatasetInfo | null;
  returns: number[];
  dates: Date[];
  assetReturns: number[][];
  returnType: 'log' | 'simple';
  portfolioValue: number;
  
  // Model settings
  selectedModels: ModelType[];
  ewmaLambda: number;
  
  // Results
  modelResults: ModelResult[];
  metrics: RiskMetrics | null;
  correlationMatrix: number[][] | null;
  
  // UI state
  isLoading: boolean;
  isDarkMode: boolean;
}

interface RiskActions {
  loadSampleDataset: (type: 'normal-baseline' | 'heavy-tail' | 'multi-asset-correlated') => void;
  loadCustomData: (assets: PortfolioAsset[], info: DatasetInfo) => void;
  updateWeights: (weights: { id: string; weight: number }[]) => void;
  setReturnType: (type: 'log' | 'simple') => void;
  setPortfolioValue: (value: number) => void;
  setEwmaLambda: (lambda: number) => void;
  runModels: () => void;
  toggleDarkMode: () => void;
  clearData: () => void;
}

const RiskContext = createContext<(RiskState & RiskActions) | null>(null);

export function RiskProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RiskState>({
    assets: [],
    datasetInfo: null,
    returns: [],
    dates: [],
    assetReturns: [],
    returnType: 'log',
    portfolioValue: 1000000,
    selectedModels: ['historical', 'gaussian', 'student-t', 'ewma', 'monte-carlo', 'filtered-hs'],
    ewmaLambda: 0.94,
    modelResults: [],
    metrics: null,
    correlationMatrix: null,
    isLoading: false,
    isDarkMode: true,
  });
  
  // Apply dark mode class
  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [state.isDarkMode]);
  
  const calculateMetrics = useCallback((returns: number[]): RiskMetrics | null => {
    if (returns.length < 2) return null;
    
    const vol = stdDev(returns);
    const meanRet = mean(returns);
    const annualizedVol = vol * Math.sqrt(252);
    const annualizedMean = meanRet * 252;
    const sharpe = annualizedVol > 0 ? (annualizedMean - 0.02) / annualizedVol : 0; // Assume 2% risk-free
    
    return {
      volatility: vol,
      annualizedVolatility: annualizedVol,
      maxDrawdown: maxDrawdown(returns),
      sharpeRatio: sharpe,
      skewness: skewness(returns),
      kurtosis: kurtosis(returns),
      meanReturn: meanRet,
    };
  }, []);
  
  const processData = useCallback((assets: PortfolioAsset[], info: DatasetInfo, returnType: 'log' | 'simple') => {
    const returns = extractReturns(assets, returnType);
    const assetReturns = extractAssetReturns(assets, returnType);
    const dates = extractDates(assets);
    const metrics = calculateMetrics(returns);
    const corrMatrix = assets.length > 1 ? correlationMatrix(assetReturns) : null;
    
    return { returns, assetReturns, dates, metrics, correlationMatrix: corrMatrix };
  }, [calculateMetrics]);
  
  const loadSampleDataset = useCallback((type: 'normal-baseline' | 'heavy-tail' | 'multi-asset-correlated') => {
    setState(s => ({ ...s, isLoading: true }));
    
    setTimeout(() => {
      let result: { assets: PortfolioAsset[]; info: DatasetInfo };
      
      switch (type) {
        case 'normal-baseline':
          result = generateNormalReturns(500);
          break;
        case 'heavy-tail':
          result = generateHeavyTailReturns(500);
          break;
        case 'multi-asset-correlated':
          result = generateMultiAssetReturns(500);
          break;
      }
      
      const { returns, assetReturns, dates, metrics, correlationMatrix: corrMatrix } = 
        processData(result.assets, result.info, state.returnType);
      
      const modelResults = runAllModels(returns, state.portfolioValue, state.ewmaLambda);
      
      setState(s => ({
        ...s,
        assets: result.assets,
        datasetInfo: result.info,
        returns,
        assetReturns,
        dates,
        metrics,
        correlationMatrix: corrMatrix,
        modelResults,
        isLoading: false,
      }));
    }, 100);
  }, [state.returnType, state.portfolioValue, state.ewmaLambda, processData]);
  
  const loadCustomData = useCallback((assets: PortfolioAsset[], info: DatasetInfo) => {
    const { returns, assetReturns, dates, metrics, correlationMatrix: corrMatrix } = 
      processData(assets, info, state.returnType);
    
    const modelResults = runAllModels(returns, state.portfolioValue, state.ewmaLambda);
    
    setState(s => ({
      ...s,
      assets,
      datasetInfo: info,
      returns,
      assetReturns,
      dates,
      metrics,
      correlationMatrix: corrMatrix,
      modelResults,
    }));
  }, [state.returnType, state.portfolioValue, state.ewmaLambda, processData]);
  
  const updateWeights = useCallback((weights: { id: string; weight: number }[]) => {
    setState(s => {
      const newAssets = s.assets.map(a => {
        const newWeight = weights.find(w => w.id === a.id);
        return newWeight ? { ...a, weight: newWeight.weight } : a;
      });
      
      const { returns, assetReturns, dates, metrics, correlationMatrix: corrMatrix } = 
        processData(newAssets, s.datasetInfo!, s.returnType);
      
      const modelResults = runAllModels(returns, s.portfolioValue, s.ewmaLambda);
      
      return {
        ...s,
        assets: newAssets,
        returns,
        assetReturns,
        dates,
        metrics,
        correlationMatrix: corrMatrix,
        modelResults,
      };
    });
  }, [processData]);
  
  const setReturnType = useCallback((type: 'log' | 'simple') => {
    setState(s => {
      if (s.assets.length === 0) return { ...s, returnType: type };
      
      const { returns, assetReturns, dates, metrics, correlationMatrix: corrMatrix } = 
        processData(s.assets, s.datasetInfo!, type);
      
      const modelResults = runAllModels(returns, s.portfolioValue, s.ewmaLambda);
      
      return {
        ...s,
        returnType: type,
        returns,
        assetReturns,
        dates,
        metrics,
        correlationMatrix: corrMatrix,
        modelResults,
      };
    });
  }, [processData]);
  
  const setPortfolioValue = useCallback((value: number) => {
    setState(s => {
      if (s.returns.length === 0) return { ...s, portfolioValue: value };
      
      const modelResults = runAllModels(s.returns, value, s.ewmaLambda);
      
      return { ...s, portfolioValue: value, modelResults };
    });
  }, []);
  
  const setEwmaLambda = useCallback((lambda: number) => {
    setState(s => {
      if (s.returns.length === 0) return { ...s, ewmaLambda: lambda };
      
      const modelResults = runAllModels(s.returns, s.portfolioValue, lambda);
      
      return { ...s, ewmaLambda: lambda, modelResults };
    });
  }, []);
  
  const runModels = useCallback(() => {
    setState(s => {
      if (s.returns.length === 0) return s;
      
      const modelResults = runAllModels(s.returns, s.portfolioValue, s.ewmaLambda);
      
      return { ...s, modelResults };
    });
  }, []);
  
  const toggleDarkMode = useCallback(() => {
    setState(s => ({ ...s, isDarkMode: !s.isDarkMode }));
  }, []);
  
  const clearData = useCallback(() => {
    setState(s => ({
      ...s,
      assets: [],
      datasetInfo: null,
      returns: [],
      dates: [],
      assetReturns: [],
      modelResults: [],
      metrics: null,
      correlationMatrix: null,
    }));
  }, []);
  
  const value = {
    ...state,
    loadSampleDataset,
    loadCustomData,
    updateWeights,
    setReturnType,
    setPortfolioValue,
    setEwmaLambda,
    runModels,
    toggleDarkMode,
    clearData,
  };
  
  return (
    <RiskContext.Provider value={value}>
      {children}
    </RiskContext.Provider>
  );
}

export function useRisk() {
  const context = useContext(RiskContext);
  if (!context) {
    throw new Error('useRisk must be used within a RiskProvider');
  }
  return context;
}
