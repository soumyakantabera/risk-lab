import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, Printer } from "lucide-react";

const sections = [
  "DCF Suite",
  "Comps",
  "Ratios",
  "LBO",
  "M&A",
  "Sector KPIs",
  "Power Mode",
  "Country Settings",
];

export default function ReportsPage() {
  const [selected, setSelected] = useState<string[]>(["DCF Suite", "Ratios", "Sector KPIs"]);

  const toggleSection = (section: string) => {
    setSelected((prev) =>
      prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]
    );
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ sections: selected, createdAt: new Date().toISOString() }, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "valuation-lab-report.json";
    link.click();
  };

  const downloadCsv = () => {
    const csv = ["Section", ...selected].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "valuation-lab-report.csv";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Report Builder</h1>
        <p className="text-sm text-muted-foreground">
          Assemble investor-ready sections and export as printable HTML, JSON, or CSV tables.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select report sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.map((section) => (
              <div key={section} className="flex items-center gap-3">
                <Checkbox
                  id={section}
                  checked={selected.includes(section)}
                  onCheckedChange={() => toggleSection(section)}
                />
                <label htmlFor={section} className="text-sm">
                  {section}
                </label>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-3 w-3" /> Print HTML
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadJson}>
                <Download className="h-3 w-3" /> Export JSON
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadCsv}>
                <Download className="h-3 w-3" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Valuation Lab Pro Report</p>
            <p>Included sections:</p>
            <div className="flex flex-wrap gap-2">
              {selected.map((section) => (
                <Badge key={section} variant="secondary">
                  {section}
                </Badge>
              ))}
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
              <p>HTML output is printable with dark-mode friendly styling.</p>
              <p>JSON export includes all modeling assumptions and inputs for audit trails.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
