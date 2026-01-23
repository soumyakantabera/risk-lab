import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DataError } from "@/data/errors";
import type { DataStatus } from "@/data/types";

type ActionHandlers = {
  onUseSample?: () => void;
  onUseCached?: () => void;
  onImport?: () => void;
  onCheckProxy?: () => void;
};

const statusStyles: Record<DataStatus["level"], { label: string; badge: string }> = {
  live: { label: "✅", badge: "bg-emerald-500/10 text-emerald-200" },
  cached: { label: "🟡", badge: "bg-amber-500/10 text-amber-200" },
  partial: { label: "🟠", badge: "bg-orange-500/10 text-orange-200" },
  failed: { label: "🔴", badge: "bg-rose-500/10 text-rose-200" },
};

export function DataStatusBanner({
  status,
  error,
  actions,
}: {
  status: DataStatus | null;
  error?: DataError | null;
  actions?: ActionHandlers;
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!status) return null;

  const style = statusStyles[status.level];

  return (
    <Card className="border border-border/60">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>{style.label}</span>
              <span>Data Status: {status.label}</span>
              {status.isStale ? <Badge variant="outline">Stale</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">{status.message}</p>
            {status.actionHint ? <p className="text-xs text-muted-foreground">{status.actionHint}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {actions?.onUseSample ? (
              <Button size="sm" variant="outline" onClick={actions.onUseSample}>
                Use Sample Data
              </Button>
            ) : null}
            {actions?.onUseCached ? (
              <Button size="sm" variant="outline" onClick={actions.onUseCached}>
                Use Cached Data
              </Button>
            ) : null}
            {actions?.onImport ? (
              <Button size="sm" variant="outline" onClick={actions.onImport}>
                Import CSV/JSON
              </Button>
            ) : null}
            {actions?.onCheckProxy ? (
              <Button size="sm" variant="outline" onClick={actions.onCheckProxy}>
                Check Proxy Settings
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setShowDetails((prev) => !prev)}>
              {showDetails ? "Hide details" : "Show details"}
            </Button>
          </div>
        </div>
        {showDetails ? (
          <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="font-semibold text-foreground">Status</p>
                <p>Level: {status.level}</p>
                <p>Updated: {new Date(status.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Error details</p>
                <p>Code: {error?.code ?? "n/a"}</p>
                <p>Status: {error?.debugInfo?.status ?? "n/a"}</p>
                <p>Endpoint: {error?.debugInfo?.endpoint ?? "n/a"}</p>
                <p>Timestamp: {error?.debugInfo?.timestamp ?? status.updatedAt}</p>
              </div>
            </div>
            {error?.debugInfo?.details ? <p className="mt-2">Details: {error.debugInfo.details}</p> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
