import { AddExpense } from '@/components/spending/AddExpense';

export const SpendingAdd = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Add Expense</h1>
        <p className="text-muted-foreground mt-2">
          Record a new expense and categorize it for better tracking
        </p>
      </div>

      <div className="max-w-2xl">
        <AddExpense />
      </div>
    </div>
  );
};