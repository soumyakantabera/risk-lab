import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buildDiagnosticsBundle, getRequestLogs } from "@/data/dataService";
import { getCacheStats } from "@/data/cache";

export function DiagnosticsDrawer() {
  const logs = getRequestLogs();
  const cacheStats = getCacheStats();

  const bundle = buildDiagnosticsBundle();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `risk-buddy-diagnostics-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          Open Diagnostics
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Diagnostics</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4 text-sm text-muted-foreground">
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="space-y-1 p-3">
                <p className="text-xs uppercase text-muted-foreground">Cache</p>
                <p>Hits: {cacheStats.hits}</p>
                <p>Misses: {cacheStats.misses}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1 p-3">
                <p className="text-xs uppercase text-muted-foreground">Logs</p>
                <p>Entries: {logs.length}</p>
                <p>Latest: {logs[0]?.timestamp ? new Date(logs[0].timestamp).toLocaleString() : "n/a"}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Request history</p>
            <Button size="sm" variant="outline" onClick={handleExport}>
              Export bundle
            </Button>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <p>No requests logged yet.</p>
            ) : (
              logs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">
                        {log.ticker} • {log.mode.toUpperCase()}
                      </p>
                      <span className="text-xs">{log.status.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                    <div className="grid gap-2 text-xs md:grid-cols-2">
                      <p>Duration: {log.durationMs}ms</p>
                      <p>TTFB: {log.ttfbMs ?? "n/a"}ms</p>
                      <p>Cache hit: {log.cacheHit ? "yes" : "no"}</p>
                      <p>Cache stale: {log.cacheStale ? "yes" : "no"}</p>
                      <p>Error code: {log.errorCode ?? "n/a"}</p>
                      <p>HTTP status: {log.httpStatus ?? "n/a"}</p>
                    </div>
                    {log.endpoint ? <p className="text-xs">Endpoint: {log.endpoint}</p> : null}
                    {log.responsePreview ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer">Raw response preview</summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px]">
                          {log.responsePreview}
                        </pre>
                      </details>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
