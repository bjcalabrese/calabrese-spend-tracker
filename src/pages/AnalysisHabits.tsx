import { SpendingHabitsAnalysis } from '@/components/SpendingHabitsAnalysis';

export const AnalysisHabits = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Spending Habits Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Understand your spending patterns and behaviors
        </p>
      </div>

      <SpendingHabitsAnalysis />
    </div>
  );
};