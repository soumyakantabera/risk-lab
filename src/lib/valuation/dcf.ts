export interface DcfInputs {
  cashFlows: number[];
  discountRate: number;
  terminalGrowth: number;
}

export const discountCashFlows = (cashFlows: number[], discountRate: number) =>
  cashFlows.reduce((sum, cf, idx) => sum + cf / Math.pow(1 + discountRate, idx + 1), 0);

export const terminalValue = (finalCashFlow: number, discountRate: number, terminalGrowth: number) =>
  finalCashFlow * (1 + terminalGrowth) / (discountRate - terminalGrowth);

export const fcffDCF = ({ cashFlows, discountRate, terminalGrowth }: DcfInputs) => {
  const pv = discountCashFlows(cashFlows, discountRate);
  const tv = terminalValue(cashFlows[cashFlows.length - 1], discountRate, terminalGrowth);
  const pvTv = tv / Math.pow(1 + discountRate, cashFlows.length);
  return {
    enterpriseValue: pv + pvTv,
    terminalValue: tv,
  };
};

export const fcfeDCF = ({ cashFlows, discountRate, terminalGrowth }: DcfInputs) => {
  const pv = discountCashFlows(cashFlows, discountRate);
  const tv = terminalValue(cashFlows[cashFlows.length - 1], discountRate, terminalGrowth);
  const pvTv = tv / Math.pow(1 + discountRate, cashFlows.length);
  return {
    equityValue: pv + pvTv,
    terminalValue: tv,
  };
};

export const hModelDCF = ({ cashFlows, discountRate, terminalGrowth, highGrowthRate }: {
  cashFlows: number[];
  discountRate: number;
  terminalGrowth: number;
  highGrowthRate: number;
}) => {
  const baseCashFlow = cashFlows[cashFlows.length - 1];
  const horizon = cashFlows.length;
  const growthDecayFactor = (highGrowthRate - terminalGrowth) / 2;
  const pvHigh = (baseCashFlow * (1 + terminalGrowth) * horizon * growthDecayFactor) / (discountRate - terminalGrowth);
  const pvStable = (baseCashFlow * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  return {
    enterpriseValue: (pvHigh + pvStable) / Math.pow(1 + discountRate, 1),
    terminalValue: pvStable,
  };
};

export const apvValuation = ({
  unleveredValue,
  taxShield,
  distressCost,
  issuanceCost,
}: {
  unleveredValue: number;
  taxShield: number;
  distressCost?: number;
  issuanceCost?: number;
}) => {
  return (
    unleveredValue +
    taxShield -
    (distressCost ?? 0) -
    (issuanceCost ?? 0)
  );
};

export const evaValuation = ({
  investedCapital,
  evaStream,
  discountRate,
}: {
  investedCapital: number;
  evaStream: number[];
  discountRate: number;
}) => {
  const pvEva = discountCashFlows(evaStream, discountRate);
  return investedCapital + pvEva;
};

export const residualIncomeValuation = ({
  bookValue,
  residualIncomes,
  costOfEquity,
}: {
  bookValue: number;
  residualIncomes: number[];
  costOfEquity: number;
}) => {
  const pvResidual = discountCashFlows(residualIncomes, costOfEquity);
  return bookValue + pvResidual;
};
