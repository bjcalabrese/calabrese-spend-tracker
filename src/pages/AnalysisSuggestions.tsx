import { BudgetSuggestions } from '@/components/BudgetSuggestions';

export const AnalysisSuggestions = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Budget Suggestions</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered recommendations for better budget management
        </p>
      </div>

      <BudgetSuggestions />
    </div>
  );
};