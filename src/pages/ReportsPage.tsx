// Reports & Export Page
import { useRef } from 'react';
import { useRisk } from '@/context/RiskContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  FileText, 
  Printer,
  FileSpreadsheet,
  TrendingDown
} from 'lucide-react';
import { ReturnsHistogram } from '@/components/charts/ReturnsHistogram';

export default function ReportsPage() {
  const { 
    assets, 
    datasetInfo,
    returns,
    modelResults,
    metrics,
    portfolioValue,
  } = useRisk();
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  if (assets.length === 0) {
    return <EmptyState />;
  }
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(value);
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  
  // Export model results to CSV
  const exportToCSV = () => {
    const headers = ['Model', 'Confidence', 'Horizon', 'VaR ($)', 'VaR (%)', 'ES ($)', 'ES (%)'];
    const rows: string[][] = [];
    
    for (const model of modelResults) {
      for (const result of model.results) {
        rows.push([
          model.modelName,
          `${result.confidence}%`,
          `${result.horizon} day`,
          result.var.toFixed(2),
          result.varPercent.toFixed(4),
          result.es.toFixed(2),
          result.esPercent.toFixed(4),
        ]);
      }
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risklab-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Print report
  const printReport = () => {
    window.print();
  };
  
  const hsResult = modelResults.find(r => r.model === 'historical');
  const var95 = hsResult?.results.find(r => r.confidence === 95 && r.horizon === 1);
  
  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Export</h1>
          <p className="text-muted-foreground text-sm">
            Export data and generate risk reports
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2 flex-1 sm:flex-initial">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={printReport} className="gap-2 flex-1 sm:flex-initial">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>
      
      {/* Report Preview */}
      <Card className="glass-card print:shadow-none print:border-none">
        <CardHeader className="print:pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary print:text-black" />
                Risk Analytics Report
              </CardTitle>
              <CardDescription>
                Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              RiskLab v1.0
            </Badge>
          </div>
        </CardHeader>
        <CardContent ref={reportRef} className="space-y-8">
          {/* Portfolio Summary */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">
              Portfolio Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Dataset</p>
                <p className="font-medium">{datasetInfo?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Portfolio Value</p>
                <p className="font-mono">{formatCurrency(portfolioValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Observations</p>
                <p className="font-mono">{returns.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Assets</p>
                <p className="font-mono">{assets.length}</p>
              </div>
            </div>
          </section>
          
          {/* Key Risk Metrics */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">
              Key Risk Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground uppercase">VaR (95%, 1D)</p>
                <p className="text-xl font-mono font-semibold text-destructive">
                  {var95 ? formatCurrency(var95.var) : '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-muted-foreground uppercase">ES (95%, 1D)</p>
                <p className="text-xl font-mono font-semibold text-warning">
                  {var95 ? formatCurrency(var95.es) : '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground uppercase">Volatility (Ann.)</p>
                <p className="text-xl font-mono font-semibold">
                  {metrics ? formatPercent(metrics.annualizedVolatility) : '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground uppercase">Max Drawdown</p>
                <p className="text-xl font-mono font-semibold text-destructive">
                  {metrics ? formatPercent(metrics.maxDrawdown) : '-'}
                </p>
              </div>
            </div>
          </section>
          
          {/* Model Comparison */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">
              Model Comparison (1-Day, 95% Confidence)
            </h3>
            <div className="table-scroll">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">VaR ($)</TableHead>
                  <TableHead className="text-right">VaR (%)</TableHead>
                  <TableHead className="text-right">ES ($)</TableHead>
                  <TableHead className="text-right">ES (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelResults.map((model) => {
                  const result = model.results.find(r => r.confidence === 95 && r.horizon === 1);
                  if (!result) return null;
                  return (
                    <TableRow key={model.model}>
                      <TableCell className="font-medium">{model.modelName}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(result.var)}</TableCell>
                      <TableCell className="text-right font-mono">{result.varPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(result.es)}</TableCell>
                      <TableCell className="text-right font-mono">{result.esPercent.toFixed(2)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </section>
          
          {/* Distribution Chart */}
          <section className="print:break-before-page">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">
              Returns Distribution
            </h3>
            <div className="print:h-[300px]">
              <ReturnsHistogram
                returns={returns}
                varValue={var95?.varPercent ? var95.varPercent / 100 : undefined}
                esValue={var95?.esPercent ? var95.esPercent / 100 : undefined}
                title=""
              />
            </div>
          </section>
          
          {/* Disclaimer */}
          <section className="mt-8 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Disclaimer:</strong> This report is for educational purposes only and does not constitute financial advice. 
              Past performance is not indicative of future results. Risk metrics are estimates based on historical data 
              and may not accurately predict future losses. Always consult with qualified financial professionals 
              before making investment decisions.
            </p>
          </section>
        </CardContent>
      </Card>
      
      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card cursor-pointer hover:border-primary/50 transition-colors" onClick={exportToCSV}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Export to CSV</h4>
              <p className="text-sm text-muted-foreground">Download all model results</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card cursor-pointer hover:border-primary/50 transition-colors" onClick={printReport}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Print Report</h4>
              <p className="text-sm text-muted-foreground">Print or save as PDF</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card opacity-50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold">Detailed Report</h4>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
