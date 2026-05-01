// Theme-aware Plotly chart colors. Reads CSS custom properties so charts
// automatically follow light/dark mode without hardcoded HSL values.
import { useEffect, useState } from 'react';
import { useRisk } from '@/context/RiskContext';

export interface ChartTheme {
  fg: string;        // primary text (titles, ticks)
  mutedFg: string;   // secondary text (axis labels)
  grid: string;      // grid lines
  zeroLine: string;  // axis zero / baseline
  border: string;    // axis line color
}

function read(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v ? `hsl(${v})` : fallback;
}

function readWithAlpha(name: string, alpha: number, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v ? `hsla(${v.split(' ').join(', ')}, ${alpha})` : fallback;
}

export function useChartTheme(): ChartTheme {
  const { isDarkMode } = useRisk();
  const [theme, setTheme] = useState<ChartTheme>(() => compute());

  function compute(): ChartTheme {
    return {
      fg: read('--foreground', '#e2e8f0'),
      mutedFg: read('--muted-foreground', '#94a3b8'),
      grid: readWithAlpha('--border', 0.4, 'rgba(148,163,184,0.2)'),
      zeroLine: readWithAlpha('--muted-foreground', 0.4, 'rgba(148,163,184,0.4)'),
      border: read('--border', '#334155'),
    };
  }

  useEffect(() => {
    // Recompute next tick so the .light class swap on <html> is applied first.
    const id = window.setTimeout(() => setTheme(compute()), 0);
    return () => window.clearTimeout(id);
  }, [isDarkMode]);

  return theme;
}
