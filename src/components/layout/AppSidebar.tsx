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
} from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useRisk } from '@/context/RiskContext';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Overview', url: '/', icon: LayoutDashboard },
  { title: 'Data & Portfolio', url: '/data', icon: Database },
  { title: 'Models', url: '/models', icon: Calculator },
  { title: 'Backtesting', url: '/backtest', icon: TestTube },
  { title: 'Stress Testing', url: '/stress', icon: Zap },
  { title: 'Reports', url: '/reports', icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useRisk();
  
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
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
