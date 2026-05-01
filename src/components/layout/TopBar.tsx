// Top header bar
import { useRisk } from '@/context/RiskContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Database, RefreshCw } from 'lucide-react';

export function TopBar() {
  const {
    datasetInfo,
    assets,
    returnType,
    setReturnType,
    runModels,
    isLoading,
  } = useRisk();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/50 bg-background/80 backdrop-blur-lg px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <SidebarTrigger className="shrink-0" />

        <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          {datasetInfo ? (
            <>
              <Badge variant="outline" className="gap-1.5 px-2 py-1 max-w-[160px] sm:max-w-none">
                <Database className="h-3 w-3 shrink-0" />
                <span className="truncate">{datasetInfo.name}</span>
              </Badge>
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {datasetInfo.observations} obs
              </Badge>
              {assets.length > 1 && (
                <Badge variant="secondary" className="text-xs hidden md:inline-flex">
                  {assets.length} assets
                </Badge>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground truncate">
              No dataset loaded
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Select value={returnType} onValueChange={(v) => setReturnType(v as 'log' | 'simple')}>
          <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="log">Log Returns</SelectItem>
            <SelectItem value="simple">Simple Returns</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={runModels}
          disabled={isLoading || assets.length === 0}
          className="gap-2"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Recalculate</span>
        </Button>
      </div>
    </header>
  );
}
