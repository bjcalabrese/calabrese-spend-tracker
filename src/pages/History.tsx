import { HistoricalSpending } from '@/components/HistoricalSpending';

export const History = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Historical Data</h1>
        <p className="text-muted-foreground mt-2">
          View your spending history and year-over-year comparisons
        </p>
      </div>

      <HistoricalSpending />
    </div>
  );
};