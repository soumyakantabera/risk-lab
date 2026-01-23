// Comprehensive sample data for RiskLab Pro
import type { Invoice, FXRate, Hedge } from './types';

// Generate realistic invoice data
export function generateSampleInvoices(): Invoice[] {
  const today = new Date();
  const counterparties = [
    'Acme Corp', 'GlobalTech GmbH', 'Pacific Trading', 'Nordic Supplies',
    'Alpine Manufacturing', 'Atlantic Logistics', 'Eastern Exports', 'Western Imports'
  ];
  const categories = ['inventory', 'services', 'equipment', 'raw_materials', 'licensing'];
  
  const invoices: Invoice[] = [];
  let id = 1;
  
  // USD payables - supplier payments
  const usdPayables = [
    { amount: 125000, days: 7, counterparty: 'Pacific Trading' },
    { amount: 85000, days: 14, counterparty: 'Acme Corp' },
    { amount: 200000, days: 21, counterparty: 'Pacific Trading' },
    { amount: 45000, days: 30, counterparty: 'Eastern Exports' },
    { amount: 180000, days: 45, counterparty: 'Acme Corp' },
    { amount: 95000, days: 60, counterparty: 'Western Imports' },
    { amount: 320000, days: 75, counterparty: 'Pacific Trading' },
    { amount: 150000, days: 90, counterparty: 'Acme Corp' },
  ];
  
  usdPayables.forEach(inv => {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + inv.days);
    const issueDate = new Date(dueDate);
    issueDate.setDate(issueDate.getDate() - 30);
    
    invoices.push({
      id: `INV-${String(id++).padStart(4, '0')}`,
      type: 'payable',
      counterparty: inv.counterparty,
      currency: 'USD',
      amount: inv.amount,
      issueDate,
      dueDate,
      category: categories[Math.floor(Math.random() * categories.length)],
    });
  });
  
  // USD receivables - customer payments
  const usdReceivables = [
    { amount: 75000, days: 10, counterparty: 'GlobalTech GmbH' },
    { amount: 150000, days: 25, counterparty: 'Nordic Supplies' },
    { amount: 95000, days: 40, counterparty: 'Alpine Manufacturing' },
    { amount: 210000, days: 55, counterparty: 'Atlantic Logistics' },
    { amount: 180000, days: 70, counterparty: 'GlobalTech GmbH' },
  ];
  
  usdReceivables.forEach(inv => {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + inv.days);
    const issueDate = new Date(dueDate);
    issueDate.setDate(issueDate.getDate() - 45);
    
    invoices.push({
      id: `INV-${String(id++).padStart(4, '0')}`,
      type: 'receivable',
      counterparty: inv.counterparty,
      currency: 'USD',
      amount: inv.amount,
      issueDate,
      dueDate,
      category: 'services',
    });
  });
  
  // GBP payables
  const gbpPayables = [
    { amount: 55000, days: 12, counterparty: 'Atlantic Logistics' },
    { amount: 120000, days: 28, counterparty: 'Nordic Supplies' },
    { amount: 85000, days: 50, counterparty: 'Atlantic Logistics' },
    { amount: 200000, days: 80, counterparty: 'Alpine Manufacturing' },
  ];
  
  gbpPayables.forEach(inv => {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + inv.days);
    const issueDate = new Date(dueDate);
    issueDate.setDate(issueDate.getDate() - 30);
    
    invoices.push({
      id: `INV-${String(id++).padStart(4, '0')}`,
      type: 'payable',
      counterparty: inv.counterparty,
      currency: 'GBP',
      amount: inv.amount,
      issueDate,
      dueDate,
      category: categories[Math.floor(Math.random() * categories.length)],
    });
  });
  
  // GBP receivables
  const gbpReceivables = [
    { amount: 95000, days: 15, counterparty: 'GlobalTech GmbH' },
    { amount: 180000, days: 35, counterparty: 'Eastern Exports' },
    { amount: 75000, days: 65, counterparty: 'Western Imports' },
  ];
  
  gbpReceivables.forEach(inv => {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + inv.days);
    const issueDate = new Date(dueDate);
    issueDate.setDate(issueDate.getDate() - 45);
    
    invoices.push({
      id: `INV-${String(id++).padStart(4, '0')}`,
      type: 'receivable',
      counterparty: inv.counterparty,
      currency: 'GBP',
      amount: inv.amount,
      issueDate,
      dueDate,
      category: 'licensing',
    });
  });
  
  // CHF exposure (smaller)
  invoices.push({
    id: `INV-${String(id++).padStart(4, '0')}`,
    type: 'payable',
    counterparty: 'Alpine Manufacturing',
    currency: 'CHF',
    amount: 75000,
    issueDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
    dueDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000),
    category: 'equipment',
  });
  
  invoices.push({
    id: `INV-${String(id++).padStart(4, '0')}`,
    type: 'payable',
    counterparty: 'Alpine Manufacturing',
    currency: 'CHF',
    amount: 120000,
    issueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
    dueDate: new Date(today.getTime() + 55 * 24 * 60 * 60 * 1000),
    category: 'equipment',
  });
  
  return invoices;
}

// Generate 2 years of realistic FX rate history
export function generateSampleFXRates(): Map<string, FXRate[]> {
  const rates = new Map<string, FXRate[]>();
  const today = new Date();
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  // EUR/USD: Base around 1.08, with realistic vol
  const eurusd: FXRate[] = [];
  let eurusdRate = 1.12; // Start 2 years ago
  
  // EUR/GBP: Base around 0.86
  const eurgbp: FXRate[] = [];
  let eurgbpRate = 0.88;
  
  // EUR/CHF: Base around 0.96
  const eurchf: FXRate[] = [];
  let eurchfRate = 0.98;
  
  const dailyVol = {
    eurusd: 0.005,
    eurgbp: 0.004,
    eurchf: 0.003,
  };
  
  // Add some regime changes
  const stressPeriods = [
    { start: 180, end: 210 }, // A stress period
    { start: 450, end: 480 }, // Another stress period
  ];
  
  for (let d = 0; d <= 730; d++) {
    const date = new Date(twoYearsAgo);
    date.setDate(date.getDate() + d);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Check if in stress period
    const inStress = stressPeriods.some(p => d >= p.start && d <= p.end);
    const volMultiplier = inStress ? 2.5 : 1;
    
    // Random walk with mean reversion
    const eurusdTarget = 1.08;
    const eurgbpTarget = 0.86;
    const eurchfTarget = 0.96;
    
    eurusdRate += (Math.random() - 0.5) * dailyVol.eurusd * volMultiplier * 2;
    eurusdRate += (eurusdTarget - eurusdRate) * 0.01; // Mean reversion
    eurusdRate = Math.max(0.95, Math.min(1.25, eurusdRate));
    
    eurgbpRate += (Math.random() - 0.5) * dailyVol.eurgbp * volMultiplier * 2;
    eurgbpRate += (eurgbpTarget - eurgbpRate) * 0.01;
    eurgbpRate = Math.max(0.75, Math.min(0.95, eurgbpRate));
    
    eurchfRate += (Math.random() - 0.5) * dailyVol.eurchf * volMultiplier * 2;
    eurchfRate += (eurchfTarget - eurchfRate) * 0.01;
    eurchfRate = Math.max(0.85, Math.min(1.05, eurchfRate));
    
    eurusd.push({ date: new Date(date), pair: 'EURUSD', rate: eurusdRate });
    eurgbp.push({ date: new Date(date), pair: 'EURGBP', rate: eurgbpRate });
    eurchf.push({ date: new Date(date), pair: 'EURCHF', rate: eurchfRate });
  }
  
  rates.set('EURUSD', eurusd);
  rates.set('EURGBP', eurgbp);
  rates.set('EURCHF', eurchf);
  
  return rates;
}

// Generate sample hedges
export function generateSampleHedges(): Hedge[] {
  const today = new Date();
  
  return [
    {
      id: 'HDG-001',
      pair: 'EURUSD',
      notional: 150000,
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      type: 'forward_proxy',
      costBps: 15,
    },
    {
      id: 'HDG-002',
      pair: 'EURUSD',
      notional: 100000,
      startDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000),
      type: 'forward_proxy',
      costBps: 18,
    },
    {
      id: 'HDG-003',
      pair: 'EURGBP',
      notional: 80000,
      startDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000),
      type: 'forward_proxy',
      costBps: 12,
    },
  ];
}

// CSV template generators
export function getInvoiceCSVTemplate(): string {
  return `invoice_id,type,counterparty,currency,amount_fc,issue_date,due_date,expected_pay_date,category,notes
INV-0001,payable,Acme Corp,USD,50000,2024-01-01,2024-02-01,,inventory,
INV-0002,receivable,GlobalTech GmbH,USD,75000,2024-01-05,2024-02-20,,services,`;
}

export function getFXRatesCSVTemplate(): string {
  return `date,pair,rate
2024-01-02,EURUSD,1.0850
2024-01-02,EURGBP,0.8620
2024-01-03,EURUSD,1.0875
2024-01-03,EURGBP,0.8615`;
}

export function getHedgesCSVTemplate(): string {
  return `hedge_id,pair,notional_fc,start_date,end_date,type,cost_bps
HDG-001,EURUSD,100000,2024-01-01,2024-03-01,forward_proxy,15
HDG-002,EURGBP,50000,2024-01-15,2024-04-15,forward_proxy,12`;
}

export function getLimitsCSVTemplate(): string {
  return `metric,limit_eur
ES_99_30D,50000
ES_99_60D,75000
ES_99_90D,100000`;
}
