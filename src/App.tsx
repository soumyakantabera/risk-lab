import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { RiskProvider } from "@/context/RiskContext";
import { FXProvider } from "@/context/FXContext";
import { AppLayout } from "@/components/layout/AppLayout";
import OverviewPage from "@/pages/OverviewPage";
import DataPage from "@/pages/DataPage";
import ModelsPage from "@/pages/ModelsPage";
import BacktestPage from "@/pages/BacktestPage";
import StressPage from "@/pages/StressPage";
import ReportsPage from "@/pages/ReportsPage";
import NotFound from "./pages/NotFound";

// RiskLab Pro (FX) Pages
import ControlTowerPage from "@/pages/fx/ControlTowerPage";
import ExposureLedgerPage from "@/pages/fx/ExposureLedgerPage";
import ModelStudioPage from "@/pages/fx/ModelStudioPage";
import TailAttributionPage from "@/pages/fx/TailAttributionPage";
import DecisionLabPage from "@/pages/fx/DecisionLabPage";
import FXBacktestPage from "@/pages/fx/FXBacktestPage";
import ReportBuilderPage from "@/pages/fx/ReportBuilderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RiskProvider>
        <FXProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route element={<AppLayout />}>
                {/* Original RiskLab */}
                <Route path="/" element={<OverviewPage />} />
                <Route path="/data" element={<DataPage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/backtest" element={<BacktestPage />} />
                <Route path="/stress" element={<StressPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                
                {/* RiskLab Pro (FX Invoice) */}
                <Route path="/fx" element={<ControlTowerPage />} />
                <Route path="/fx/exposures" element={<ExposureLedgerPage />} />
                <Route path="/fx/models" element={<ModelStudioPage />} />
                <Route path="/fx/attribution" element={<TailAttributionPage />} />
                <Route path="/fx/decision" element={<DecisionLabPage />} />
                <Route path="/fx/backtest" element={<FXBacktestPage />} />
                <Route path="/fx/reports" element={<ReportBuilderPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </FXProvider>
      </RiskProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;