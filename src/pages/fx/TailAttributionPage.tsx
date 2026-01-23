// Tail Attribution - Component ES and Marginal ES analysis
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  PieChart, 
  BarChart3,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { useFX } from '@/context/FXContext';
import Plot from 'react-plotly.js';

export default function TailAttributionPage() {
  const { componentES, marginalES, totalES, invoices, fxReturns } = useFX();
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  // Waterfall chart data
  const waterfallData = useMemo(() => {
    if (componentES.length === 0) return null;
    
    const items = [
      { name: 'Total ES', value: totalES, isTotal: true },
      ...componentES.map(c => ({ name: c.name, value: c.es, isTotal: false })),
    ];
    
    return items;
  }, [componentES, totalES]);
  
  // Top 20 worst scenarios
  const worstScenarios = useMemo(() => {
    if (fxReturns.size === 0) return [];
    
    const eurusdReturns = fxReturns.get('EURUSD') || [];
    const losses = eurusdReturns.map((r, i) => ({
      index: i,
      fxMove: r * 100,
      loss: -r * 100000, // Assume 100k exposure
    }));
    
    return losses
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 20);
  }, [fxReturns]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tail Attribution</h1>
        <p className="text-muted-foreground">
          Component ES and Marginal ES analysis for risk decomposition
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total ES (99%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalES)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected tail loss in worst 1% scenarios
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Driver</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {componentES[0]?.name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {componentES[0] ? `${componentES[0].percentOfTotal.toFixed(1)}% of total ES` : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best Hedge Target</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marginalES[0]?.currency} {marginalES[0]?.bucket || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {marginalES[0] ? `€${marginalES[0].mesPerThousand.toFixed(0)} ES reduction per €1k hedged` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Waterfall & Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              ES Waterfall by Currency
            </CardTitle>
            <CardDescription>Contribution to total tail risk</CardDescription>
          </CardHeader>
          <CardContent>
            {waterfallData ? (
              <Plot
                data={[
                  {
                    x: waterfallData.map(d => d.name),
                    y: waterfallData.map(d => d.value / 1000),
                    type: 'bar',
                    marker: { 
                      color: waterfallData.map((d, i) => 
                        i === 0 ? 'hsl(350, 80%, 55%)' : 'hsl(var(--primary))'
                      ),
                    },
                  } as Plotly.Data,
                ]}
                layout={{
                  autosize: true,
                  height: 300,
                  margin: { l: 50, r: 20, t: 20, b: 80 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: 'hsl(var(--foreground))' },
                  xaxis: { showgrid: false, tickangle: -45 },
                  yaxis: { 
                    showgrid: true, 
                    gridcolor: 'hsl(var(--border) / 0.3)',
                    ticksuffix: 'k',
                  },
                  showlegend: false,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              ES Distribution
            </CardTitle>
            <CardDescription>Share of tail risk by currency</CardDescription>
          </CardHeader>
          <CardContent>
            {componentES.length > 0 ? (
              <Plot
                data={[
                  {
                    values: componentES.map(c => c.es),
                    labels: componentES.map(c => c.name),
                    type: 'pie',
                    hole: 0.4,
                    marker: {
                      colors: [
                        'hsl(var(--primary))',
                        'hsl(142, 76%, 36%)',
                        'hsl(38, 92%, 50%)',
                        'hsl(280, 65%, 60%)',
                      ],
                    },
                    textinfo: 'label+percent',
                    textposition: 'outside',
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 300,
                  margin: { l: 40, r: 40, t: 20, b: 20 },
                  paper_bgcolor: 'transparent',
                  font: { color: 'hsl(var(--foreground))', size: 11 },
                  showlegend: false,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Marginal ES Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Marginal ES (Hedge Sensitivity)
          </CardTitle>
          <CardDescription>
            ES reduction per €1,000 hedged by currency and time bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>MES per €1k</TableHead>
                  <TableHead>ES Reduction</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marginalES.slice(0, 10).map((mes, i) => (
                  <TableRow key={`${mes.currency}-${mes.bucket}`}>
                    <TableCell className="font-mono">#{i + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {mes.currency}
                      </Badge>
                    </TableCell>
                    <TableCell>{mes.bucket}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(mes.mesPerThousand)}
                    </TableCell>
                    <TableCell className="font-mono text-green-500">
                      -{formatCurrency(mes.esReduction)}
                    </TableCell>
                    <TableCell>
                      {i < 3 ? (
                        <Badge className="bg-primary/10 text-primary">
                          Priority hedge target
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Standard</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Worst Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 20 Worst Tail Scenarios</CardTitle>
          <CardDescription>Historical scenarios causing largest losses</CardDescription>
        </CardHeader>
        <CardContent>
          {worstScenarios.length > 0 ? (
            <Plot
              data={[
                {
                  x: worstScenarios.map((_, i) => `Scenario ${i + 1}`),
                  y: worstScenarios.map(s => s.loss / 1000),
                  type: 'bar',
                  marker: { color: 'hsl(350, 80%, 55%)' },
                  hovertemplate: 'FX Move: %{customdata:.2f}%<br>Loss: €%{y:.1f}k<extra></extra>',
                  customdata: worstScenarios.map(s => s.fxMove),
                },
              ]}
              layout={{
                autosize: true,
                height: 250,
                margin: { l: 50, r: 20, t: 20, b: 60 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'hsl(var(--foreground))' },
                xaxis: { showgrid: false, tickangle: -45 },
                yaxis: { 
                  showgrid: true, 
                  gridcolor: 'hsl(var(--border) / 0.3)',
                  ticksuffix: 'k',
                  title: { text: 'Loss (EUR)' },
                },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
              useResizeHandler
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No scenarios available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
