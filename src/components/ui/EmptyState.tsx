// Empty state component
import { Database, Upload, ArrowRight, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRisk } from '@/context/RiskContext';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  title?: string;
  description?: string;
  showLoadSample?: boolean;
}

export function EmptyState({
  title = 'No Data Loaded',
  description = 'Load a sample dataset, upload CSV, or enter data manually to get started.',
  showLoadSample = true,
}: EmptyStateProps) {
  const { loadSampleDataset } = useRisk();
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mb-6">
        <Database className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">{description}</p>
      
      {showLoadSample && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => loadSampleDataset('normal-baseline')}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Load Sample Dataset
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/data')}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => navigate('/data')}
            className="gap-2"
          >
            <PencilLine className="h-4 w-4" />
            Enter Manually
          </Button>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
