// Decision Lab - Automated hedge plan generation
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { useFX } from '@/context/FXContext';
import type { HedgePlan } from '@/lib/fx/types';

export default function DecisionLabPage() {
  const { 
    totalES, 
    esLimit, 
    isBreaching,
    setESLimit,
    generateHedgePlanAction,
  } = useFX();
  
  const [hedgePlan, setHedgePlan] = useState<HedgePlan | null>(null);
  const [naturalHedgeFirst, setNaturalHedgeFirst] = useState(true);
  const [maxHedgeRatio, setMaxHedgeRatio] = useState(80);
  const [minTradeSize, setMinTradeSize] = useState(2000);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  const handleGeneratePlan = () => {
    setIsGenerating(true);
    // Simulate async for UX
    setTimeout(() => {
      const plan = generateHedgePlanAction();
      setHedgePlan(plan);
      setIsGenerating(false);
    }, 500);
  };
  
  const esReduction = hedgePlan ? hedgePlan.esBefore - hedgePlan.esAfter : 0;
  const esReductionPercent = hedgePlan && hedgePlan.esBefore > 0 
    ? (esReduction / hedgePlan.esBefore) * 100 
    : 0;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Decision Lab</h1>
        <p className="text-muted-foreground">
          Automated hedge plan generation to meet ES limits
        </p>
      </div>
      
      {/* Status Alert */}
      {isBreaching ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>ES Limit Breach</AlertTitle>
          <AlertDescription>
            Current ES ({formatCurrency(totalES)}) exceeds limit ({formatCurrency(esLimit)}) 
            by {formatCurrency(totalES - esLimit)}. Generate a hedge plan to reduce tail risk.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-green-500">Within Limits</AlertTitle>
          <AlertDescription>
            Current ES ({formatCurrency(totalES)}) is below the limit ({formatCurrency(esLimit)}). 
            You can still generate a plan to further optimize hedging.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Hedge Parameters
            </CardTitle>
            <CardDescription>Configure constraints for hedge plan generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="es-limit">ES Limit (EUR)</Label>
                <Input
                  id="es-limit"
                  type="number"
                  value={esLimit}
                  onChange={(e) => setESLimit(Number(e.target.value))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Target maximum Expected Shortfall
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-ratio">Max Hedge Ratio (%)</Label>
                <Input
                  id="max-ratio"
                  type="number"
                  value={maxHedgeRatio}
                  onChange={(e) => setMaxHedgeRatio(Number(e.target.value))}
                  min={10}
                  max={100}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum % of exposure to hedge per currency
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min-trade">Min Trade Size (EUR)</Label>
                <Input
                  id="min-trade"
                  type="number"
                  value={minTradeSize}
                  onChange={(e) => setMinTradeSize(Number(e.target.value))}
                  min={500}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum notional for each hedge action
                </p>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="natural-first">Natural Hedge First</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prioritize offsetting receivables with payables
                  </p>
                </div>
                <Switch
                  id="natural-first"
                  checked={naturalHedgeFirst}
                  onCheckedChange={setNaturalHedgeFirst}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleGeneratePlan} 
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Hedge Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Before/After Cards */}
        <div className="space-y-4">
          <Card className={isBreaching ? 'border-destructive/50' : ''}>
            <CardHeader className="pb-2">
              <CardDescription>Current ES (Before)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalES)}</div>
              {isBreaching && (
                <Badge variant="destructive" className="mt-2">
                  Over limit by {formatCurrency(totalES - esLimit)}
                </Badge>
              )}
            </CardContent>
          </Card>
          
          {hedgePlan && (
            <>
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
              
              <Card className={hedgePlan.limitMet ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50'}>
                <CardHeader className="pb-2">
                  <CardDescription>Projected ES (After)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(hedgePlan.esAfter)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={hedgePlan.limitMet ? 'default' : 'secondary'} className="bg-green-500/10 text-green-500">
                      -{esReductionPercent.toFixed(0)}%
                    </Badge>
                    {hedgePlan.limitMet ? (
                      <Badge className="bg-green-500">Limit Met</Badge>
                    ) : (
                      <Badge variant="secondary">Partial</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
      
      {/* Hedge Plan Actions */}
      {hedgePlan && hedgePlan.actions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recommended Hedge Actions</CardTitle>
                <CardDescription>
                  {hedgePlan.actions.length} actions | Total cost: {formatCurrency(hedgePlan.totalCost)}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Notional</TableHead>
                    <TableHead>Hedge %</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>ES Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hedgePlan.actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-mono text-sm">{action.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{action.currency}</Badge>
                      </TableCell>
                      <TableCell>{action.bucket}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(action.notional)}</TableCell>
                      <TableCell className="font-mono">{action.hedgePercent.toFixed(0)}%</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {formatCurrency(action.estimatedCostEur)}
                      </TableCell>
                      <TableCell className="font-mono text-green-500">
                        -{formatCurrency(action.esReduction)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Rationale */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Plan Rationale</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {hedgePlan.actions.slice(0, 3).map((action) => (
                  <li key={action.id} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{action.rationale}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
      
      {hedgePlan && hedgePlan.actions.length === 0 && (
        <Alert>
          <CheckCircle className="h-5 w-5" />
          <AlertTitle>No Actions Required</AlertTitle>
          <AlertDescription>
            Current ES is already within the limit. No hedge actions are needed at this time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
