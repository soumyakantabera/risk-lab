import React, { createContext, useContext, useMemo, useState } from "react";
import type { DataStatus } from "@/data/types";

type DataContextValue = {
  dataStatus: DataStatus | null;
  setDataStatus: (status: DataStatus | null) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);

  const value = useMemo(() => ({ dataStatus, setDataStatus }), [dataStatus]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataStatus() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataStatus must be used within DataProvider");
  }
  return context;
}
