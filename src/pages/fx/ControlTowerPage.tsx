// Control Tower - FX Risk Dashboard Home
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Zap,
  ArrowRight,
  RefreshCw,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFX } from '@/context/FXContext';
import Plot from 'react-plotly.js';

export default function ControlTowerPage() {
  const { 
    invoices, 
    totalES, 
    totalCFaR, 
    hedgeCoverage, 
    regime, 
    esLimit,
    isBreaching,
    componentES,
    loadSampleData,
    fxReturns,
  } = useFX();
  
  // Auto-load sample data if empty
  useEffect(() => {
    if (invoices.length === 0) {
      loadSampleData();
    }
  }, [invoices.length, loadSampleData]);
  
  const regimeColors: Record<string, string> = {
    calm: 'text-green-500 bg-green-500/10 border-green-500/20',
    normal: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    stress: 'text-red-500 bg-red-500/10 border-red-500/20',
  };
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  // Prepare rolling ES chart data
  const eurusdReturns = fxReturns.get('EURUSD') || [];
  const rollingESData = eurusdReturns.slice(-60).map((_, i, arr) => {
    const slice = arr.slice(Math.max(0, i - 20), i + 1);
    if (slice.length < 10) return null;
    const sorted = [...slice].map(r => -r * 100000).sort((a, b) => b - a);
    const idx = Math.floor(sorted.length * 0.01);
    return sorted[idx] || 0;
  }).filter(v => v !== null);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Control Tower</h1>
          <p className="text-muted-foreground">
            FX tail-risk overview and limit monitoring
          </p>
        </div>
        <Button onClick={loadSampleData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload Sample Data
        </Button>
      </div>
      
      {/* Breach Alert */}
      {isBreaching && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg">ES Limit Breach Detected</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Current ES ({formatCurrency(totalES)}) exceeds limit ({formatCurrency(esLimit)}) 
              by {formatCurrency(totalES - esLimit)}
            </span>
            <Link to="/fx/decision">
              <Button variant="destructive" size="sm">
                Generate Hedge Plan <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={isBreaching ? 'border-destructive/50 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              ES (99%) 30D
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalES)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Limit:</span>
              <span className={`text-xs font-medium ${isBreaching ? 'text-destructive' : 'text-green-500'}`}>
                {formatCurrency(esLimit)}
              </span>
            </div>
            <Progress 
              value={Math.min(100, (totalES / esLimit) * 100)} 
              className={`h-1.5 mt-2 ${isBreaching ? '[&>div]:bg-destructive' : ''}`}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              CFaR (95%) 30D
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCFaR)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cashflow at risk under normal conditions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Hedge Coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hedgeCoverage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              of net 30D exposure hedged
            </p>
            <Progress value={hedgeCoverage} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Regime State
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className={`text-sm capitalize ${regimeColors[regime]}`}>
              {regime}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {regime === 'calm' && 'Low volatility environment'}
              {regime === 'normal' && 'Standard market conditions'}
              {regime === 'stress' && 'Elevated volatility detected'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tail Drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Tail Risk Drivers</CardTitle>
            <CardDescription>Currency pairs causing most ES</CardDescription>
          </CardHeader>
          <CardContent>
            {componentES.length > 0 ? (
              <div className="space-y-3">
                {componentES.slice(0, 5).map((comp, i) => (
                  <div key={comp.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-5">#{i + 1}</span>
                      <span className="font-medium">{comp.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{formatCurrency(comp.es)}</span>
                      <Badge variant="outline" className="text-xs">
                        {comp.percentOfTotal.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Load data to see tail risk attribution
              </p>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link to="/fx/attribution">
                <Button variant="outline" size="sm" className="w-full">
                  View Full Attribution <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Rolling ES Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rolling ES (30D)</CardTitle>
            <CardDescription>Historical ES evolution with limit line</CardDescription>
          </CardHeader>
          <CardContent>
            {rollingESData.length > 0 ? (
              <Plot
                data={[
                  {
                    y: rollingESData,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'ES',
                    line: { color: 'hsl(var(--primary))', width: 2 },
                  },
                  {
                    y: Array(rollingESData.length).fill(esLimit / 1000),
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Limit',
                    line: { color: 'hsl(var(--destructive))', width: 1, dash: 'dash' },
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 250,
                  margin: { l: 50, r: 20, t: 20, b: 30 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: 'hsl(var(--foreground))' },
                  xaxis: { showgrid: false },
                  yaxis: { 
                    showgrid: true, 
                    gridcolor: 'hsl(var(--border) / 0.3)',
                    tickprefix: '€',
                  },
                  showlegend: false,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/fx/exposures">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-5 w-5" />
                <span>View Exposures</span>
              </Button>
            </Link>
            <Link to="/fx/models">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Zap className="h-5 w-5" />
                <span>Model Studio</span>
              </Button>
            </Link>
            <Link to="/fx/decision">
              <Button variant={isBreaching ? 'default' : 'outline'} className="w-full h-auto py-4 flex-col gap-2">
                <Shield className="h-5 w-5" />
                <span>Decision Lab</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
