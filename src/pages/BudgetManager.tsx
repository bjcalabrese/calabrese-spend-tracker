import { BudgetForm } from '@/components/BudgetForm';

export const BudgetManager = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Budget Manager</h1>
        <p className="text-muted-foreground mt-2">
          Set up and manage your monthly budgets
        </p>
      </div>

      <BudgetForm onBudgetAdded={() => {}} />
    </div>
  );
};