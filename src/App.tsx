import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { RiskProvider } from "@/context/RiskContext";
import { AppLayout } from "@/components/layout/AppLayout";
import OverviewPage from "@/pages/OverviewPage";
import DataPage from "@/pages/DataPage";
import ModelsPage from "@/pages/ModelsPage";
import BacktestPage from "@/pages/BacktestPage";
import StressPage from "@/pages/StressPage";
import ReportsPage from "@/pages/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RiskProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/backtest" element={<BacktestPage />} />
              <Route path="/stress" element={<StressPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </RiskProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
