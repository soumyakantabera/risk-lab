const mappingHints: Record<string, string[]> = {
  revenue: ["revenue", "sales", "turnover"],
  ebitda: ["ebitda", "operating income"],
  ebit: ["ebit", "operating profit"],
  netIncome: ["net income", "profit"],
  cash: ["cash", "cash equivalents"],
  totalAssets: ["total assets"],
  totalLiabilities: ["total liabilities"],
  debt: ["debt", "borrowings"],
};

export const suggestMapping = (columns: string[]) => {
  const suggestions: Record<string, string> = {};
  Object.entries(mappingHints).forEach(([key, hints]) => {
    const found = columns.find((col) =>
      hints.some((hint) => col.toLowerCase().includes(hint))
    );
    if (found) {
      suggestions[key] = found;
    }
  });
  return suggestions;
};
