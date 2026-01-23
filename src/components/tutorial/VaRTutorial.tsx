// Interactive VaR Tutorial with animated visualizations
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause,
  SkipForward,
  SkipBack,
  BookOpen,
  BarChart3,
  TrendingDown,
  Shield,
  Calculator,
  Lightbulb,
  Check,
  ChevronRight,
} from 'lucide-react';
import Plot from 'react-plotly.js';
import { randomNormal } from '@/lib/risk/statistics';

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  visualization: 'price' | 'returns' | 'histogram' | 'var' | 'es' | 'complete';
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Step 1: Collect Price Data',
    content: 'VaR starts with historical price data. We track how an asset\'s price changes over time. More data = more reliable risk estimates.',
    visualization: 'price',
    highlight: 'Each point represents a daily closing price',
  },
  {
    id: 2,
    title: 'Step 2: Calculate Returns',
    content: 'We convert prices to returns using the log return formula: r = ln(P_t / P_{t-1}). Returns are more useful than prices because they are comparable across assets and time.',
    visualization: 'returns',
    highlight: 'Log returns are additive over time',
  },
  {
    id: 3,
    title: 'Step 3: Build the Distribution',
    content: 'We create a histogram of all historical returns. This shows us how often different return values occurred. The shape tells us about the asset\'s risk profile.',
    visualization: 'histogram',
    highlight: 'The bell shape is typical for financial returns',
  },
  {
    id: 4,
    title: 'Step 4: Find VaR (The Red Line)',
    content: 'VaR at 95% confidence is the return value where only 5% of historical returns were worse. In other words: "We expect to lose no more than this amount 95% of the time."',
    visualization: 'var',
    highlight: 'VaR is the 5th percentile of the return distribution',
  },
  {
    id: 5,
    title: 'Step 5: Calculate Expected Shortfall (ES)',
    content: 'ES (also called CVaR) is the average loss in the worst 5% of scenarios. It answers: "When things go really bad, how bad on average?" ES is always ≥ VaR.',
    visualization: 'es',
    highlight: 'ES captures tail risk better than VaR alone',
  },
  {
    id: 6,
    title: '🎓 Complete!',
    content: 'You now understand the core VaR calculation! In practice, we also scale for portfolio value and time horizon, and use different models (Parametric, Monte Carlo, etc.).',
    visualization: 'complete',
    highlight: 'VaR is a risk measure, not a guarantee',
  },
];

export function VaRTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Generate sample data for visualization
  const sampleData = useMemo(() => {
    const n = 100;
    const prices: number[] = [100];
    const returns: number[] = [];
    const dates: string[] = [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - n);
    
    for (let i = 0; i < n; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      if (i > 0) {
        const ret = randomNormal(0.0004, 0.015);
        returns.push(ret);
        prices.push(prices[i - 1] * Math.exp(ret));
      }
    }
    
    // Calculate VaR and ES
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Idx = Math.floor(returns.length * 0.05);
    const var95 = sortedReturns[var95Idx];
    const es95 = sortedReturns.slice(0, var95Idx + 1).reduce((a, b) => a + b, 0) / (var95Idx + 1);
    
    return { prices, returns, dates, var95, es95 };
  }, []);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(s => s + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const goNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setAnimationProgress(0);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAnimationProgress(0);
    }
  };

  const renderVisualization = () => {
    const animatedDataCount = Math.floor((animationProgress / 100) * sampleData.prices.length);
    
    switch (step.visualization) {
      case 'price':
        return (
          <Plot
            data={[{
              x: sampleData.dates.slice(0, Math.max(1, animatedDataCount)),
              y: sampleData.prices.slice(0, Math.max(1, animatedDataCount)),
              type: 'scatter',
              mode: 'lines+markers',
              line: { color: '#3b82f6', width: 2 },
              marker: { size: 4 },
              name: 'Price',
            }]}
            layout={{
              height: 250,
              margin: { l: 50, r: 20, t: 30, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94a3b8', size: 11 },
              xaxis: { gridcolor: 'rgba(148, 163, 184, 0.1)', showticklabels: false },
              yaxis: { 
                gridcolor: 'rgba(148, 163, 184, 0.1)', 
                title: { text: 'Price ($)', font: { size: 11 } } 
              },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        );
      
      case 'returns':
        return (
          <Plot
            data={[{
              x: sampleData.dates.slice(1, Math.max(2, animatedDataCount)),
              y: sampleData.returns.slice(0, Math.max(1, animatedDataCount - 1)),
              type: 'bar',
              marker: { 
                color: sampleData.returns.slice(0, animatedDataCount - 1).map(r => r >= 0 ? '#22c55e' : '#ef4444')
              },
              name: 'Daily Return',
            }]}
            layout={{
              height: 250,
              margin: { l: 50, r: 20, t: 30, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94a3b8', size: 11 },
              xaxis: { gridcolor: 'rgba(148, 163, 184, 0.1)', showticklabels: false },
              yaxis: { 
                gridcolor: 'rgba(148, 163, 184, 0.1)', 
                title: { text: 'Return (%)', font: { size: 11 } },
                tickformat: '.1%',
              },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        );
      
      case 'histogram':
        return (
          <Plot
            data={[{
              x: sampleData.returns,
              type: 'histogram',
              marker: { color: '#3b82f6', opacity: 0.7 },
              name: 'Return Distribution',
            } as Plotly.Data]}
            layout={{
              height: 250,
              margin: { l: 50, r: 20, t: 30, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94a3b8', size: 11 },
              xaxis: { 
                gridcolor: 'rgba(148, 163, 184, 0.1)', 
                title: { text: 'Return', font: { size: 11 } },
                tickformat: '.1%',
              },
              yaxis: { 
                gridcolor: 'rgba(148, 163, 184, 0.1)', 
                title: { text: 'Frequency', font: { size: 11 } } 
              },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        );
      
      case 'var':
        return (
          <Plot
            data={[
              {
                x: sampleData.returns,
                type: 'histogram',
                marker: { color: '#3b82f6', opacity: 0.7 },
                name: 'Returns',
              } as Plotly.Data,
              {
                x: [sampleData.var95, sampleData.var95],
                y: [0, 15],
                type: 'scatter',
                mode: 'lines',
                line: { color: '#ef4444', width: 3, dash: 'dash' },
                name: `VaR 95% = ${(sampleData.var95 * 100).toFixed(2)}%`,
              },
            ]}
            layout={{
              height: 250,
              margin: { l: 50, r: 20, t: 30, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94a3b8', size: 11 },
              xaxis: { 
                gridcolor: 'rgba(148, 163, 184, 0.1)', 
                title: { text: 'Return', font: { size: 11 } },
                tickformat: '.1%',
              },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.1)' },
              showlegend: true,
              legend: { x: 0, y: 1.1, orientation: 'h' },
              annotations: [{
                x: sampleData.var95,
                y: 12,
                text: 'VaR Line',
                showarrow: true,
                arrowhead: 2,
                arrowcolor: '#ef4444',
                font: { color: '#ef4444' },
              }],
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        );
      
      case 'es':
        // Highlight the tail area for ES
        const tailReturns = sampleData.returns.filter(r => r <= sampleData.var95);
        return (
          <Plot
            data={[
              {
                x: sampleData.returns.filter(r => r > sampleData.var95),
                type: 'histogram',
                marker: { color: '#3b82f6', opacity: 0.7 },
                name: 'Normal Returns',
              } as Plotly.Data,
              {
                x: tailReturns,
                type: 'histogram',
                marker: { color: '#f59e0b', opacity: 0.9 },
                name: 'Tail (worst 5%)',
              } as Plotly.Data,
              {
                x: [sampleData.var95, sampleData.var95],
                y: [0, 15],
                type: 'scatter',
                mode: 'lines',
                line: { color: '#ef4444', width: 2, dash: 'dash' },
                name: 'VaR 95%',
              },
              {
                x: [sampleData.es95, sampleData.es95],
                y: [0, 15],
                type: 'scatter',
                mode: 'lines',
                line: { color: '#f59e0b', width: 3 },
                name: `ES 95% = ${(sampleData.es95 * 100).toFixed(2)}%`,
              },
            ]}
            layout={{
              height: 250,
              margin: { l: 50, r: 20, t: 30, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94a3b8', size: 11 },
              barmode: 'overlay',
              xaxis: { 
                gridcolor: 'rgba(148, 163, 184, 0.1)',
                tickformat: '.1%',
              },
              yaxis: { gridcolor: 'rgba(148, 163, 184, 0.1)' },
              showlegend: true,
              legend: { x: 0, y: 1.15, orientation: 'h', font: { size: 10 } },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        );
      
      case 'complete':
        return (
          <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 animate-scale-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20 mb-4">
              <Check className="h-10 w-10 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Tutorial Complete!</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              You've learned the core concepts of VaR calculation. 
              Now try loading data and exploring the Models page!
            </p>
          </div>
        );
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Interactive VaR Tutorial
          <Badge variant="secondary" className="ml-2">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Learn how Value at Risk is calculated, step by step
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {TUTORIAL_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStep(i);
                  setAnimationProgress(100);
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  i <= currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-4 animate-fade-in" key={step.id}>
          <div className="flex items-start gap-3">
            {step.visualization === 'price' && <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />}
            {step.visualization === 'returns' && <Calculator className="h-5 w-5 text-success flex-shrink-0 mt-1" />}
            {step.visualization === 'histogram' && <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />}
            {step.visualization === 'var' && <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />}
            {step.visualization === 'es' && <Shield className="h-5 w-5 text-warning flex-shrink-0 mt-1" />}
            {step.visualization === 'complete' && <Lightbulb className="h-5 w-5 text-success flex-shrink-0 mt-1" />}
            <div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{step.content}</p>
            </div>
          </div>

          {step.highlight && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                {step.highlight}
              </p>
            </div>
          )}
        </div>

        {/* Visualization */}
        <div className="rounded-lg border border-border/30 bg-card/50 overflow-hidden">
          {renderVisualization()}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={currentStep === 0}
          >
            <SkipBack className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying && animationProgress >= 100) {
                  setAnimationProgress(0);
                }
              }}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Auto Play
                </>
              )}
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={currentStep === TUTORIAL_STEPS.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Formula Reference */}
        {(step.visualization === 'returns' || step.visualization === 'var') && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 font-mono text-sm">
            {step.visualization === 'returns' && (
              <div className="text-center">
                <span className="text-primary">r</span>
                <span className="text-muted-foreground"> = ln(</span>
                <span className="text-foreground">P<sub>t</sub></span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-foreground">P<sub>t-1</sub></span>
                <span className="text-muted-foreground">)</span>
              </div>
            )}
            {step.visualization === 'var' && (
              <div className="text-center">
                <span className="text-destructive">VaR</span>
                <span className="text-muted-foreground"><sub>95%</sub> = Percentile(returns, 5%) × Portfolio Value</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
