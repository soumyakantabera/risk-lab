// Report Builder - PDF export page
import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download,
  Printer,
  Calendar,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useFX } from '@/context/FXContext';

export default function ReportBuilderPage() {
  const { 
    invoices, 
    totalES, 
    totalCFaR,
    esLimit,
    hedgeCoverage,
    regime,
    componentES,
    isBreaching,
  } = useFX();
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  const formatDate = (date: Date) => 
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Report Builder</h1>
          <p className="text-muted-foreground">
            Generate and export risk reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>
      
      {/* Report Preview */}
      <div ref={reportRef} className="space-y-6 print:space-y-4">
        {/* Report Header */}
        <Card className="print:shadow-none print:border-0">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">FX Tail Risk Report</h1>
                <p className="text-muted-foreground">RiskLab Pro Analysis</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(new Date())}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Building2 className="h-4 w-4" />
                  Base Currency: EUR
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Executive Summary */}
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 print:bg-gray-100">
                <div className="text-sm text-muted-foreground">Total Invoices</div>
                <div className="text-2xl font-bold">{invoices.length}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 print:bg-gray-100">
                <div className="text-sm text-muted-foreground">ES (99%) 30D</div>
                <div className="text-2xl font-bold">{formatCurrency(totalES)}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 print:bg-gray-100">
                <div className="text-sm text-muted-foreground">CFaR (95%)</div>
                <div className="text-2xl font-bold">{formatCurrency(totalCFaR)}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 print:bg-gray-100">
                <div className="text-sm text-muted-foreground">Hedge Coverage</div>
                <div className="text-2xl font-bold">{hedgeCoverage.toFixed(1)}%</div>
              </div>
            </div>
            
            {isBreaching && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 print:bg-red-50">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  ES limit breach: {formatCurrency(totalES)} exceeds {formatCurrency(esLimit)} limit
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Regime & Model */}
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Regime & Model Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Current Regime:</span>
                <Badge className={`ml-2 capitalize ${
                  regime === 'calm' ? 'bg-green-500/10 text-green-500' :
                  regime === 'stress' ? 'bg-red-500/10 text-red-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {regime}
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <span className="text-sm text-muted-foreground">Model:</span>
                <span className="ml-2 font-medium">Regime-Blended ES</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              The risk model automatically adjusts weights across Historical Simulation, 
              EWMA, Student-t, Filtered HS, and Monte Carlo based on detected market regime.
            </p>
          </CardContent>
        </Card>
        
        {/* ES Attribution */}
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Tail Risk Attribution</CardTitle>
            <CardDescription>Top contributors to Expected Shortfall</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {componentES.slice(0, 5).map((comp, i) => (
                <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 print:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                    <span className="font-medium">{comp.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">{formatCurrency(comp.es)}</span>
                    <Badge variant="outline">{comp.percentOfTotal.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Disclaimer */}
        <Card className="print:shadow-none print:break-before-page">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Disclaimer</h3>
            <p className="text-sm text-muted-foreground">
              This report is generated by RiskLab Pro for informational purposes only. 
              The risk metrics presented are based on historical data and statistical models, 
              which may not accurately predict future market conditions. This analysis does not 
              constitute financial advice. Users should consult with qualified financial 
              professionals before making hedging or trading decisions. Past performance is 
              not indicative of future results.
            </p>
            <Separator className="my-4" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Generated by RiskLab Pro</span>
              <span>{formatDate(new Date())} at {new Date().toLocaleTimeString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
