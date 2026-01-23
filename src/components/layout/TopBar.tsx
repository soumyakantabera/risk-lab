import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Sparkles } from "lucide-react";
import { metricDictionary } from "@/lib/valuation/metrics";
import { useValuation } from "@/context/ValuationContext";
import { useDataStatus } from "@/data/DataContext";

const statusEmoji: Record<string, string> = {
  live: "✅",
  cached: "🟡",
  partial: "🟠",
  failed: "🔴",
};

export function TopBar() {
  const { powerMode, togglePowerMode, sectorMode, country } = useValuation();
  const { dataStatus } = useDataStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("valuation:open-metric-search", handler);
    return () => window.removeEventListener("valuation:open-metric-search", handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-lg px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-2 py-1">
            Sector: {sectorMode.toUpperCase()}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Country: {country.name}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {dataStatus ? (
          <Badge variant="outline" className="gap-2">
            <span>{statusEmoji[dataStatus.level] ?? "ℹ️"}</span>
            <span className="text-xs">Data: {dataStatus.label}</span>
          </Badge>
        ) : null}
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Search className="h-3 w-3" />
          Metric Search (/)
        </Button>
        <Button variant={powerMode ? "default" : "outline"} size="sm" className="gap-2" onClick={togglePowerMode}>
          <Sparkles className="h-3 w-3" />
          Power Mode
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search metrics..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Metric Dictionary">
            {metricDictionary.map((metric) => (
              <CommandItem key={metric.key} className="flex flex-col items-start gap-1">
                <span className="font-medium">{metric.name}</span>
                <span className="text-xs text-muted-foreground">{metric.formula}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
