// App Sidebar Navigation
import {
  LayoutDashboard,
  Database,
  Calculator,
  TestTube,
  Zap,
  FileText,
  Moon,
  Sun,
  TrendingDown,
  Banknote,
  Receipt,
  Settings2,
  PieChart,
  Shield,
  ClipboardCheck,
} from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useRisk } from '@/context/RiskContext';
import { cn } from '@/lib/utils';

const riskLabItems = [
  { title: 'Overview', url: '/', icon: LayoutDashboard },
  { title: 'Data & Portfolio', url: '/data', icon: Database },
  { title: 'Models', url: '/models', icon: Calculator },
  { title: 'Backtesting', url: '/backtest', icon: TestTube },
  { title: 'Stress Testing', url: '/stress', icon: Zap },
  { title: 'Reports', url: '/reports', icon: FileText },
];

const riskLabProItems = [
  { title: 'Control Tower', url: '/fx', icon: LayoutDashboard },
  { title: 'Exposure Ledger', url: '/fx/exposures', icon: Receipt },
  { title: 'Model Studio', url: '/fx/models', icon: Settings2 },
  { title: 'Tail Attribution', url: '/fx/attribution', icon: PieChart },
  { title: 'Decision Lab', url: '/fx/decision', icon: Shield },
  { title: 'Backtesting', url: '/fx/backtest', icon: ClipboardCheck },
  { title: 'Report Builder', url: '/fx/reports', icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useRisk();
  
  const isFXSection = location.pathname.startsWith('/fx');
  
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <RouterNavLink to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <TrendingDown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">RiskLab</h1>
            <p className="text-[10px] text-muted-foreground tracking-wide uppercase">VaR & ES Dashboard</p>
          </div>
        </RouterNavLink>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        {/* RiskLab Classic */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-2">
            RiskLab Classic
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {riskLabItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          isActive && 'bg-sidebar-accent text-sidebar-primary'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                        <span>{item.title}</span>
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* RiskLab Pro (FX) */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs px-3 mb-2 flex items-center gap-2">
            <Banknote className="h-3 w-3 text-primary" />
            <span className="text-primary font-semibold">RiskLab Pro</span>
            <span className="text-muted-foreground">FX Invoice</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {riskLabProItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          isActive && 'bg-primary/10 text-primary border-l-2 border-primary'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                        <span>{item.title}</span>
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDarkMode}
          className="w-full justify-start gap-3"
        >
          {isDarkMode ? (
            <>
              <Sun className="h-4 w-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              <span>Dark Mode</span>
            </>
          )}
        </Button>
        <p className="mt-4 text-[10px] text-muted-foreground text-center">
          Educational risk analytics — not financial advice.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}