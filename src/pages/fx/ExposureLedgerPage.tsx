// Exposure Ledger - Invoice management and exposure visualization
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileUp, 
  Download, 
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';
import { useFX } from '@/context/FXContext';
import Plot from 'react-plotly.js';
import { getInvoiceCSVTemplate } from '@/lib/fx/sampleData';

export default function ExposureLedgerPage() {
  const { invoices, exposureSummaries, loadSampleData } = useFX();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'amount'>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const currencies = useMemo(() => 
    [...new Set(invoices.map(i => i.currency))], 
    [invoices]
  );
  
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        if (currencyFilter !== 'all' && inv.currency !== currencyFilter) return false;
        if (typeFilter !== 'all' && inv.type !== typeFilter) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return inv.id.toLowerCase().includes(term) || 
                 inv.counterparty.toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => {
        const mult = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'dueDate') {
          return mult * (a.dueDate.getTime() - b.dueDate.getTime());
        }
        return mult * (a.amount - b.amount);
      });
  }, [invoices, currencyFilter, typeFilter, searchTerm, sortField, sortDir]);
  
  const formatCurrency = (value: number, currency: string) => 
    new Intl.NumberFormat('en-EU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  
  const formatDate = (date: Date) => 
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const daysUntilDue = (date: Date) => 
    Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  // Prepare chart data - exposure by due date
  const exposureByDate = useMemo(() => {
    const buckets: Record<string, { receivable: number; payable: number }> = {};
    
    invoices.forEach(inv => {
      const days = daysUntilDue(inv.dueDate);
      let bucket: string;
      if (days <= 7) bucket = '0-7D';
      else if (days <= 30) bucket = '8-30D';
      else if (days <= 60) bucket = '31-60D';
      else bucket = '61-90D';
      
      if (!buckets[bucket]) buckets[bucket] = { receivable: 0, payable: 0 };
      if (inv.type === 'receivable') buckets[bucket].receivable += inv.amount;
      else buckets[bucket].payable += inv.amount;
    });
    
    const labels = ['0-7D', '8-30D', '31-60D', '61-90D'];
    return {
      labels,
      receivable: labels.map(l => buckets[l]?.receivable || 0),
      payable: labels.map(l => buckets[l]?.payable || 0),
    };
  }, [invoices]);
  
  // Net exposure by currency
  const netByCurrency = useMemo(() => {
    const summaries = exposureSummaries.get('30D') || [];
    return {
      labels: summaries.map(s => s.currency),
      values: summaries.map(s => s.net),
    };
  }, [exposureSummaries]);
  
  const downloadTemplate = () => {
    const csv = getInvoiceCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices_template.csv';
    a.click();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exposure Ledger</h1>
          <p className="text-muted-foreground">
            Manage invoices and view exposure maturity structure
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            CSV Template
          </Button>
          <Button variant="outline" size="sm">
            <FileUp className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exposure by Maturity</CardTitle>
            <CardDescription>Stacked view of receivables vs payables</CardDescription>
          </CardHeader>
          <CardContent>
            <Plot
              data={[
                {
                  x: exposureByDate.labels,
                  y: exposureByDate.receivable.map(v => v / 1000),
                  type: 'bar',
                  name: 'Receivable',
                  marker: { color: 'hsl(142, 76%, 36%)' },
                },
                {
                  x: exposureByDate.labels,
                  y: exposureByDate.payable.map(v => -v / 1000),
                  type: 'bar',
                  name: 'Payable',
                  marker: { color: 'hsl(350, 80%, 55%)' },
                },
              ]}
              layout={{
                autosize: true,
                height: 280,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'hsl(var(--foreground))' },
                barmode: 'relative',
                xaxis: { showgrid: false },
                yaxis: { 
                  showgrid: true, 
                  gridcolor: 'hsl(var(--border) / 0.3)',
                  ticksuffix: 'k',
                  zeroline: true,
                  zerolinecolor: 'hsl(var(--muted-foreground))',
                },
                legend: { orientation: 'h', y: -0.15 },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
              useResizeHandler
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Net Exposure by Currency</CardTitle>
            <CardDescription>30-day net position per currency pair</CardDescription>
          </CardHeader>
          <CardContent>
            <Plot
              data={[
                {
                  x: netByCurrency.labels,
                  y: netByCurrency.values.map(v => v / 1000),
                  type: 'bar',
                  marker: { 
                    color: netByCurrency.values.map(v => 
                      v >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(350, 80%, 55%)'
                    ),
                  },
                },
              ]}
              layout={{
                autosize: true,
                height: 280,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'hsl(var(--foreground))' },
                xaxis: { showgrid: false },
                yaxis: { 
                  showgrid: true, 
                  gridcolor: 'hsl(var(--border) / 0.3)',
                  ticksuffix: 'k',
                  zeroline: true,
                  zerolinecolor: 'hsl(var(--muted-foreground))',
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
              useResizeHandler
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {currencies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="receivable">Receivable</SelectItem>
                  <SelectItem value="payable">Payable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'amount') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                      else setSortField('amount');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'dueDate') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                      else setSortField('dueDate');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Due Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.slice(0, 50).map(inv => {
                  const days = daysUntilDue(inv.dueDate);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={inv.type === 'receivable' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {inv.type === 'receivable' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {inv.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{inv.counterparty}</TableCell>
                      <TableCell className="font-mono">{inv.currency}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(inv.amount, inv.currency)}
                      </TableCell>
                      <TableCell>{formatDate(inv.dueDate)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={days <= 7 ? 'destructive' : days <= 30 ? 'secondary' : 'outline'}
                        >
                          {days}D
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {Math.min(50, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
