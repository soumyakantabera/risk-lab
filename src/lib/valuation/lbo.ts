export interface DebtTranche {
  name: string;
  balance: number;
  rate: number;
  amortization: number;
  cashSweep: boolean;
}

export const cashSweep = ({
  tranches,
  availableCash,
  minCash,
}: {
  tranches: DebtTranche[];
  availableCash: number;
  minCash: number;
}) => {
  let cashRemaining = Math.max(0, availableCash - minCash);
  const updated = tranches.map((tranche) => {
    const scheduled = Math.min(tranche.balance, tranche.amortization);
    let extra = 0;
    if (tranche.cashSweep && cashRemaining > 0) {
      extra = Math.min(tranche.balance - scheduled, cashRemaining);
      cashRemaining -= extra;
    }
    const newBalance = Math.max(0, tranche.balance - scheduled - extra);
    return { ...tranche, balance: newBalance };
  });
  return { tranches: updated, cashRemaining };
};
