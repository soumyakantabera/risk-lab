import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

const checks = [
  {
    title: "Terminal growth vs WACC",
    status: "warning",
    description: "Terminal growth (3.2%) is close to WACC (8.4%). Review long-term spread assumptions.",
  },
  {
    title: "Negative equity",
    status: "ok",
    description: "Equity remains positive across all scenarios.",
  },
  {
    title: "Balance sheet integrity",
    status: "warning",
    description: "Assets and liabilities mismatch by 1.4%. Check mapping overrides.",
  },
  {
    title: "EBITDA margin sanity",
    status: "warning",
    description: "EBITDA margin > 80% flagged (non-SaaS sector).",
  },
];

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Model Audit</h1>
        <p className="text-sm text-muted-foreground">
          Automated sanity checks for assumptions, statement integrity, and outlier metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.title}>
            <CardHeader className="flex flex-row items-center gap-3">
              {check.status === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
              <CardTitle className="text-base">{check.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{check.description}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
