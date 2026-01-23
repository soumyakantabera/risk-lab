export const grossMargin = (revenue: number, cogs: number) =>
  revenue === 0 ? 0 : (revenue - cogs) / revenue;

export const ebitdaMargin = (revenue: number, ebitda: number) =>
  revenue === 0 ? 0 : ebitda / revenue;

export const netMargin = (revenue: number, netIncome: number) =>
  revenue === 0 ? 0 : netIncome / revenue;

export const roe = (netIncome: number, equity: number) =>
  equity === 0 ? 0 : netIncome / equity;

export const roa = (netIncome: number, assets: number) =>
  assets === 0 ? 0 : netIncome / assets;

export const roic = ({
  nopat,
  investedCapital,
}: {
  nopat: number;
  investedCapital: number;
}) => (investedCapital === 0 ? 0 : nopat / investedCapital);

export const currentRatio = (currentAssets: number, currentLiabilities: number) =>
  currentLiabilities === 0 ? 0 : currentAssets / currentLiabilities;

export const quickRatio = (currentAssets: number, inventory: number, currentLiabilities: number) =>
  currentLiabilities === 0 ? 0 : (currentAssets - inventory) / currentLiabilities;

export const debtToEbitda = (debt: number, ebitda: number) =>
  ebitda === 0 ? 0 : debt / ebitda;

export const interestCoverage = (ebit: number, interest: number) =>
  interest === 0 ? 0 : ebit / interest;

export const cashConversionCycle = ({
  inventoryDays,
  arDays,
  apDays,
}: {
  inventoryDays: number;
  arDays: number;
  apDays: number;
}) => inventoryDays + arDays - apDays;
