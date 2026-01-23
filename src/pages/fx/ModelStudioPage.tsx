// Model Studio - VaR/ES models with regime blending
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Zap, 
  Settings,
  PieChart,
  TrendingDown
} from 'lucide-react';
import { useFX } from '@/context/FXContext';
import { REGIME_WEIGHTS } from '@/lib/fx/types';
import { calculateBlendedES } from '@/lib/fx/riskEngine';
import Plot from 'react-plotly.js';

export default function ModelStudioPage() {
  const { 
    regime, 
    regimeAuto, 
    modelWeights,
    fxReturns,
    exposureSummaries,
    setRegimeAuto,
    setModelWeights,
  } = useFX();
  
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  
  const pairs = useMemo(() => Array.from(fxReturns.keys()), [fxReturns]);
  
  const returns = fxReturns.get(selectedPair) || [];
  
  // Calculate ES by model
  const modelResults = useMemo(() => {
    if (returns.length < 50) return null;
    
    const summaries = exposureSummaries.get('30D') || [];
    const totalExposure = summaries.reduce((sum, s) => sum + Math.abs(s.unhedged), 0);
    
    return calculateBlendedES(returns, totalExposure || 100000, 0.99, modelWeights);
  }, [returns, exposureSummaries, modelWeights]);
  
  const regimeColors: Record<string, string> = {
    calm: 'text-green-500 bg-green-500/10',
    normal: 'text-yellow-500 bg-yellow-500/10',
    stress: 'text-red-500 bg-red-500/10',
  };
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  // Distribution with VaR/ES markers
  const histogramData = useMemo(() => {
    if (returns.length === 0) return null;
    
    const losses = returns.map(r => -r * 100); // Convert to % loss
    const sorted = [...losses].sort((a, b) => a - b);
    
    const var99Idx = Math.floor(sorted.length * 0.99);
    const var99 = sorted[var99Idx];
    const es99 = sorted.slice(var99Idx).reduce((a, b) => a + b, 0) / (sorted.length - var99Idx);
    
    return { losses, var99, es99 };
  }, [returns]);
  
  // Model weight donut
  const weightData = [
    { name: 'Historical', weight: modelWeights.historical, color: 'hsl(var(--primary))' },
    { name: 'EWMA', weight: modelWeights.ewma, color: 'hsl(142, 76%, 36%)' },
    { name: 'Student-t', weight: modelWeights.studentT, color: 'hsl(38, 92%, 50%)' },
    { name: 'FHS', weight: modelWeights.fhs, color: 'hsl(280, 65%, 60%)' },
    { name: 'Monte Carlo', weight: modelWeights.monteCarlo, color: 'hsl(190, 90%, 50%)' },
  ];
  
  const handleWeightChange = (model: keyof typeof modelWeights, value: number) => {
    const newWeights = { ...modelWeights, [model]: value / 100 };
    // Normalize to sum to 1
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    Object.keys(newWeights).forEach(k => {
      newWeights[k as keyof typeof modelWeights] /= total;
    });
    setModelWeights(newWeights);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Studio</h1>
          <p className="text-muted-foreground">
            VaR/ES models with automatic regime-based blending
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={`text-sm capitalize ${regimeColors[regime]}`}>
            <Zap className="h-3 w-3 mr-1" />
            {regime} regime
          </Badge>
        </div>
      </div>
      
      {/* Regime & Model Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Model Weights
            </CardTitle>
            <CardDescription>
              {regimeAuto 
                ? `Auto-adjusted for ${regime} regime conditions`
                : 'Manual weight configuration'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-regime" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Auto-detect regime
              </Label>
              <Switch
                id="auto-regime"
                checked={regimeAuto}
                onCheckedChange={setRegimeAuto}
              />
            </div>
            
            {!regimeAuto && (
              <div className="space-y-4 pt-4 border-t">
                {Object.entries(modelWeights).map(([model, weight]) => (
                  <div key={model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{model.replace(/([A-Z])/g, ' $1')}</Label>
                      <span className="text-sm font-mono">{(weight * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[weight * 100]}
                      onValueChange={([v]) => handleWeightChange(model as keyof typeof modelWeights, v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {regimeAuto && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                {(['calm', 'normal', 'stress'] as const).map(r => (
                  <div 
                    key={r}
                    className={`p-3 rounded-lg border ${regime === r ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  >
                    <div className="text-sm font-medium capitalize mb-2">{r}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HS</span>
                        <span>{(REGIME_WEIGHTS[r].historical * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EWMA</span>
                        <span>{(REGIME_WEIGHTS[r].ewma * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">t-dist</span>
                        <span>{(REGIME_WEIGHTS[r].studentT * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Weight Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Plot
              data={[
                {
                  values: weightData.map(d => d.weight),
                  labels: weightData.map(d => d.name),
                  type: 'pie',
                  hole: 0.5,
                  marker: { colors: weightData.map(d => d.color) },
                  textinfo: 'percent',
                  textposition: 'outside',
                },
              ]}
              layout={{
                autosize: true,
                height: 250,
                margin: { l: 20, r: 20, t: 20, b: 20 },
                paper_bgcolor: 'transparent',
                font: { color: 'hsl(var(--foreground))', size: 10 },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
              useResizeHandler
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Model Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Returns Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Returns Distribution</CardTitle>
                <CardDescription>With VaR/ES markers</CardDescription>
              </div>
              <div className="flex gap-2">
                {pairs.map(pair => (
                  <Button
                    key={pair}
                    variant={selectedPair === pair ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPair(pair)}
                  >
                    {pair}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {histogramData ? (
              <Plot
                data={[
                  {
                    x: histogramData.losses,
                    type: 'histogram',
                    marker: { color: 'hsl(var(--primary) / 0.6)' },
                    name: 'Returns',
                  } as Plotly.Data,
                ]}
                layout={{
                  autosize: true,
                  height: 300,
                  margin: { l: 50, r: 20, t: 20, b: 40 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: 'hsl(var(--foreground))' },
                  xaxis: { 
                    title: { text: 'Daily Loss %' },
                    showgrid: false,
                  },
                  yaxis: { 
                    showgrid: true, 
                    gridcolor: 'hsl(var(--border) / 0.3)',
                  },
                  shapes: [
                    {
                      type: 'line',
                      x0: histogramData.var99,
                      x1: histogramData.var99,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      line: { color: 'hsl(38, 92%, 50%)', width: 2, dash: 'dash' },
                    },
                    {
                      type: 'line',
                      x0: histogramData.es99,
                      x1: histogramData.es99,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      line: { color: 'hsl(350, 80%, 55%)', width: 2 },
                    },
                  ],
                  annotations: [
                    {
                      x: histogramData.var99,
                      y: 1,
                      yref: 'paper',
                      text: `VaR 99%: ${histogramData.var99.toFixed(2)}%`,
                      showarrow: false,
                      yanchor: 'bottom',
                      font: { size: 10, color: 'hsl(38, 92%, 50%)' },
                    },
                    {
                      x: histogramData.es99,
                      y: 0.9,
                      yref: 'paper',
                      text: `ES 99%: ${histogramData.es99.toFixed(2)}%`,
                      showarrow: false,
                      yanchor: 'bottom',
                      font: { size: 10, color: 'hsl(350, 80%, 55%)' },
                    },
                  ],
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
        
        {/* Model Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Model Results (99% / 30D)
            </CardTitle>
            <CardDescription>VaR and ES by methodology</CardDescription>
          </CardHeader>
          <CardContent>
            {modelResults ? (
              <div className="space-y-3">
                {Object.entries(modelResults.byModel).map(([model, result]) => (
                  <div 
                    key={model}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-8 rounded-full"
                        style={{ 
                          backgroundColor: weightData.find(
                            d => d.name.toLowerCase().includes(model.toLowerCase().slice(0, 4))
                          )?.color || 'hsl(var(--muted))'
                        }}
                      />
                      <span className="font-medium capitalize">
                        {model.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground mr-2">VaR:</span>
                        <span className="font-mono">{formatCurrency(result.var)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-2">ES:</span>
                        <span className="font-mono">{formatCurrency(result.es)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                  <span className="font-semibold">Blended Result</span>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground mr-2">VaR:</span>
                      <span className="font-mono font-semibold">{formatCurrency(modelResults.var)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-2">ES:</span>
                      <span className="font-mono font-semibold">{formatCurrency(modelResults.es)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Load data to see model results
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
