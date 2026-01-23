import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useValuation } from "@/context/ValuationContext";
import { sectorPlaybooks } from "@/lib/valuation/sectors";

export default function SectorPlaybookPage() {
  const { sectorMode, setSectorMode } = useValuation();
  const playbook = useMemo(
    () => sectorPlaybooks.find((item) => item.key === sectorMode) ?? sectorPlaybooks[0],
    [sectorMode]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sector Playbooks</h1>
        <p className="text-sm text-muted-foreground">
          Sector mode adjusts default drivers, terminal methods, and valuation KPIs with guardrails.
        </p>
      </div>

      <Tabs value={sectorMode} onValueChange={(value) => setSectorMode(value as typeof sectorMode)}>
        <TabsList className="flex flex-wrap">
          {sectorPlaybooks.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={sectorMode} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{playbook.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">What this sector cares about</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {playbook.whatMatters.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Default drivers</h3>
                <div className="flex flex-wrap gap-2">
                  {playbook.defaultDrivers.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
                <h3 className="mt-4 text-sm font-medium text-foreground">Output KPIs</h3>
                <div className="flex flex-wrap gap-2">
                  {playbook.outputKpis.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Terminal valuation method</h3>
                <p className="text-sm text-muted-foreground">{playbook.terminalMethod}</p>
                <h3 className="mt-4 text-sm font-medium text-foreground">Recommended multiples</h3>
                <div className="flex flex-wrap gap-2">
                  {playbook.recommendedMultiples.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Default ranges & warnings</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {playbook.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li>Use sector presets as guardrails, not substitutes for diligence.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
