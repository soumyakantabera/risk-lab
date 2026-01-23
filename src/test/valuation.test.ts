import { describe, it, expect } from "vitest";
import { fcffDCF, hModelDCF, apvValuation, evaValuation, residualIncomeValuation } from "@/lib/valuation/dcf";
import { calculateWaccFromCountry } from "@/lib/valuation/wacc";
import { defaultCountries } from "@/lib/valuation/country";
import { grossMargin, roic, currentRatio } from "@/lib/valuation/ratios";
import { cashSweep } from "@/lib/valuation/lbo";
import { runMonteCarlo } from "@/lib/valuation/monteCarlo";

describe("DCF variants", () => {
  it("calculates FCFF DCF enterprise value", () => {
    const result = fcffDCF({ cashFlows: [100, 110, 120], discountRate: 0.1, terminalGrowth: 0.03 });
    expect(result.enterpriseValue).toBeGreaterThan(1200);
    expect(result.terminalValue).toBeGreaterThan(1200);
  });

  it("calculates H-Model DCF", () => {
    const result = hModelDCF({
      cashFlows: [120, 130, 140],
      discountRate: 0.09,
      terminalGrowth: 0.03,
      highGrowthRate: 0.08,
    });
    expect(result.enterpriseValue).toBeGreaterThan(1500);
  });

  it("computes APV and EVA valuations", () => {
    const apv = apvValuation({ unleveredValue: 900, taxShield: 120, distressCost: 20 });
    expect(apv).toBe(1000);

    const eva = evaValuation({ investedCapital: 800, evaStream: [40, 35, 30], discountRate: 0.1 });
    expect(eva).toBeGreaterThan(880);
  });

  it("computes residual income valuation", () => {
    const value = residualIncomeValuation({ bookValue: 500, residualIncomes: [25, 22, 20], costOfEquity: 0.1 });
    expect(value).toBeGreaterThan(550);
  });
});

describe("WACC with country settings", () => {
  it("blends cost of equity and debt", () => {
    const wacc = calculateWaccFromCountry({
      country: defaultCountries[0],
      beta: 1.1,
      spread: 0.03,
      equityValue: 700,
      debtValue: 300,
    });
    expect(wacc).toBeGreaterThan(0.05);
    expect(wacc).toBeLessThan(0.2);
  });
});

describe("ratio calculations", () => {
  it("computes profitability ratios", () => {
    expect(grossMargin(100, 40)).toBeCloseTo(0.6, 4);
    expect(roic({ nopat: 80, investedCapital: 500 })).toBeCloseTo(0.16, 4);
  });

  it("computes liquidity ratios", () => {
    expect(currentRatio(200, 100)).toBeCloseTo(2, 4);
  });
});

describe("LBO cash sweep", () => {
  it("applies sweep to eligible tranches", () => {
    const result = cashSweep({
      tranches: [
        { name: "TLB", balance: 400, rate: 0.08, amortization: 20, cashSweep: true },
        { name: "Second Lien", balance: 200, rate: 0.11, amortization: 0, cashSweep: false },
      ],
      availableCash: 100,
      minCash: 20,
    });
    expect(result.tranches[0].balance).toBeLessThan(380);
    expect(result.tranches[1].balance).toBe(200);
  });
});

describe("Monte Carlo determinism", () => {
  it("returns consistent values with fixed seed", () => {
    const first = runMonteCarlo({ seed: 123, iterations: 3, mean: 0.1, volatility: 0.2 });
    const second = runMonteCarlo({ seed: 123, iterations: 3, mean: 0.1, volatility: 0.2 });
    expect(first).toEqual(second);
  });
});
