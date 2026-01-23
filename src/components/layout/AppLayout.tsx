import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

const navShortcuts: Record<string, string> = {
  o: "/",
  d: "/data",
  e: "/explorer",
  c: "/valuations",
  f: "/valuations",
  l: "/deal-suite",
  m: "/deal-suite",
  r: "/reports",
  k: "/credit",
};

export function AppLayout() {
  const navigate = useNavigate();
  const lastGPress = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        window.dispatchEvent(new Event("valuation:open-metric-search"));
        return;
      }

      if (event.key.toLowerCase() === "g") {
        lastGPress.current = Date.now();
        return;
      }

      if (lastGPress.current && Date.now() - lastGPress.current < 1000) {
        const route = navShortcuts[event.key.toLowerCase()];
        if (route) {
          navigate(route);
        }
        lastGPress.current = null;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
