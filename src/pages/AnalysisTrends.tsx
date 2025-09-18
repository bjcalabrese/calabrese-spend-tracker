import { MonthlyTrends } from '@/components/MonthlyTrends';

export const AnalysisTrends = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Monthly Trends</h1>
        <p className="text-muted-foreground mt-2">
          Track your spending trends over time
        </p>
      </div>

      <MonthlyTrends />
    </div>
  );
};