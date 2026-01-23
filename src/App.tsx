import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ValuationProvider } from "@/context/ValuationContext";
import { DataProvider } from "@/data/DataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import OverviewPage from "@/pages/OverviewPage";
import ValuationPage from "@/pages/ValuationPage";
import SectorPlaybookPage from "@/pages/SectorPlaybookPage";
import CountrySettingsPage from "@/pages/CountrySettingsPage";
import RatioLabPage from "@/pages/RatioLabPage";
import PowerModePage from "@/pages/PowerModePage";
import DealSuitePage from "@/pages/DealSuitePage";
import DataHubPage from "@/pages/DataHubPage";
import ReportsPage from "@/pages/ReportsPage";
import AuditPage from "@/pages/AuditPage";
import CreditScorecardPage from "@/pages/CreditScorecardPage";
import ExplorerPage from "@/pages/ExplorerPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ValuationProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/valuations" element={<ValuationPage />} />
                <Route path="/sectors" element={<SectorPlaybookPage />} />
                <Route path="/country" element={<CountrySettingsPage />} />
                <Route path="/ratio-lab" element={<RatioLabPage />} />
                <Route path="/power" element={<PowerModePage />} />
                <Route path="/deal-suite" element={<DealSuitePage />} />
                <Route path="/data" element={<DataHubPage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/credit" element={<CreditScorecardPage />} />
                <Route path="/audit" element={<AuditPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </DataProvider>
      </ValuationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
