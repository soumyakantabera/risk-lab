import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CountrySettings, SectorMode } from "@/lib/valuation/types";
import { defaultCountries } from "@/lib/valuation/country";

interface ValuationState {
  isDarkMode: boolean;
  powerMode: boolean;
  sectorMode: SectorMode;
  country: CountrySettings;
  reportingCurrency: string;
  valuationCurrency: string;
  fxRate: number;
  projectId: string;
}

interface ValuationActions {
  toggleDarkMode: () => void;
  togglePowerMode: () => void;
  setSectorMode: (mode: SectorMode) => void;
  setCountry: (country: CountrySettings) => void;
  setReportingCurrency: (currency: string) => void;
  setValuationCurrency: (currency: string) => void;
  setFxRate: (rate: number) => void;
  setProjectId: (projectId: string) => void;
}

const ValuationContext = createContext<(ValuationState & ValuationActions) | null>(null);

const STORAGE_KEY = "valuation-lab-pro-settings";

const defaultCountry = defaultCountries[0];

export function ValuationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ValuationState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ValuationState;
      } catch {
        return {
          isDarkMode: true,
          powerMode: false,
          sectorMode: "tech",
          country: defaultCountry,
          reportingCurrency: "USD",
          valuationCurrency: "USD",
          fxRate: 1,
          projectId: "default",
        };
      }
    }
    return {
      isDarkMode: true,
      powerMode: false,
      sectorMode: "tech",
      country: defaultCountry,
      reportingCurrency: "USD",
      valuationCurrency: "USD",
      fxRate: 1,
      projectId: "default",
    };
  });

  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(
    () => ({
      ...state,
      toggleDarkMode: () => setState((s) => ({ ...s, isDarkMode: !s.isDarkMode })),
      togglePowerMode: () => setState((s) => ({ ...s, powerMode: !s.powerMode })),
      setSectorMode: (mode: SectorMode) => setState((s) => ({ ...s, sectorMode: mode })),
      setCountry: (country: CountrySettings) => setState((s) => ({ ...s, country })),
      setReportingCurrency: (currency: string) => setState((s) => ({ ...s, reportingCurrency: currency })),
      setValuationCurrency: (currency: string) => setState((s) => ({ ...s, valuationCurrency: currency })),
      setFxRate: (rate: number) => setState((s) => ({ ...s, fxRate: rate })),
      setProjectId: (projectId: string) => setState((s) => ({ ...s, projectId })),
    }),
    [state]
  );

  return <ValuationContext.Provider value={value}>{children}</ValuationContext.Provider>;
}

export function useValuation() {
  const context = useContext(ValuationContext);
  if (!context) {
    throw new Error("useValuation must be used within ValuationProvider");
  }
  return context;
}
