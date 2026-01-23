import type { CountrySettings } from "@/lib/valuation/types";

export const costOfEquity = ({
  riskFreeRate,
  beta,
  equityRiskPremium,
  countryRiskPremium,
}: {
  riskFreeRate: number;
  beta: number;
  equityRiskPremium: number;
  countryRiskPremium: number;
}) => riskFreeRate + beta * (equityRiskPremium + countryRiskPremium);

export const costOfDebt = ({
  riskFreeRate,
  spread,
  sovereignSpread,
}: {
  riskFreeRate: number;
  spread: number;
  sovereignSpread: number;
}) => riskFreeRate + spread + sovereignSpread;

export const calculateWacc = ({
  equityValue,
  debtValue,
  costOfEquityRate,
  costOfDebtRate,
  taxRate,
}: {
  equityValue: number;
  debtValue: number;
  costOfEquityRate: number;
  costOfDebtRate: number;
  taxRate: number;
}) => {
  const total = equityValue + debtValue;
  if (total === 0) return 0;
  const equityWeight = equityValue / total;
  const debtWeight = debtValue / total;
  return equityWeight * costOfEquityRate + debtWeight * costOfDebtRate * (1 - taxRate);
};

export const calculateWaccFromCountry = ({
  country,
  beta,
  spread,
  equityValue,
  debtValue,
}: {
  country: CountrySettings;
  beta: number;
  spread: number;
  equityValue: number;
  debtValue: number;
}) => {
  const coe = costOfEquity({
    riskFreeRate: country.riskFreeRate,
    beta,
    equityRiskPremium: country.equityRiskPremium,
    countryRiskPremium: country.countryRiskPremium,
  });
  const cod = costOfDebt({
    riskFreeRate: country.riskFreeRate,
    spread,
    sovereignSpread: country.sovereignSpread,
  });
  return calculateWacc({
    equityValue,
    debtValue,
    costOfEquityRate: coe,
    costOfDebtRate: cod,
    taxRate: country.taxRate,
  });
};

export const iterativeWacc = ({
  startingLeverage,
  targetIterations,
  baseEquity,
  baseDebt,
  country,
  beta,
  spread,
}: {
  startingLeverage: number;
  targetIterations: number;
  baseEquity: number;
  baseDebt: number;
  country: CountrySettings;
  beta: number;
  spread: number;
}) => {
  let leverage = startingLeverage;
  let wacc = 0;
  for (let i = 0; i < targetIterations; i += 1) {
    const equityValue = baseEquity * (1 - leverage);
    const debtValue = baseDebt * leverage;
    wacc = calculateWaccFromCountry({
      country,
      beta,
      spread,
      equityValue,
      debtValue,
    });
    leverage = Math.min(0.8, Math.max(0.1, leverage + (0.5 - leverage) * 0.1));
  }
  return { wacc, leverage };
};
