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
    isLoading 
  } = useRisk();
  
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-lg px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        
        <div className="flex items-center gap-3">
          {datasetInfo ? (
            <>
              <Badge variant="outline" className="gap-1.5 px-2 py-1">
                <Database className="h-3 w-3" />
                {datasetInfo.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {datasetInfo.observations} obs
              </Badge>
              {assets.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {assets.length} assets
                </Badge>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              No dataset loaded
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={returnType} onValueChange={(v) => setReturnType(v as 'log' | 'simple')}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
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
          Recalculate
        </Button>
      </div>
    </header>
  );
}
